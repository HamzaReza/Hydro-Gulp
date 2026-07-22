import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchLogsForRangeThunk } from '../store/slices/hydrationSlice';
import {
  advanceStreakCheckThunk,
  consumeStreakFreezesThunk,
} from '../store/slices/profileSlice';
import { getDateDaysAgo } from '../utils/dateUtils';
import {
  findFreezableGap,
  isRepairEligible,
  remainingFreezes,
} from '../utils/streakUtils';
import { usePremium } from './usePremium';

// ─── Auto-freeze toast (module-level so useAutoFreeze — mounted in the tab
// layout — can notify any screen using useStreakFreeze) ──────────────────────

type ToastListener = (message: string | null) => void;

let autoFreezeToast: string | null = null;
const toastListeners = new Set<ToastListener>();

const setAutoFreezeToast = (message: string | null) => {
  autoFreezeToast = message;
  toastListeners.forEach((listener) => listener(message));
};

// ─── useStreakFreeze ─────────────────────────────────────────────────────────

export const useStreakFreeze = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isPremium } = usePremium();
  const uid = useSelector((state: RootState) => state.auth.uid);
  const goal = useSelector((state: RootState) => state.profile.goal);
  const logs = useSelector((state: RootState) => state.hydration.logs);
  const streakFreezes = useSelector(
    (state: RootState) => state.profile.streakFreezes
  );

  const [toast, setToast] = useState<string | null>(autoFreezeToast);

  useEffect(() => {
    toastListeners.add(setToast);
    return () => {
      toastListeners.delete(setToast);
    };
  }, []);

  const remaining = remainingFreezes(streakFreezes);
  const frozenDates = streakFreezes?.frozenDates ?? [];

  const canRepairYesterday =
    isPremium &&
    remaining > 0 &&
    isRepairEligible(logs, goal, new Set(frozenDates));

  const repairYesterday = useCallback(async (): Promise<boolean> => {
    if (!uid) return false;
    const result = await dispatch(
      consumeStreakFreezesThunk({ uid, dates: [getDateDaysAgo(1)] })
    );
    return consumeStreakFreezesThunk.fulfilled.match(result);
  }, [uid, dispatch]);

  const clearAutoFreezeToast = useCallback(() => setAutoFreezeToast(null), []);

  return {
    remaining,
    frozenDates,
    canRepairYesterday,
    repairYesterday,
    autoFreezeToastMessage: toast,
    clearAutoFreezeToast,
  };
};

// ─── useAutoFreeze ───────────────────────────────────────────────────────────

/**
 * Mount once (tab layout). For Pro users, checks the window since the last
 * check (capped at 7 days back) up to the day before yesterday and silently
 * spends freezes on a broken streak when enough remain. Runs at most once per
 * foreground session.
 */
export const useAutoFreeze = () => {
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const { isPremium } = usePremium();
  const uid = useSelector((state: RootState) => state.auth.uid);
  const ranThisSession = useRef(false);

  const isPremiumRef = useRef(isPremium);
  isPremiumRef.current = isPremium;
  const uidRef = useRef(uid);
  uidRef.current = uid;

  const runCheck = useCallback(async () => {
    if (ranThisSession.current) return;
    const currentUid = uidRef.current;
    if (!currentUid || !isPremiumRef.current) return;
    ranThisSession.current = true;

    const streakFreezes = store.getState().profile.streakFreezes;
    const windowEnd = getDateDaysAgo(2);
    const sevenDaysAgo = getDateDaysAgo(7);
    const lastCheck = streakFreezes?.lastCheckDate;
    const windowStart =
      lastCheck && lastCheck > sevenDaysAgo ? lastCheck : sevenDaysAgo;
    if (windowStart > windowEnd) return;

    try {
      await dispatch(
        fetchLogsForRangeThunk({
          uid: currentUid,
          startDate: windowStart,
          endDate: windowEnd,
        })
      ).unwrap();
    } catch {
      // Couldn't load logs — retry next foreground session
      ranThisSession.current = false;
      return;
    }

    const state = store.getState();
    const sf = state.profile.streakFreezes;
    const frozenSet = new Set(sf?.frozenDates ?? []);
    const gap = findFreezableGap(
      state.hydration.logs,
      state.profile.goal,
      frozenSet,
      windowStart,
      windowEnd
    );
    const remaining = remainingFreezes(sf);

    if (gap.length > 0 && gap.length <= remaining) {
      const result = await dispatch(
        consumeStreakFreezesThunk({ uid: currentUid, dates: gap })
      );
      if (consumeStreakFreezesThunk.fulfilled.match(result)) {
        setAutoFreezeToast(
          gap.length === 1
            ? '❄️ A streak freeze saved your streak!'
            : `❄️ ${gap.length} streak freezes saved your streak!`
        );
      }
    } else {
      dispatch(advanceStreakCheckThunk({ uid: currentUid }));
    }
  }, [dispatch, store]);

  useEffect(() => {
    runCheck();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        runCheck();
      } else if (status === 'background') {
        // New foreground session — allow one more check
        ranThisSession.current = false;
      }
    });
    return () => subscription.remove();
  }, [runCheck]);

  // Re-attempt once auth/premium state hydrates after mount
  useEffect(() => {
    if (uid && isPremium && !ranThisSession.current) {
      runCheck();
    }
  }, [uid, isPremium, runCheck]);
};

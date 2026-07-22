import notifee from '@notifee/react-native';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { DEFAULT_QUICK_ADD_AMOUNTS } from '../constants/drinks';
import { drainNativePendingLogs } from '../services/hydroBridge';
import { handleNotificationEvent } from '../services/notificationEvents';
import { migrateFromExpoNotifications } from '../services/notifications';
import { drainPendingLogs } from '../services/pendingLogs';
import { scheduleOrCancelStreakRisk } from '../services/streakRisk';
import { AppDispatch, RootState } from '../store';
import {
  addLogThunk,
  optimisticAddLog,
  selectTodayTotal,
} from '../store/slices/hydrationSlice';
import { syncExternalSurfaces } from '../utils/externalSurfaces';

/**
 * Invisible lifecycle wiring for the notification layer. Mounted inside
 * PersistGate (app/_layout.tsx) so persisted state exists before it runs:
 * - one-time migration expo-notifications → notifee
 * - foreground notifee events (background events register in index.js)
 * - drains pending quick-logs (notification actions, widget, QS tile) into
 *   redux + Firestore whenever the app comes to the foreground
 * - keeps companion notification / widget / tile / streak-risk trigger in
 *   sync with in-app state changes
 */
export function NotificationGate() {
  const dispatch = useDispatch<AppDispatch>();
  const uid = useSelector((state: RootState) => state.auth.uid);
  const reminders = useSelector((state: RootState) => state.settings.reminders);
  const notificationsEnabled = useSelector(
    (state: RootState) => state.settings.notificationsEnabled,
  );
  const companionEnabled = useSelector(
    (state: RootState) => state.settings.companionEnabled ?? false,
  );
  const isPremium = useSelector(
    (state: RootState) => state.subscription.isPremium,
  );
  // Persisted profiles from before the presets feature lack this field.
  const presets = useSelector(
    (state: RootState) => state.profile.quickAddPresets ?? DEFAULT_QUICK_ADD_AMOUNTS,
  );
  const sleepTime = useSelector((state: RootState) => state.profile.sleepTime);
  const goal = useSelector((state: RootState) => state.profile.goal);
  const todayTotal = useSelector(selectTodayTotal);

  const draining = useRef(false);
  const migrated = useRef(false);

  const drainQueues = async () => {
    if (!uid || draining.current) return;
    draining.current = true;
    try {
      const entries = [
        ...(await drainPendingLogs()),
        ...(await drainNativePendingLogs()),
      ];
      for (const entry of entries) {
        dispatch(optimisticAddLog(entry));
        dispatch(
          addLogThunk({
            uid,
            logData: {
              amount: entry.amount,
              unit: entry.unit,
              type: entry.type,
              timestamp: entry.timestamp,
              date: entry.date,
              hydrationValue: entry.hydrationValue,
            },
          }),
        );
      }
    } finally {
      draining.current = false;
    }
  };

  // Mount: migration, foreground event listener, initial drain.
  useEffect(() => {
    if (!migrated.current) {
      migrated.current = true;
      migrateFromExpoNotifications(reminders, presets, notificationsEnabled);
    }
    const unsubscribe = notifee.onForegroundEvent(handleNotificationEvent);
    drainQueues();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        drainQueues();
      }
    });
    return () => {
      unsubscribe();
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // Any change to the numbers external surfaces display → resync them all.
  // Live values are passed explicitly: redux-persist writes lag the store,
  // so the snapshot alone would be one event behind.
  useEffect(() => {
    if (!uid) return;
    syncExternalSurfaces({
      totalMl: todayTotal,
      goalMl: goal,
      presets,
      companionOn: companionEnabled && isPremium,
    });
    scheduleOrCancelStreakRisk({ totalMl: todayTotal, goalMl: goal });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, todayTotal, goal, presets, companionEnabled, isPremium, sleepTime]);

  return null;
}

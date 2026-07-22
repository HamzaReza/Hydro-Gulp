import AsyncStorage from '@react-native-async-storage/async-storage';

import { getTodayString } from '../utils/dateUtils';
import { pendingTotalForDate } from './pendingLogs';

/**
 * Read-only view of the redux-persist state for headless contexts
 * (notification background events, widget task handler) where no live store
 * exists. NEVER write `persist:root` from here — redux-persist owns it.
 */
export interface StateSnapshot {
  uid: string | null;
  goalMl: number;
  unit: 'ml' | 'oz';
  /** Persisted logs total for today — excludes the pending queue. */
  persistedTodayMl: number;
  quickAddPresets: number[];
  companionEnabled: boolean;
  isPremium: boolean;
  sleepTime: string;
  frozenDates: string[];
  logsByDate: Record<string, { hydrationValue: number }[]>;
}

const DEFAULT_PRESETS = [100, 150, 250, 350, 500, 750, 1000];

export async function readStateSnapshot(): Promise<StateSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem('persist:root');
    if (!raw) return null;
    const root = JSON.parse(raw);
    const parse = (key: string) => {
      try {
        return root[key] ? JSON.parse(root[key]) : {};
      } catch {
        return {};
      }
    };
    const auth = parse('auth');
    const profile = parse('profile');
    const hydration = parse('hydration');
    const settings = parse('settings');
    const subscription = parse('subscription');

    const logsByDate = hydration.logs ?? {};
    const todayLogs: { hydrationValue: number }[] =
      logsByDate[getTodayString()] ?? [];
    const persistedTodayMl = todayLogs.reduce(
      (sum, l) => sum + (l.hydrationValue ?? 0),
      0,
    );

    const isPremium =
      subscription.isPremium === true &&
      (!subscription.expiryDate || Date.now() <= subscription.expiryDate);

    return {
      uid: auth.uid ?? null,
      goalMl: profile.goal ?? 2000,
      unit: profile.unit === 'oz' ? 'oz' : 'ml',
      persistedTodayMl,
      quickAddPresets:
        Array.isArray(profile.quickAddPresets) && profile.quickAddPresets.length
          ? profile.quickAddPresets
          : DEFAULT_PRESETS,
      companionEnabled: settings.companionEnabled === true,
      isPremium,
      sleepTime: profile.sleepTime ?? '23:00',
      frozenDates: Array.isArray(profile.streakFreezes?.frozenDates)
        ? profile.streakFreezes.frozenDates
        : [],
      logsByDate,
    };
  } catch {
    return null;
  }
}

/** Persisted + queued total for today — the number external surfaces show. */
export async function liveTodayTotalMl(
  snapshot?: StateSnapshot | null,
): Promise<number> {
  const snap = snapshot ?? (await readStateSnapshot());
  if (!snap) return 0;
  const pending = await pendingTotalForDate(getTodayString());
  return snap.persistedTodayMl + pending;
}

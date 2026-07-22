import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Queue of hydration logs created outside the running app (notification
 * action buttons, widget taps). The app drains it into redux + Firestore on
 * next foreground; entries use the same `temp-<timestamp>` id convention as
 * optimistic logs so `addLogThunk.fulfilled` swaps them in place.
 *
 * Kotlin surfaces (QS tile) use a separate SharedPreferences queue drained
 * through the hydro-bridge module — both are ingested at the same point.
 */
export interface PendingLog {
  id: string;
  amount: number;
  unit: 'ml' | 'oz';
  type: string;
  timestamp: number;
  date: string;
  hydrationValue: number;
}

const KEY = '@hydrogulp/pendingLogs';

async function readQueue(): Promise<PendingLog[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function appendPendingLog(entry: PendingLog): Promise<void> {
  const queue = await readQueue();
  queue.push(entry);
  await AsyncStorage.setItem(KEY, JSON.stringify(queue));
}

/** Read-and-clear. Whoever drains first owns the entries — no double-ingest. */
export async function drainPendingLogs(): Promise<PendingLog[]> {
  const queue = await readQueue();
  if (queue.length > 0) {
    await AsyncStorage.removeItem(KEY);
  }
  return queue;
}

/** Sum of queued hydration for `date` without draining (for live totals). */
export async function pendingTotalForDate(date: string): Promise<number> {
  const queue = await readQueue();
  return queue
    .filter((l) => l.date === date)
    .reduce((sum, l) => sum + l.hydrationValue, 0);
}

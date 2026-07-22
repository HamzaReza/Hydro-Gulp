import { requireOptionalNativeModule } from 'expo-modules-core';

import type { PendingLog } from './pendingLogs';

/**
 * JS face of the hydro-bridge local Expo module (QS tile support). Resolves
 * to no-ops when the native side isn't in the build (e.g. Expo Go), so every
 * caller can invoke it unconditionally.
 */
interface TileState {
  todayTotalMl: number;
  goalMl: number;
  defaultAmountMl: number;
  date: string;
}

const HydroBridge = requireOptionalNativeModule('HydroBridge');

export async function setTileState(state: TileState): Promise<void> {
  if (!HydroBridge) return;
  try {
    await HydroBridge.setTileState(state);
  } catch {
    // Native side unavailable — tile just stays stale until next sync.
  }
}

/** Read-and-clear the Kotlin-written queue (QS tile taps). */
export async function drainNativePendingLogs(): Promise<PendingLog[]> {
  if (!HydroBridge) return [];
  try {
    const raw: string = await HydroBridge.drainPendingLogs();
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e.amountMl === 'number' && e.amountMl > 0)
      .map((e) => ({
        id: `temp-${e.timestampMs}`,
        amount: e.amountMl,
        unit: 'ml' as const,
        type: e.type || 'water',
        timestamp: e.timestampMs,
        date: e.date,
        hydrationValue: e.hydrationValueMl ?? e.amountMl,
      }));
  } catch {
    return [];
  }
}

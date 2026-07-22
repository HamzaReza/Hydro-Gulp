import notifee, { TriggerType } from '@notifee/react-native';

import { Brand, streakRiskBody } from '../constants/branding';
import { computeCurrentStreak } from '../utils/streakUtils';
import { parseTimeString } from '../utils/notificationUtils';
import {
  KIND_STREAK_RISK,
  REMINDER_CHANNEL_ID,
  STREAK_RISK_TRIGGER_ID,
  ensureChannels,
  logActions,
} from './notifications';
import { liveTodayTotalMl, readStateSnapshot } from './stateSnapshot';

/**
 * Evening loss-aversion nudge: fires ~2h before sleepTime when a streak of
 * 3+ days would break tonight. One-shot trigger, re-evaluated after every
 * state change (logs, profile edits, foregrounds) — and cancelled the moment
 * the goal is met, so it can never fire spuriously.
 */
const LEAD_MS = 2 * 60 * 60 * 1000;
const MIN_STREAK = 3;

async function cancelStreakRisk(): Promise<void> {
  try {
    await notifee.cancelTriggerNotification(STREAK_RISK_TRIGGER_ID);
  } catch {
    // Not scheduled — fine.
  }
}

export async function scheduleOrCancelStreakRisk(live?: {
  totalMl: number;
  goalMl: number;
}): Promise<void> {
  const snapshot = await readStateSnapshot();
  if (!snapshot) return;

  const total = live?.totalMl ?? (await liveTodayTotalMl(snapshot));
  const goalMl = live?.goalMl ?? snapshot.goalMl;
  if (total >= goalMl) {
    await cancelStreakRisk();
    return;
  }

  // Snapshot logs are structurally narrower (only hydrationValue is read).
  const streak = computeCurrentStreak(
    snapshot.logsByDate as Parameters<typeof computeCurrentStreak>[0],
    goalMl,
    new Set(snapshot.frozenDates),
  );
  if (streak < MIN_STREAK) {
    await cancelStreakRisk();
    return;
  }

  const { hour, minute } = parseTimeString(snapshot.sleepTime || '23:00');
  const fireAt = new Date();
  fireAt.setHours(hour, minute, 0, 0);
  const timestamp = fireAt.getTime() - LEAD_MS;
  if (timestamp <= Date.now()) {
    // Window already passed today; tomorrow's evaluation reschedules it.
    await cancelStreakRisk();
    return;
  }

  await ensureChannels();
  const { data, actions } = logActions(snapshot.quickAddPresets);
  try {
    await notifee.createTriggerNotification(
      {
        id: STREAK_RISK_TRIGGER_ID,
        title: Brand.streakRiskTitle,
        body: streakRiskBody(streak),
        data: { kind: KIND_STREAK_RISK, ...data },
        android: {
          channelId: REMINDER_CHANNEL_ID,
          pressAction: { id: 'default', launchActivity: 'default' },
          actions,
        },
      },
      { type: TriggerType.TIMESTAMP, timestamp },
    );
  } catch (error) {
    console.error('Failed to schedule streak-risk notification:', error);
  }
}

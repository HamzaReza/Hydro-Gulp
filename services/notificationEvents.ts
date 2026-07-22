import notifee, { Event, EventType, TriggerType } from '@notifee/react-native';

import { Brand } from '../constants/branding';
import { getDrinkById } from '../constants/drinks';
import { formatDate } from '../utils/dateUtils';
import { refreshCompanionFromSnapshot } from './companionNotification';
import { appendPendingLog } from './pendingLogs';
import {
  KIND_SNOOZE,
  REMINDER_CHANNEL_ID,
  ensureChannels,
  suppressUpcomingReminders,
} from './notifications';
import { readStateSnapshot } from './stateSnapshot';
import { scheduleOrCancelStreakRisk } from './streakRisk';

/**
 * Shared handler for notifee foreground AND background (headless) events.
 * Runs with no redux store or React tree — persisted state is read-only via
 * stateSnapshot, and new logs go to the pending queue for the app to drain.
 */

const SNOOZE_MS = 30 * 60 * 1000;

async function queueQuickLog(amountMl: number): Promise<void> {
  const now = Date.now();
  const drink = getDrinkById('water');
  await appendPendingLog({
    id: `temp-${now}`,
    amount: amountMl,
    unit: 'ml',
    type: drink.id,
    timestamp: now,
    date: formatDate(new Date(now)),
    hydrationValue: Math.round(amountMl * drink.hydrationMultiplier),
  });

  // Keep external surfaces truthful right away, even with the app dead.
  await refreshCompanionFromSnapshot();

  // Goal met? The evening streak-risk nudge must not fire.
  await scheduleOrCancelStreakRisk();

  // Pro smart suppression: they just drank — skip reminders due within the hour.
  const snapshot = await readStateSnapshot();
  if (snapshot?.isPremium) {
    await suppressUpcomingReminders();
  }
}

async function snoozeNotification(event: Event): Promise<void> {
  const notification = event.detail.notification;
  if (!notification) return;
  await ensureChannels();
  await notifee.createTriggerNotification(
    {
      id: `snooze-${Date.now()}`,
      title: Brand.snoozeTitle,
      body: notification.body ?? Brand.reminderBodyFallback,
      data: { ...notification.data, kind: KIND_SNOOZE },
      android: {
        channelId: REMINDER_CHANNEL_ID,
        pressAction: { id: 'default', launchActivity: 'default' },
        actions: notification.android?.actions?.filter(
          (a) => a.pressAction.id !== 'snooze-30',
        ),
      },
    },
    { type: TriggerType.TIMESTAMP, timestamp: Date.now() + SNOOZE_MS },
  );
}

export async function handleNotificationEvent(event: Event): Promise<void> {
  const { type, detail } = event;

  if (type === EventType.ACTION_PRESS) {
    const pressId = detail.pressAction?.id;
    const data = detail.notification?.data ?? {};

    if (pressId === 'log-p0' || pressId === 'log-p1') {
      const key = pressId === 'log-p0' ? 'amount0' : 'amount1';
      const amount = Number(data[key]) || 250;
      await queueQuickLog(amount);
      // Action press doesn't auto-dismiss non-ongoing notifications.
      if (detail.notification?.id && data.kind !== 'companion') {
        await notifee.cancelDisplayedNotification(detail.notification.id);
      }
      return;
    }

    if (pressId === 'snooze-30') {
      await snoozeNotification(event);
      if (detail.notification?.id) {
        await notifee.cancelDisplayedNotification(detail.notification.id);
      }
      return;
    }
  }

  // A reminder was delivered — cheap moment to keep the companion current
  // (fresh totals after midnight without any polling).
  if (type === EventType.DELIVERED && detail.notification?.data?.kind === 'reminder') {
    await refreshCompanionFromSnapshot();
  }
}

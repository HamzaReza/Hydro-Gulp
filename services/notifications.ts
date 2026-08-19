import notifee, {
  AndroidImportance,
  AndroidNotificationSetting,
  AuthorizationStatus,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Brand } from '../constants/branding';
import type { Reminder } from '../store/slices/settingsSlice';
import { parseTimeString } from '../utils/notificationUtils';

/**
 * Notification layer on notifee. Trigger notifications use the reminder's own
 * id, so create/edit/delete all address the OS schedule deterministically —
 * no more persisted `notificationId` bookkeeping.
 */
export const REMINDER_CHANNEL_ID = 'reminders';
export const COMPANION_CHANNEL_ID = 'companion';
export const STREAK_RISK_TRIGGER_ID = 'streak-risk';

/** data.kind values so event handlers can tell notification types apart. */
export const KIND_REMINDER = 'reminder';
export const KIND_SNOOZE = 'snooze';
export const KIND_COMPANION = 'companion';
export const KIND_STREAK_RISK = 'streak-risk';

const MIGRATION_KEY = '@hydrogulp/notifee-migrated-v1';

export async function ensureChannels(): Promise<void> {
  await notifee.createChannel({
    id: REMINDER_CHANNEL_ID,
    name: 'Hydration reminders',
    importance: AndroidImportance.HIGH,
    vibration: true,
    vibrationPattern: [300, 250, 300, 250],
  });
  await notifee.createChannel({
    id: COMPANION_CHANNEL_ID,
    name: 'Hydration progress',
    importance: AndroidImportance.LOW,
    vibration: false,
    badge: false,
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  await ensureChannels();
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

/** Read-only permission check — never triggers the OS prompt. */
export async function notificationPermissionGranted(): Promise<boolean> {
  try {
    const settings = await notifee.getNotificationSettings();
    return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
  } catch {
    return false;
  }
}

/** Next occurrence of HH:MM as epoch ms (today if still ahead, else tomorrow). */
export function nextOccurrence(hour: number, minute: number): number {
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= Date.now()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
}

export async function exactAlarmsAllowed(): Promise<boolean> {
  try {
    const settings = await notifee.getNotificationSettings();
    return settings.android.alarm === AndroidNotificationSetting.ENABLED;
  } catch {
    return false;
  }
}

/** Deep-link to the system "Alarms & reminders" screen for this app. */
export async function openExactAlarmSettings(): Promise<void> {
  try {
    await notifee.openAlarmPermissionSettings();
  } catch {
    // Not available on this OS version — inexact triggers still work.
  }
}

/** Quick-log action buttons shared by reminders and the companion. */
export function logActions(presets?: number[]) {
  const p0 = presets?.[0] ?? 250;
  const p1 = presets?.[1] ?? 500;
  return {
    data: { amount0: String(p0), amount1: String(p1) },
    actions: [
      { title: `Log ${p0}ml`, pressAction: { id: 'log-p0' } },
      { title: `Log ${p1}ml`, pressAction: { id: 'log-p1' } },
    ],
  };
}

/** Create/replace the daily repeating trigger for a reminder. */
export async function scheduleReminder(
  reminder: Pick<Reminder, 'id' | 'time' | 'label'>,
  presets: number[],
): Promise<void> {
  await ensureChannels();
  const { hour, minute } = parseTimeString(reminder.time);
  const { data, actions } = logActions(presets);

  // With SCHEDULE_EXACT_ALARM granted → exact AlarmManager trigger.
  // Without it, notifee DROPS alarmManager triggers silently ("Missing
  // SCHEDULE_EXACT_ALARM permission"), so fall back to a WorkManager
  // trigger (inexact but reliable) by omitting alarmManager entirely.
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: nextOccurrence(hour, minute),
    repeatFrequency: RepeatFrequency.DAILY,
    ...((await exactAlarmsAllowed())
      ? { alarmManager: { allowWhileIdle: true } }
      : {}),
  };

  try {
    await notifee.createTriggerNotification(
      {
        id: reminder.id,
        title: Brand.reminderTitle,
        body: reminder.label || Brand.reminderBodyFallback,
        data: { kind: KIND_REMINDER, reminderId: reminder.id, ...data },
        android: {
          channelId: REMINDER_CHANNEL_ID,
          pressAction: { id: 'default', launchActivity: 'default' },
          actions: [
            ...actions,
            { title: 'Snooze 30m', pressAction: { id: 'snooze-30' } },
          ],
        },
      },
      trigger,
    );
  } catch (error) {
    console.error('Failed to schedule reminder trigger:', error);
  }
}

export async function cancelReminderTrigger(reminderId: string): Promise<void> {
  try {
    await notifee.cancelTriggerNotification(reminderId);
  } catch (error) {
    console.error('Failed to cancel reminder trigger:', error);
  }
}

async function reminderTriggerIds(): Promise<string[]> {
  const triggers = await notifee.getTriggerNotifications();
  return triggers
    .filter((t) => t.notification.data?.kind === KIND_REMINDER)
    .map((t) => t.notification.id!)
    .filter(Boolean);
}

export async function cancelAllReminderTriggers(): Promise<void> {
  try {
    const ids = await reminderTriggerIds();
    if (ids.length) await notifee.cancelTriggerNotifications(ids);
  } catch (error) {
    console.error('Failed to cancel reminder triggers:', error);
  }
}

/** Cancel everything and recreate triggers for the enabled reminders. */
export async function rescheduleAllReminders(
  reminders: Reminder[],
  presets: number[],
  notificationsEnabled: boolean,
): Promise<void> {
  await cancelAllReminderTriggers();
  if (!notificationsEnabled) return;
  for (const reminder of reminders) {
    if (reminder.enabled) {
      await scheduleReminder(reminder, presets);
    }
  }
}

/**
 * Pro smart suppression: push any reminder due within `windowMs` to its
 * tomorrow occurrence — the user just logged; don't nag them again in an hour.
 */
export async function suppressUpcomingReminders(
  windowMs: number = 60 * 60 * 1000,
): Promise<void> {
  try {
    const now = Date.now();
    const triggers = await notifee.getTriggerNotifications();
    for (const t of triggers) {
      if (t.notification.data?.kind !== KIND_REMINDER) continue;
      const trigger = t.trigger as TimestampTrigger;
      if (trigger.type !== TriggerType.TIMESTAMP) continue;
      if (trigger.timestamp > now && trigger.timestamp <= now + windowMs) {
        // Same id → replaces the pending trigger; daily repeat continues from tomorrow.
        await notifee.createTriggerNotification(t.notification, {
          ...trigger,
          timestamp: trigger.timestamp + 24 * 60 * 60 * 1000,
        });
      }
    }
  } catch (error) {
    console.error('Failed to suppress upcoming reminders:', error);
  }
}

/**
 * One-time migration off expo-notifications: drop every legacy OS schedule,
 * recreate enabled reminders as notifee triggers. Reminder data (redux +
 * Firestore) is the source of truth, so nothing user-visible is lost.
 */
export async function migrateFromExpoNotifications(
  reminders: Reminder[],
  presets: number[],
  notificationsEnabled: boolean,
): Promise<void> {
  try {
    if (await AsyncStorage.getItem(MIGRATION_KEY)) return;
    const ExpoNotifications = await import('expo-notifications');
    await ExpoNotifications.cancelAllScheduledNotificationsAsync().catch(
      () => {},
    );
    await rescheduleAllReminders(reminders, presets, notificationsEnabled);
    await AsyncStorage.setItem(MIGRATION_KEY, '1');
  } catch (error) {
    console.error('Notification migration failed:', error);
  }
}

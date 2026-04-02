import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

import { Brand } from '../constants/branding';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
};

export const scheduleReminder = async (
  id: string,
  hour: number,
  minute: number,
  label: string
): Promise<string | null> => {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: Brand.reminderTitle,
        body: label || "Time to hydrate! Don't forget your water.",
        data: { reminderId: id },
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    return notificationId;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
};

export const cancelReminder = async (notificationId: string): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Failed to cancel notification:', error);
  }
};

export const cancelAllReminders = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Failed to cancel all notifications:', error);
  }
};

export const getScheduledNotifications = async () => {
  return Notifications.getAllScheduledNotificationsAsync();
};

export const parseTimeString = (timeString: string): { hour: number; minute: number } => {
  const [hourStr, minuteStr] = timeString.split(':');
  return {
    hour: parseInt(hourStr, 10),
    minute: parseInt(minuteStr, 10),
  };
};

/** On-the-hour times from first full hour at/after wake through last full hour before sleep. */
export const generateSmartReminderTimes = (
  wakeTime: string,
  sleepTime: string
): string[] => {
  const wake = parseTimeString(wakeTime);
  const sleep = parseTimeString(sleepTime);

  const wakeMinutes = wake.hour * 60 + wake.minute;
  let sleepMinutes = sleep.hour * 60 + sleep.minute;

  if (sleepMinutes <= wakeMinutes) {
    sleepMinutes += 24 * 60;
  }

  let first = wakeMinutes;
  if (first % 60 !== 0) {
    first = first - (first % 60) + 60;
  }

  const last = Math.floor((sleepMinutes - 1) / 60) * 60;

  if (last < first) {
    return [];
  }

  const day = 24 * 60;
  const times: string[] = [];
  for (let t = first; t <= last; t += 60) {
    const m = t % day;
    const hour = Math.floor(m / 60);
    const minute = m % 60;
    times.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  }

  return times;
};

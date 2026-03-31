import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { Brand } from '../constants/branding';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
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
        hour,
        minute,
        repeats: true,
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

export const generateSmartReminderTimes = (
  wakeTime: string,
  sleepTime: string,
  count: number
): string[] => {
  const wake = parseTimeString(wakeTime);
  const sleep = parseTimeString(sleepTime);

  const wakeMinutes = wake.hour * 60 + wake.minute;
  let sleepMinutes = sleep.hour * 60 + sleep.minute;

  if (sleepMinutes <= wakeMinutes) {
    sleepMinutes += 24 * 60;
  }

  const interval = (sleepMinutes - wakeMinutes) / (count + 1);
  const times: string[] = [];

  for (let i = 1; i <= count; i++) {
    const totalMinutes = (wakeMinutes + interval * i) % (24 * 60);
    const hour = Math.floor(totalMinutes / 60);
    const minute = Math.floor(totalMinutes % 60);
    times.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  }

  return times;
};

/**
 * Pure time helpers for reminders. The notification layer itself lives in
 * services/notifications.ts (notifee) — this module must stay free of native
 * imports so background/headless contexts can use it safely.
 */
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

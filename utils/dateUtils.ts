export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayString = (): string => {
  return formatDate(new Date());
};

export const getDateDaysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDate(date);
};

export const getLast7Days = (): string[] => {
  return Array.from({ length: 7 }, (_, i) => getDateDaysAgo(6 - i));
};

export const getLast31Days = (): string[] => {
  return Array.from({ length: 31 }, (_, i) => getDateDaysAgo(30 - i));
};

export const getGreeting = (name: string): string => {
  const hour = new Date().getHours();
  if (hour < 12) return `Good Morning, ${name} 👋`;
  if (hour < 18) return `Good Afternoon, ${name} 👋`;
  return `Good Evening, ${name} 👋`;
};

export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes} ${period}`;
};

export const formatDisplayDate = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (formatDate(today) === dateString) return 'Today';
  if (formatDate(yesterday) === dateString) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

export const getDayLabel = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);
};

export const getMonthLabel = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const mlToOz = (ml: number): number => {
  return Math.round(ml * 0.033814 * 10) / 10;
};

export const ozToMl = (oz: number): number => {
  return Math.round(oz * 29.5735);
};

export const formatAmount = (ml: number, unit: 'ml' | 'oz'): string => {
  if (unit === 'oz') {
    return `${mlToOz(ml)} oz`;
  }
  return `${ml} ml`;
};

export const getTimeOfDay = (timestamp: number): 'morning' | 'afternoon' | 'evening' | 'night' => {
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

export const getDatesInMonth = (year: number, month: number): string[] => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, '0');
    const m = String(month + 1).padStart(2, '0');
    return `${year}-${m}-${day}`;
  });
};

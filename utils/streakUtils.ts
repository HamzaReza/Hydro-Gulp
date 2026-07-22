import { formatDate, getDateDaysAgo } from './dateUtils';

/**
 * Pure streak-freeze helpers — no React or Firebase imports so they can be
 * unit-tested and reused from slices, hooks, services and demo seeding alike.
 */

/** Minimal structural shape — HydrationLog[] maps are assignable to this. */
export type LogsByDate = Record<string, { hydrationValue: number }[]>;

export interface StreakFreezes {
  /** Month the allowance applies to, e.g. "2026-07" */
  monthKey: string;
  /** Freezes consumed during monthKey */
  used: number;
  /** Dates ("YYYY-MM-DD") protected by a freeze */
  frozenDates: string[];
  /** Last date ("YYYY-MM-DD") the auto-freeze check ran up to */
  lastCheckDate: string;
}

export const FREEZES_PER_MONTH = 2;

export const getMonthKey = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

/** Freezes still available this month. A month rollover restores the full allowance. */
export const remainingFreezes = (sf: StreakFreezes | null): number => {
  if (!sf || sf.monthKey !== getMonthKey()) return FREEZES_PER_MONTH;
  return Math.max(0, FREEZES_PER_MONTH - sf.used);
};

/** Total hydration value logged on a given date. */
export const dayTotal = (
  logs: LogsByDate,
  date: string
): number => {
  return (logs[date] || []).reduce((sum, log) => sum + log.hydrationValue, 0);
};

const isMetOrFrozen = (
  logs: LogsByDate,
  goal: number,
  frozenSet: Set<string>,
  date: string
): boolean => {
  return frozenSet.has(date) || dayTotal(logs, date) >= goal;
};

const previousDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return formatDate(d);
};

/**
 * Current streak, walking back up to 365 days from today.
 * Mirrors the original useStreak semantics: an unmet today is skipped (not
 * broken) so the streak carries over from yesterday; a frozen date counts as
 * continuing the streak.
 */
export const computeCurrentStreak = (
  logs: LogsByDate,
  goal: number,
  frozenSet: Set<string>
): number => {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const date = getDateDaysAgo(i);
    const met = dayTotal(logs, date) >= goal;
    const frozen = frozenSet.has(date);
    if (i === 0 && !met && !frozen) {
      // Goal not yet met today — check yesterday instead of breaking
      continue;
    }
    if (met || frozen) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
};

/**
 * Finds the most recent gap of consecutive missed (and not yet frozen) days
 * within [windowStart, windowEnd], walking backwards from windowEnd.
 * The gap only qualifies if the day immediately before it was met-or-frozen —
 * i.e. there is actually a streak worth protecting behind it.
 */
export const findFreezableGap = (
  logs: LogsByDate,
  goal: number,
  frozenSet: Set<string>,
  windowStart: string,
  windowEnd: string
): string[] => {
  if (windowStart > windowEnd) return [];

  let cursor = windowEnd;

  // Skip trailing met-or-frozen days to find the start of a gap
  while (cursor >= windowStart && isMetOrFrozen(logs, goal, frozenSet, cursor)) {
    cursor = previousDate(cursor);
  }
  if (cursor < windowStart) return [];

  // Collect the consecutive missed, unfrozen days
  const gap: string[] = [];
  while (cursor >= windowStart && !isMetOrFrozen(logs, goal, frozenSet, cursor)) {
    gap.push(cursor);
    cursor = previousDate(cursor);
  }

  if (gap.length === 0) return [];

  // The day immediately before the gap must be met-or-frozen, otherwise
  // there is no streak behind the gap to save.
  if (!isMetOrFrozen(logs, goal, frozenSet, cursor)) return [];

  return gap;
};

/**
 * Yesterday was missed (and not already frozen) while the day before it was
 * met-or-frozen — a single freeze repairs the streak.
 */
export const isRepairEligible = (
  logs: LogsByDate,
  goal: number,
  frozenSet: Set<string>
): boolean => {
  const yesterday = getDateDaysAgo(1);
  const dayBefore = getDateDaysAgo(2);
  const yesterdayMissed =
    !frozenSet.has(yesterday) && dayTotal(logs, yesterday) < goal;
  return yesterdayMissed && isMetOrFrozen(logs, goal, frozenSet, dayBefore);
};

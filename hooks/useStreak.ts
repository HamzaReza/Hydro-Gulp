import { useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { getDateDaysAgo } from '../utils/dateUtils';
import { computeCurrentStreak, dayTotal } from '../utils/streakUtils';

const selectStreakData = createSelector(
  [
    (state: RootState) => state.hydration.logs,
    (state: RootState) => state.profile.goal,
    (state: RootState) => state.profile.streakFreezes,
  ],
  (logs, goal, streakFreezes) => {
    const frozenSet = new Set(streakFreezes?.frozenDates ?? []);

    // Current streak: today is skipped (not broken) if the goal isn't met yet;
    // frozen dates count as continuing the streak.
    const currentStreak = computeCurrentStreak(logs, goal, frozenSet);

    // Longest streak: forward walk over the last 365 days; a frozen date keeps
    // a run alive. Perfect days count only genuinely-met days (frozen excluded).
    let longestStreak = 0;
    let run = 0;
    let perfectDays = 0;
    for (let i = 364; i >= 0; i--) {
      const date = getDateDaysAgo(i);
      const metGoal = dayTotal(logs, date) >= goal;
      if (metGoal) perfectDays++;
      if (metGoal || frozenSet.has(date)) {
        run++;
        if (run > longestStreak) longestStreak = run;
      } else {
        run = 0;
      }
    }

    return {
      currentStreak,
      longestStreak,
      perfectDays,
    };
  }
);

export const useStreak = () => {
  return useSelector(selectStreakData);
};

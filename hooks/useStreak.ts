import { useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { HydrationLog } from '../store/slices/hydrationSlice';
import { getTodayString, getDateDaysAgo } from '../utils/dateUtils';

const selectStreakData = createSelector(
  [(state: RootState) => state.hydration.logs, (state: RootState) => state.profile.goal],
  (logs, goal) => {
    const today = getTodayString();
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let perfectDays = 0;

    // Check up to 365 days back
    for (let i = 0; i < 365; i++) {
      const date = getDateDaysAgo(i);
      const dayLogs: HydrationLog[] = logs[date] || [];
      const total = dayLogs.reduce((sum, log) => sum + log.hydrationValue, 0);
      const metGoal = total >= goal;

      if (metGoal) {
        tempStreak++;
        perfectDays++;
        if (i === 0 || i === 1) {
          // Current streak counts today or yesterday
          if (i === 0 && currentStreak === 0) currentStreak = tempStreak;
        }
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        if (i === 0) {
          // Haven't met goal today yet — streak continues from yesterday
          currentStreak = 0;
        } else if (currentStreak === 0 && tempStreak > 0) {
          currentStreak = tempStreak;
        }
        tempStreak = 0;
      }
    }

    // If currentStreak is still 0 check if it was set from a break
    if (currentStreak === 0 && tempStreak > 0) currentStreak = tempStreak;

    // Re-calculate streak more carefully
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const date = getDateDaysAgo(i);
      const dayLogs: HydrationLog[] = logs[date] || [];
      const total = dayLogs.reduce((sum, log) => sum + log.hydrationValue, 0);
      const metGoal = total >= goal;

      if (i === 0 && !metGoal) {
        // Skip today if goal not yet met — check yesterday
        continue;
      }
      if (metGoal) {
        streak++;
      } else {
        break;
      }
    }

    let longest = 0;
    let current = 0;
    let perfect = 0;
    for (let i = 364; i >= 0; i--) {
      const date = getDateDaysAgo(i);
      const dayLogs: HydrationLog[] = logs[date] || [];
      const total = dayLogs.reduce((sum, log) => sum + log.hydrationValue, 0);
      if (total >= goal) {
        current++;
        perfect++;
        if (current > longest) longest = current;
      } else {
        current = 0;
      }
    }

    return {
      currentStreak: streak,
      longestStreak: longest,
      perfectDays: perfect,
    };
  }
);

export const useStreak = () => {
  return useSelector(selectStreakData);
};

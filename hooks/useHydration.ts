import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { RootState, AppDispatch } from '../store';
import {
  selectTodayLogs,
  selectTodayTotal,
  selectWeeklyData,
  optimisticAddLog,
  optimisticDeleteLog,
  addLogThunk,
  deleteLogThunk,
  HydrationLog,
} from '../store/slices/hydrationSlice';
import { getDrinkById } from '../constants/drinks';
import { getTodayString } from '../utils/dateUtils';

export const useHydration = () => {
  const dispatch = useDispatch<AppDispatch>();
  const uid = useSelector((state: RootState) => state.auth.uid);
  const allLogsByDate = useSelector((state: RootState) => state.hydration.logs);
  const todayLogs = useSelector(selectTodayLogs);
  const todayTotal = useSelector(selectTodayTotal);
  const weeklyData = useSelector(selectWeeklyData);
  const goal = useSelector((state: RootState) => state.profile.goal);
  const unit = useSelector((state: RootState) => state.profile.unit);
  const syncError = useSelector((state: RootState) => state.hydration.syncError);

  const rawTotal = useMemo(
    () => todayLogs.reduce((sum: number, log: HydrationLog) => sum + log.amount, 0),
    [todayLogs]
  );
  const progressPercent = goal > 0 ? (todayTotal / goal) * 100 : 0;

  const addLog = useCallback(
    (amount: number, type: string = 'water') => {
      if (!uid) return;
      const today = getTodayString();
      const tempId = `temp-${Date.now()}`;
      const hydrationValue = Math.round(
        amount * getDrinkById(type).hydrationMultiplier,
      );
      const log: HydrationLog = {
        id: tempId,
        amount,
        unit,
        type,
        timestamp: Date.now(),
        date: today,
        hydrationValue,
      };

      dispatch(optimisticAddLog(log));
      dispatch(addLogThunk({ uid, logData: log }));
    },
    [dispatch, uid, unit]
  );

  const deleteLog = useCallback(
    (logId: string, date: string) => {
      if (!uid) return;
      const logsForDate = allLogsByDate[date] || [];
      const originalLog = logsForDate.find((l) => l.id === logId);
      if (!originalLog) return;
      dispatch(optimisticDeleteLog({ logId, date }));
      dispatch(deleteLogThunk({ uid, logId, date, originalLog }));
    },
    [dispatch, uid, allLogsByDate]
  );

  return {
    todayLogs,
    todayTotal,
    rawTotal,
    weeklyData,
    goal,
    unit,
    progressPercent,
    syncError,
    addLog,
    deleteLog,
  };
};

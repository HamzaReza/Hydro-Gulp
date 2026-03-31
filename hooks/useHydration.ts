import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
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
import { getTodayString } from '../utils/dateUtils';

export const useHydration = () => {
  const dispatch = useDispatch<AppDispatch>();
  const uid = useSelector((state: RootState) => state.auth.uid);
  const todayLogs = useSelector(selectTodayLogs);
  const todayTotal = useSelector(selectTodayTotal);
  const weeklyData = useSelector(selectWeeklyData);
  const goal = useSelector((state: RootState) => state.profile.goal);
  const unit = useSelector((state: RootState) => state.profile.unit);
  const syncError = useSelector((state: RootState) => state.hydration.syncError);

  const progressPercent = goal > 0 ? (todayTotal / goal) * 100 : 0;

  const addLog = useCallback(
    (amount: number, type: string = 'water') => {
      if (!uid) return;
      const today = getTodayString();
      const tempId = `temp-${Date.now()}`;
      const log: HydrationLog = {
        id: tempId,
        amount,
        unit,
        type,
        timestamp: Date.now(),
        date: today,
        hydrationValue: amount,
      };

      dispatch(optimisticAddLog(log));
      dispatch(addLogThunk({ uid, logData: log }));
    },
    [dispatch, uid, unit]
  );

  const deleteLog = useCallback(
    (logId: string, date: string) => {
      if (!uid) return;
      dispatch(optimisticDeleteLog({ logId, date }));
      dispatch(deleteLogThunk({ uid, logId, date }));
    },
    [dispatch, uid]
  );

  return {
    todayLogs,
    todayTotal,
    weeklyData,
    goal,
    unit,
    progressPercent,
    syncError,
    addLog,
    deleteLog,
  };
};

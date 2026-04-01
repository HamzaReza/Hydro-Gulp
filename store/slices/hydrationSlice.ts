import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { logoutThunk, deleteAccountThunk } from './authSlice';
import { getTodayString, getLast7Days, getLast31Days } from '../../utils/dateUtils';
import { getDrinkById } from '../../constants/drinks';

export interface HydrationLog {
  id: string;
  amount: number;
  unit: 'ml' | 'oz';
  type: string;
  timestamp: number;
  date: string;
  hydrationValue: number;
}

interface HydrationState {
  logs: Record<string, HydrationLog[]>;
  goal: number;
  unit: 'ml' | 'oz';
  loading: boolean;
  error: string | null;
  syncError: string | null;
}

const initialState: HydrationState = {
  logs: {},
  goal: 2000,
  unit: 'ml',
  loading: false,
  error: null,
  syncError: null,
};

export const fetchLogsForRangeThunk = createAsyncThunk(
  'hydration/fetchLogsForRange',
  async (
    { uid, startDate, endDate }: { uid: string; startDate: string; endDate: string },
    { rejectWithValue }
  ) => {
    try {
      const logsRef = collection(db, 'users', uid, 'logs');
      const q = query(
        logsRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      const snapshot = await getDocs(q);
      const logsByDate: Record<string, HydrationLog[]> = {};
      snapshot.docs.forEach((d) => {
        const data = d.data();
        const log: HydrationLog = {
          id: d.id,
          amount: data.amount,
          unit: data.unit,
          type: data.type,
          timestamp:
            data.timestamp instanceof Timestamp
              ? data.timestamp.toMillis()
              : Date.now(),
          date: data.date,
          hydrationValue: data.hydrationValue || data.amount,
        };
        if (!logsByDate[log.date]) logsByDate[log.date] = [];
        logsByDate[log.date].push(log);
      });
      return logsByDate;
    } catch (error: any) {
      return rejectWithValue('Failed to fetch history.');
    }
  }
);

export const addLogThunk = createAsyncThunk(
  'hydration/addLog',
  async (
    { uid, logData }: { uid: string; logData: Omit<HydrationLog, 'id'> },
    { rejectWithValue }
  ) => {
    try {
      const drinkType = getDrinkById(logData.type);
      const hydrationValue = Math.round(logData.amount * drinkType.hydrationMultiplier);

      const docRef = await addDoc(collection(db, 'users', uid, 'logs'), {
        amount: logData.amount,
        unit: logData.unit,
        type: logData.type,
        timestamp: serverTimestamp(),
        date: logData.date,
        hydrationValue,
      });

      return {
        ...logData,
        id: docRef.id,
        hydrationValue,
      };
    } catch (error: any) {
      return rejectWithValue(logData);
    }
  }
);

export const deleteLogThunk = createAsyncThunk(
  'hydration/deleteLog',
  async (
    { uid, logId, date, originalLog }: { uid: string; logId: string; date: string; originalLog: HydrationLog },
    { rejectWithValue }
  ) => {
    try {
      await deleteDoc(doc(db, 'users', uid, 'logs', logId));
      return { logId, date };
    } catch (error: any) {
      return rejectWithValue({ logId, date, error: 'Failed to delete log.' });
    }
  }
);

const hydrationSlice = createSlice({
  name: 'hydration',
  initialState,
  reducers: {
    setGoal: (state, action: PayloadAction<number>) => {
      state.goal = action.payload;
    },
    setUnit: (state, action: PayloadAction<'ml' | 'oz'>) => {
      state.unit = action.payload;
    },
    optimisticAddLog: (state, action: PayloadAction<HydrationLog>) => {
      const log = action.payload;
      if (!state.logs[log.date]) {
        state.logs[log.date] = [];
      }
      state.logs[log.date] = [log, ...state.logs[log.date]];
    },
    optimisticDeleteLog: (state, action: PayloadAction<{ logId: string; date: string }>) => {
      const { logId, date } = action.payload;
      if (state.logs[date]) {
        state.logs[date] = state.logs[date].filter((l) => l.id !== logId);
      }
    },
    rollbackAddLog: (state, action: PayloadAction<{ tempId: string; date: string }>) => {
      const { tempId, date } = action.payload;
      if (state.logs[date]) {
        state.logs[date] = state.logs[date].filter((l) => l.id !== tempId);
      }
    },
    rollbackDeleteLog: (state, action: PayloadAction<HydrationLog>) => {
      const log = action.payload;
      if (!state.logs[log.date]) {
        state.logs[log.date] = [];
      }
      state.logs[log.date] = [...state.logs[log.date], log].sort(
        (a, b) => b.timestamp - a.timestamp
      );
    },
    clearSyncError: (state) => {
      state.syncError = null;
    },
    clearHydrationData: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLogsForRangeThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLogsForRangeThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = { ...state.logs, ...action.payload };
      })
      .addCase(fetchLogsForRangeThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(addLogThunk.fulfilled, (state, action) => {
        const log = action.payload;
        if (state.logs[log.date]) {
          const idx = state.logs[log.date].findIndex((l) => l.id === 'temp-' + log.timestamp);
          if (idx !== -1) {
            state.logs[log.date][idx] = log;
          }
        }
      })
      .addCase(addLogThunk.rejected, (state, action) => {
        // Roll back the optimistic log entry that was added with a temp id
        const logData = action.payload as Omit<HydrationLog, 'id'>;
        if (logData?.date && logData?.timestamp) {
          const tempId = `temp-${logData.timestamp}`;
          if (state.logs[logData.date]) {
            state.logs[logData.date] = state.logs[logData.date].filter((l) => l.id !== tempId);
          }
        }
        state.syncError = 'Failed to save log. Please check your connection.';
      })
      .addCase(deleteLogThunk.rejected, (state, action) => {
        // Restore the optimistically deleted log
        const { originalLog } = action.meta.arg;
        if (originalLog) {
          if (!state.logs[originalLog.date]) {
            state.logs[originalLog.date] = [];
          }
          const already = state.logs[originalLog.date].some((l) => l.id === originalLog.id);
          if (!already) {
            state.logs[originalLog.date] = [...state.logs[originalLog.date], originalLog].sort(
              (a, b) => b.timestamp - a.timestamp
            );
          }
        }
        state.syncError = 'Failed to delete log. Please check your connection.';
      })
      .addCase(logoutThunk.fulfilled, () => initialState)
      .addCase(deleteAccountThunk.fulfilled, () => initialState);
  },
});

export const {
  setGoal,
  setUnit,
  optimisticAddLog,
  optimisticDeleteLog,
  rollbackAddLog,
  rollbackDeleteLog,
  clearSyncError,
  clearHydrationData,
} = hydrationSlice.actions;

export default hydrationSlice.reducer;

// Selectors
export const selectTodayLogs = createSelector(
  [(state: any) => state.hydration.logs],
  (logs) => {
    const today = getTodayString();
    return (logs[today] || []).slice().sort((a: HydrationLog, b: HydrationLog) => b.timestamp - a.timestamp);
  }
);

export const selectTodayTotal = createSelector(
  [(state: any) => state.hydration.logs],
  (logs) => {
    const today = getTodayString();
    return (logs[today] || []).reduce((sum: number, log: HydrationLog) => sum + log.hydrationValue, 0);
  }
);

export const selectWeeklyData = createSelector(
  [(state: any) => state.hydration.logs],
  (logs) => {
    return getLast7Days().map((date) => ({
      date,
      total: (logs[date] || []).reduce((sum: number, log: HydrationLog) => sum + log.hydrationValue, 0),
    }));
  }
);

export const selectMonthlyData = createSelector(
  [(state: any) => state.hydration.logs],
  (logs) => {
    return getLast31Days().map((date) => ({
      date,
      total: (logs[date] || []).reduce((sum: number, log: HydrationLog) => sum + log.hydrationValue, 0),
    }));
  }
);

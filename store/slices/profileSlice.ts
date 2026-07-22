import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import { logoutThunk, deleteAccountThunk } from './authSlice';
import { DEFAULT_QUICK_ADD_AMOUNTS } from '../../constants/drinks';
import { DEMO_MODE } from '../../constants/demoMode';
import { getTodayString } from '../../utils/dateUtils';
import {
  FREEZES_PER_MONTH,
  getMonthKey,
  StreakFreezes,
} from '../../utils/streakUtils';

interface ProfileState {
  name: string;
  avatarColor: string;
  goal: number;
  unit: 'ml' | 'oz';
  wakeTime: string;
  sleepTime: string;
  quickAddPresets: number[];
  streakFreezes: StreakFreezes | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  name: '',
  avatarColor: '#7AAACE',
  goal: 2000,
  unit: 'ml',
  wakeTime: '07:00',
  sleepTime: '23:00',
  quickAddPresets: DEFAULT_QUICK_ADD_AMOUNTS,
  streakFreezes: null,
  loading: false,
  error: null,
};

export const fetchProfileThunk = createAsyncThunk(
  'profile/fetch',
  async (uid: string, { rejectWithValue }) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const data = snap.data();
        return {
          name: data.name || '',
          avatarColor: data.avatarColor || '#7AAACE',
          goal: data.goal || 2000,
          unit: data.unit || 'ml',
          wakeTime: data.wakeTime || '07:00',
          sleepTime: data.sleepTime || '23:00',
          // Legacy docs predate custom presets / streak freezes
          quickAddPresets: (data.quickAddPresets ||
            DEFAULT_QUICK_ADD_AMOUNTS) as number[],
          streakFreezes: (data.streakFreezes ?? null) as StreakFreezes | null,
        };
      }
      return rejectWithValue('Profile not found.');
    } catch (error: any) {
      return rejectWithValue('Failed to fetch profile.');
    }
  }
);

export const updateProfileThunk = createAsyncThunk(
  'profile/update',
  async (
    {
      uid,
      data,
    }: {
      uid: string;
      data: Partial<{
        name: string;
        avatarColor: string;
        goal: number;
        unit: 'ml' | 'oz';
        wakeTime: string;
        sleepTime: string;
        quickAddPresets: number[];
      }>;
    },
    { rejectWithValue }
  ) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      return data;
    } catch (error: any) {
      return rejectWithValue('Failed to update profile.');
    }
  }
);

/**
 * Computes the next streakFreezes doc after consuming freezes for `dates`.
 * Handles month rollover (fresh allowance) and is idempotent for dates that
 * are already frozen. Returns 'insufficient' when the allowance is exceeded.
 */
const applyFreezeConsumption = (
  existing: StreakFreezes | null,
  dates: string[]
): StreakFreezes | 'insufficient' => {
  const monthKey = getMonthKey();
  const used = existing && existing.monthKey === monthKey ? existing.used : 0;
  const frozenDates = existing?.frozenDates ?? [];
  const newDates = dates.filter((d) => !frozenDates.includes(d));
  const remaining = Math.max(0, FREEZES_PER_MONTH - used);
  if (newDates.length > remaining) return 'insufficient';
  // Cap stored frozen dates to the newest 365 so the doc can't grow unbounded
  const merged = [...frozenDates, ...newDates].sort().slice(-365);
  return {
    monthKey,
    used: used + newDates.length,
    frozenDates: merged,
    lastCheckDate: getTodayString(),
  };
};

export const consumeStreakFreezesThunk = createAsyncThunk(
  'profile/consumeStreakFreezes',
  async (
    { uid, dates }: { uid: string; dates: string[] },
    { getState, rejectWithValue }
  ) => {
    // Demo mode: resolve locally — never touch Firestore
    if (DEMO_MODE) {
      const existing = (getState() as { profile: ProfileState }).profile
        .streakFreezes;
      const next = applyFreezeConsumption(existing, dates);
      if (next === 'insufficient') return rejectWithValue('insufficient');
      return next;
    }

    try {
      const next = await runTransaction(db, async (tx) => {
        const snap = await tx.get(doc(db, 'users', uid));
        const existing = (
          snap.exists() ? (snap.data().streakFreezes ?? null) : null
        ) as StreakFreezes | null;
        const result = applyFreezeConsumption(existing, dates);
        if (result === 'insufficient') return 'insufficient' as const;
        tx.set(doc(db, 'users', uid), { streakFreezes: result }, { merge: true });
        return result;
      });
      if (next === 'insufficient') return rejectWithValue('insufficient');
      return next;
    } catch (error: any) {
      return rejectWithValue('Failed to use streak freeze.');
    }
  }
);

/** Advances lastCheckDate to today when the auto-freeze check consumed nothing. */
export const advanceStreakCheckThunk = createAsyncThunk(
  'profile/advanceStreakCheck',
  async ({ uid }: { uid: string }, { getState, rejectWithValue }) => {
    const existing = (getState() as { profile: ProfileState }).profile
      .streakFreezes;
    const monthKey = getMonthKey();
    const next: StreakFreezes =
      existing && existing.monthKey === monthKey
        ? { ...existing, lastCheckDate: getTodayString() }
        : {
            monthKey,
            used: 0,
            frozenDates: existing?.frozenDates ?? [],
            lastCheckDate: getTodayString(),
          };

    // Demo mode: resolve locally — never touch Firestore
    if (DEMO_MODE) return next;

    try {
      await setDoc(doc(db, 'users', uid), { streakFreezes: next }, { merge: true });
      return next;
    } catch (error: any) {
      return rejectWithValue('Failed to update streak check.');
    }
  }
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<Partial<ProfileState>>) => {
      return { ...state, ...action.payload };
    },
    clearProfile: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfileThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfileThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.name = action.payload.name;
        state.avatarColor = action.payload.avatarColor;
        state.goal = action.payload.goal;
        state.unit = action.payload.unit as 'ml' | 'oz';
        state.wakeTime = action.payload.wakeTime;
        state.sleepTime = action.payload.sleepTime;
        state.quickAddPresets = action.payload.quickAddPresets;
        state.streakFreezes = action.payload.streakFreezes;
      })
      .addCase(fetchProfileThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        const data = action.payload;
        if (data.name !== undefined) state.name = data.name;
        if (data.avatarColor !== undefined) state.avatarColor = data.avatarColor;
        if (data.goal !== undefined) state.goal = data.goal;
        if (data.unit !== undefined) state.unit = data.unit;
        if (data.wakeTime !== undefined) state.wakeTime = data.wakeTime;
        if (data.sleepTime !== undefined) state.sleepTime = data.sleepTime;
        if (data.quickAddPresets !== undefined)
          state.quickAddPresets = data.quickAddPresets;
      })
      .addCase(updateProfileThunk.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(consumeStreakFreezesThunk.fulfilled, (state, action) => {
        state.streakFreezes = action.payload;
      })
      .addCase(advanceStreakCheckThunk.fulfilled, (state, action) => {
        state.streakFreezes = action.payload;
      })
      .addCase(logoutThunk.fulfilled, () => initialState)
      .addCase(deleteAccountThunk.fulfilled, () => initialState);
  },
});

export const { setProfile, clearProfile } = profileSlice.actions;
export default profileSlice.reducer;

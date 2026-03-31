import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

interface ProfileState {
  name: string;
  avatarColor: string;
  goal: number;
  unit: 'ml' | 'oz';
  wakeTime: string;
  sleepTime: string;
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
      })
      .addCase(updateProfileThunk.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { setProfile, clearProfile } = profileSlice.actions;
export default profileSlice.reducer;

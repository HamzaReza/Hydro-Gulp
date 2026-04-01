import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { logoutThunk, deleteAccountThunk } from './authSlice';

export interface Reminder {
  id: string;
  time: string;
  enabled: boolean;
  label: string;
  smartReminder: boolean;
  notificationId?: string;
}

interface SettingsState {
  theme: "light" | "dark";
  notificationsEnabled: boolean;
  reminders: Reminder[];
}

export const fetchRemindersThunk = createAsyncThunk(
  'settings/fetchReminders',
  async (uid: string, { rejectWithValue }) => {
    try {
      const remindersRef = collection(db, 'users', uid, 'reminders');
      const snapshot = await getDocs(remindersRef);
      const reminders: Reminder[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          time: data.time,
          enabled: data.enabled ?? true,
          label: data.label || 'Time to hydrate!',
          smartReminder: data.smartReminder ?? false,
          notificationId: data.notificationId,
        };
      });
      return reminders;
    } catch (error: any) {
      return rejectWithValue('Failed to fetch reminders.');
    }
  }
);

const initialState: SettingsState = {
  theme: "light",
  notificationsEnabled: false,
  reminders: [],
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<"light" | "dark">) => {
      state.theme = action.payload;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === "light" ? "dark" : "light";
    },
    setNotificationsEnabled: (state, action: PayloadAction<boolean>) => {
      state.notificationsEnabled = action.payload;
    },
    setReminders: (state, action: PayloadAction<Reminder[]>) => {
      state.reminders = action.payload;
    },
    addReminder: (state, action: PayloadAction<Reminder>) => {
      state.reminders.push(action.payload);
    },
    updateReminder: (state, action: PayloadAction<Reminder>) => {
      const idx = state.reminders.findIndex((r) => r.id === action.payload.id);
      if (idx !== -1) {
        state.reminders[idx] = action.payload;
      }
    },
    deleteReminder: (state, action: PayloadAction<string>) => {
      state.reminders = state.reminders.filter((r) => r.id !== action.payload);
    },
    toggleReminder: (state, action: PayloadAction<string>) => {
      const reminder = state.reminders.find((r) => r.id === action.payload);
      if (reminder) {
        reminder.enabled = !reminder.enabled;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRemindersThunk.fulfilled, (state, action) => {
        // Merge: keep local reminders that aren't in Firestore yet, override with server data
        state.reminders = action.payload;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.reminders = [];
      })
      .addCase(deleteAccountThunk.fulfilled, (state) => {
        state.reminders = [];
      });
  },
});

export const {
  setTheme,
  toggleTheme,
  setNotificationsEnabled,
  setReminders,
  addReminder,
  updateReminder,
  deleteReminder,
  toggleReminder,
} = settingsSlice.actions;

export default settingsSlice.reducer;

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Reminder {
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

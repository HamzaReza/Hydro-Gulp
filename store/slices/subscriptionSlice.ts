import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { logoutThunk, deleteAccountThunk } from './authSlice';

interface SubscriptionState {
  isPremium: boolean;
  plan: 'monthly' | 'yearly' | null;
  expiryDate: number | null;
}

const initialState: SubscriptionState = {
  isPremium: false,
  plan: null,
  expiryDate: null,
};

// Premium state in Firestore is written exclusively by the RevenueCat
// webhook (functions/src/index.ts). The client only reads it via the
// realtime users/{uid} listener in app/_layout.tsx, which dispatches
// setSubscription below.

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    setSubscription: (
      state,
      action: PayloadAction<{
        isPremium: boolean;
        plan: 'monthly' | 'yearly' | null;
        expiryDate: number | null;
      }>
    ) => {
      state.isPremium = action.payload.isPremium;
      state.plan = action.payload.plan;
      state.expiryDate = action.payload.expiryDate;
    },
    clearSubscription: (state) => {
      state.isPremium = false;
      state.plan = null;
      state.expiryDate = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(logoutThunk.fulfilled, () => initialState)
      .addCase(deleteAccountThunk.fulfilled, () => initialState);
  },
});

export const { setSubscription, clearSubscription } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;

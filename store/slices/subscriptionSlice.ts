import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { logoutThunk, deleteAccountThunk } from './authSlice';
import {
  getCustomerInfo,
  extractSubscriptionStatus,
} from '../../services/revenuecat';

interface SubscriptionState {
  isPremium: boolean;
  plan: 'monthly' | 'yearly' | null;
  expiryDate: number | null;
  loading: boolean;
  error: string | null;
}

const initialState: SubscriptionState = {
  isPremium: false,
  plan: null,
  expiryDate: null,
  loading: false,
  error: null,
};

/**
 * Fetch the latest entitlement status from RevenueCat and sync it to both
 * Redux and Firestore. Called on login and whenever the app foregrounds.
 */
export const syncRevenueCatStatusThunk = createAsyncThunk(
  'subscription/syncRevenueCat',
  async (uid: string, { rejectWithValue }) => {
    try {
      const customerInfo = await getCustomerInfo();
      const status = extractSubscriptionStatus(customerInfo);

      await updateDoc(doc(db, 'users', uid), {
        isPremium: status.isPremium,
        premiumPlan: status.plan,
        premiumExpiry: status.expiryDate
          ? Timestamp.fromMillis(status.expiryDate)
          : null,
      });

      return status;
    } catch {
      return rejectWithValue('Failed to sync subscription status.');
    }
  }
);

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
      .addCase(syncRevenueCatStatusThunk.fulfilled, (state, action) => {
        state.isPremium = action.payload.isPremium;
        state.plan = action.payload.plan;
        state.expiryDate = action.payload.expiryDate;
      })
      .addCase(logoutThunk.fulfilled, () => initialState)
      .addCase(deleteAccountThunk.fulfilled, () => initialState);
  },
});

export const { setSubscription, clearSubscription } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;

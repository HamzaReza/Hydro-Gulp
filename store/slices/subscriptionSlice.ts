import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';

interface SubscriptionState {
  isPremium: boolean;
  plan: 'monthly' | 'yearly' | null;
  expiryDate: number | null;
  trialUsed: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: SubscriptionState = {
  isPremium: false,
  plan: null,
  expiryDate: null,
  trialUsed: false,
  loading: false,
  error: null,
};

export const updateSubscriptionThunk = createAsyncThunk(
  'subscription/update',
  async (
    {
      uid,
      plan,
    }: {
      uid: string;
      plan: 'monthly' | 'yearly';
    },
    { rejectWithValue }
  ) => {
    try {
      const now = new Date();
      const expiry =
        plan === 'monthly'
          ? new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
          : new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

      await updateDoc(doc(db, 'users', uid), {
        isPremium: true,
        premiumPlan: plan,
        premiumExpiry: Timestamp.fromDate(expiry),
      });

      return {
        isPremium: true,
        plan,
        expiryDate: expiry.getTime(),
      };
    } catch (error: any) {
      return rejectWithValue('Failed to activate subscription. Please try again.');
    }
  }
);

export const cancelSubscriptionThunk = createAsyncThunk(
  'subscription/cancel',
  async (uid: string, { rejectWithValue }) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        isPremium: false,
        premiumPlan: null,
        premiumExpiry: null,
      });
    } catch (error: any) {
      return rejectWithValue('Failed to cancel subscription.');
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
    setTrialUsed: (state, action: PayloadAction<boolean>) => {
      state.trialUsed = action.payload;
    },
    clearSubscription: (state) => {
      state.isPremium = false;
      state.plan = null;
      state.expiryDate = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(updateSubscriptionThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSubscriptionThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.isPremium = action.payload.isPremium;
        state.plan = action.payload.plan;
        state.expiryDate = action.payload.expiryDate;
        state.trialUsed = true;
      })
      .addCase(updateSubscriptionThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(cancelSubscriptionThunk.fulfilled, (state) => {
        state.isPremium = false;
        state.plan = null;
        state.expiryDate = null;
      });
  },
});

export const { setSubscription, setTrialUsed, clearSubscription } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;

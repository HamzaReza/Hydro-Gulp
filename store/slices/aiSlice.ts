import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { fetchHydrationInsight } from "../../services/openRouter";
import { getTodayString } from "../../utils/dateUtils";

export interface AIInsight {
  quote: string;
  suggestion: string;
}

interface AIState {
  quote: string | null;
  suggestion: string | null;
  /** YYYY-MM-DD of the last successful fetch — skip re-fetch on same day */
  fetchedDate: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AIState = {
  quote: null,
  suggestion: null,
  fetchedDate: null,
  loading: false,
  error: null,
};

export interface AIInsightInput {
  todayTotal: number;
  goal: number;
  avg7: number;
  hydrationScore: number;
  unit: "ml" | "oz";
  force?: boolean;
}

export const fetchAIInsightThunk = createAsyncThunk<
  AIInsight,
  AIInsightInput,
  { state: any }
>(
  "ai/fetchInsight",
  async (input, { getState, rejectWithValue }) => {
    const { force = false, ...data } = input;
    const today = getTodayString();

    if (!force) {
      const existing = getState().ai as AIState;
      if (existing.fetchedDate === today && existing.quote) {
        return { quote: existing.quote, suggestion: existing.suggestion! };
      }
    }

    try {
      return await fetchHydrationInsight(data);
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed to fetch AI insight.");
    }
  },
);

const aiSlice = createSlice({
  name: "ai",
  initialState,
  reducers: {
    clearAIError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAIInsightThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAIInsightThunk.fulfilled, (state, action: PayloadAction<AIInsight>) => {
        state.loading = false;
        state.quote = action.payload.quote;
        state.suggestion = action.payload.suggestion;
        state.fetchedDate = getTodayString();
      })
      .addCase(fetchAIInsightThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearAIError } = aiSlice.actions;
export default aiSlice.reducer;

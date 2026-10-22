import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { getDashboard } from "@/services/health.service";
import { ApiError } from "@/api/client";
import { loadDashboard } from "@/utils/dashboardCache";
import type { Dashboard } from "@/types/health";

type Status = "idle" | "loading" | "succeeded" | "failed";

interface DashboardState {
  data: Dashboard | null;
  status: Status;
  errorMessage: string;
  isOffline: boolean;
  savedAt: string | null;
  activeRequestId: string | null;
}

const initialState: DashboardState = {
  data: null,
  status: "idle",
  errorMessage: "",
  isOffline: false,
  savedAt: null,
  activeRequestId: null,
};
type FetchResult = { data: Dashboard; fromCache: false } | { data: Dashboard; fromCache: true; savedAt: string };

export const fetchDashboard = createAsyncThunk<FetchResult, void, { rejectValue: string }>(
  "dashboard/fetch",
  async (_, { rejectWithValue }) => {
    try {
      return { data: await getDashboard(), fromCache: false };
    } catch (error) {
      // A 401 is a session boundary, never an excuse to show another user's cached health data.
      if (error instanceof ApiError && (error.status === 401 || error.code === "STALE_REQUEST"))
        return rejectWithValue(error.message);
      const cached = loadDashboard();
      if (cached) return { data: cached.data, fromCache: true, savedAt: cached.savedAt };
      return rejectWithValue(error instanceof ApiError ? error.message : "Couldn't load your health data.");
    }
  },
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    dashboardUpdated: (state, action: PayloadAction<Dashboard>) => {
      state.data = action.payload;
      state.status = "succeeded";
      state.isOffline = false;
      state.savedAt = null;
    },
    dashboardCleared: () => initialState,
  },
  extraReducers: builder => {
    builder
      .addCase(fetchDashboard.pending, (state, action) => {
        state.status = "loading";
        state.errorMessage = "";
        state.activeRequestId = action.meta.requestId;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        if (state.activeRequestId !== action.meta.requestId) return;
        state.status = "succeeded";
        state.data = action.payload.data;
        state.isOffline = action.payload.fromCache;
        state.savedAt = action.payload.fromCache ? action.payload.savedAt : null;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        if (state.activeRequestId !== action.meta.requestId) return;
        state.status = "failed";
        state.errorMessage = action.payload || "Couldn't load your health data.";
      });
  },
});

export const { dashboardUpdated, dashboardCleared } = dashboardSlice.actions;
export default dashboardSlice.reducer;

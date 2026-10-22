import { configureStore, createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import dashboardReducer, { dashboardUpdated, fetchDashboard } from "@/modules/dashboard/dashboardSlice";
import assistantReducer from "@/modules/assistant/assistantSlice";
import { saveDashboard } from "@/utils/dashboardCache";

const listener = createListenerMiddleware();
listener.startListening({
  matcher: isAnyOf(fetchDashboard.fulfilled, dashboardUpdated),
  effect: (action, api) => {
    if (dashboardUpdated.match(action)) return saveDashboard(action.payload);
    // A late response after logout/reset must not repopulate browser storage.
    if (
      fetchDashboard.fulfilled.match(action) &&
      !action.payload.fromCache &&
      (api.getState() as { dashboard: { activeRequestId: string | null } }).dashboard.activeRequestId ===
        action.meta.requestId
    ) {
      saveDashboard(action.payload.data);
    }
  },
});

export const store = configureStore({
  reducer: { dashboard: dashboardReducer, assistant: assistantReducer },
  middleware: getDefaultMiddleware => getDefaultMiddleware().prepend(listener.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

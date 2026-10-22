import type { Dashboard } from "@/types/health";

// Last dashboard that loaded successfully, so the app still shows something when the API is down.
// Bump the version when the Dashboard shape changes, so old copies are ignored instead of breaking the UI.
const KEY = "hearty:dashboard:v1";

export interface CachedDashboard {
  savedAt: string;
  data: Dashboard;
}

export const saveDashboard = (data: Dashboard) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ savedAt: new Date().toISOString(), data }));
  } catch {
    // storage full or blocked (private mode): the cache is optional, so ignore
  }
};

export const loadDashboard = (): CachedDashboard | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedDashboard;
    return cached?.data?.persona && Array.isArray(cached.data.daily) ? cached : null;
  } catch {
    return null;
  }
};

export const clearDashboardCache = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
};

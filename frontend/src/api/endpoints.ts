export const API_BASE_URL = `${import.meta.env?.VITE_API_URL || ""}/api`;

export const ENDPOINTS = {
  health: {
    dashboard: "/health/dashboard",
    entries: "/health/entries",
    import: "/health/import",
    profile: "/health/profile",
  },
  chat: "/chat",
  conversations: "/conversations",
};

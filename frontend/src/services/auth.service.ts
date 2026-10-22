import { request } from "@/api/client";

export interface SessionUser {
  id: string;
  username: string;
  name: string;
}

interface AuthResponse {
  user: SessionUser;
}

export const getCurrentUser = () => request<AuthResponse>("/auth/me", { skipUnauthorizedEvent: true });

export const login = (username: string, password: string) =>
  request<AuthResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    skipUnauthorizedEvent: true,
  });

export const logout = () => request<{ ok: boolean }>("/auth/logout", { method: "POST" });

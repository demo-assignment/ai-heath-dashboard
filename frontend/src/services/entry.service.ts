import { request } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import type { Dashboard, DailyRecord, Goals, Persona } from "@/types/health";

export interface SkippedRow {
  row: number;
  date: string;
  reason: string;
}

export const addEntry = (entry: Partial<DailyRecord> & { date: string }) => {
  return request<{ saved: string; updated: boolean; dashboard: Dashboard }>(ENDPOINTS.health.entries, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
};

export const importSpreadsheet = (file: File) => {
  const body = new FormData();
  body.append("file", file);
  return request<{ imported: string[]; skipped: SkippedRow[]; dashboard: Dashboard }>(ENDPOINTS.health.import, {
    method: "POST",
    body,
  });
};

export interface PreviewRow {
  row: number;
  date: string | null;
  values: Record<string, number | string | null>;
  status: "new" | "skipped" | "error";
  message?: string;
}

export interface ImportPreview {
  ok: boolean;
  message?: string;
  rows: PreviewRow[];
  newDays: number;
  skipped: number;
}

// Checks the file on the server without saving anything.
export const previewSpreadsheet = (file: File) => {
  const body = new FormData();
  body.append("file", file);
  return request<ImportPreview>(`${ENDPOINTS.health.import}/preview`, { method: "POST", body });
};

export const resetEntries = () => {
  return request<{ dashboard: Dashboard }>(ENDPOINTS.health.entries, { method: "DELETE" });
};

export interface ProfileUpdate {
  persona: Pick<Persona, "name" | "age" | "sex" | "heightCm" | "occupation" | "dietPreference">;
  goals: Pick<
    Goals,
    "dailySteps" | "weeklyActiveMinutes" | "sleepHours" | "dailyProteinG" | "dailyWaterL" | "targetWeightKg"
  >;
}

export const updateProfile = (profile: ProfileUpdate) => {
  return request<{ dashboard: Dashboard }>(ENDPOINTS.health.profile, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
};

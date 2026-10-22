import type { DailyRecord } from "@/types/health";

export type MetricKey = Exclude<keyof DailyRecord, "date">;

// Same limits as the backend (utils/validateEntry.ts). The server checks again, this is only for a nicer form.
export const ENTRY_FIELDS: { key: MetricKey; label: string; unit: string; min: number; max: number; step: number }[] = [
  { key: "steps", label: "Steps", unit: "steps", min: 0, max: 100000, step: 1 },
  { key: "activeMinutes", label: "Active minutes", unit: "min", min: 0, max: 1440, step: 1 },
  { key: "sleepHours", label: "Sleep", unit: "hours", min: 0, max: 24, step: 0.1 },
  { key: "restingHeartRate", label: "Resting heart rate", unit: "bpm", min: 25, max: 220, step: 1 },
  { key: "caloriesIn", label: "Calories eaten", unit: "kcal", min: 0, max: 10000, step: 1 },
  { key: "proteinG", label: "Protein", unit: "g", min: 0, max: 500, step: 1 },
  { key: "waterL", label: "Water", unit: "L", min: 0, max: 15, step: 0.1 },
  { key: "weightKg", label: "Weight", unit: "kg", min: 20, max: 400, step: 0.1 },
];

export const IMPORT_COLUMNS = [
  "date",
  "steps",
  "active_minutes",
  "sleep_hours",
  "resting_heart_rate",
  "calories_in",
  "protein_g",
  "water_l",
  "weight_kg",
];

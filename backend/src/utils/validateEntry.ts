import { isRealDate } from "./date.js";
import type { DailyRecord } from "../types/health.js";

type MetricKey = Exclude<keyof DailyRecord, "date">;

interface FieldRule {
  key: MetricKey;
  label: string;
  min: number;
  max: number;
  // whole numbers only (steps, minutes...); otherwise rounded to 1 decimal
  integer: boolean;
}

// One source of truth for both the form and the Excel import.
export const ENTRY_FIELDS: FieldRule[] = [
  { key: "steps", label: "Steps", min: 0, max: 100_000, integer: true },
  { key: "activeMinutes", label: "Active minutes", min: 0, max: 1440, integer: true },
  { key: "sleepHours", label: "Sleep hours", min: 0, max: 24, integer: false },
  { key: "restingHeartRate", label: "Resting heart rate", min: 25, max: 220, integer: true },
  { key: "caloriesIn", label: "Calories", min: 0, max: 10_000, integer: true },
  { key: "proteinG", label: "Protein (g)", min: 0, max: 500, integer: true },
  { key: "waterL", label: "Water (L)", min: 0, max: 15, integer: false },
  { key: "weightKg", label: "Weight (kg)", min: 20, max: 400, integer: false },
];

export interface FieldError {
  field: string;
  message: string;
}

type EntryResult = { ok: true; record: DailyRecord } | { ok: false; errors: FieldError[] };

// Checks types and ranges. Date rules that depend on the existing data (past, future) are checked separately.
export const validateEntry = (raw: Record<string, unknown>): EntryResult => {
  const errors: FieldError[] = [];
  const date = raw.date;

  if (typeof date !== "string" || !isRealDate(date)) {
    errors.push({ field: "date", message: "Date must be a real date in YYYY-MM-DD format." });
  }

  const record = { date } as DailyRecord;
  let filled = 0;

  for (const rule of ENTRY_FIELDS) {
    const value = raw[rule.key];
    if (value === null || value === undefined || value === "") {
      record[rule.key] = null;
      continue;
    }
    if (typeof value !== "number" || !Number.isFinite(value)) {
      errors.push({ field: rule.key, message: `${rule.label} must be a number.` });
      continue;
    }
    if (rule.integer && !Number.isInteger(value)) {
      errors.push({ field: rule.key, message: `${rule.label} must be a whole number.` });
      continue;
    }
    if (value < rule.min || value > rule.max) {
      errors.push({ field: rule.key, message: `${rule.label} must be between ${rule.min} and ${rule.max}.` });
      continue;
    }
    record[rule.key] = rule.integer ? value : Math.round(value * 10) / 10;
    filled += 1;
  }

  if (!errors.length && !filled) errors.push({ field: "steps", message: "Add at least one value for this day." });

  return errors.length ? { ok: false, errors } : { ok: true, record };
};

export type DateCheck = "ok" | "past" | "future";

// Days up to the last device sync are final, so manual data can only add newer days, and not future ones.
export const checkEntryDate = (date: string, window: { from: string; to: string }): DateCheck => {
  if (date < window.from) return "past";
  if (date > window.to) return "future";
  return "ok";
};

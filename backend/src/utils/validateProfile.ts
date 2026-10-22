import type { Goals, Persona } from "../types/health.js";

// What the user can change. Dates and the start weight are tied to the recorded data, so they stay fixed.
export type PersonaUpdate = Pick<Persona, "name" | "age" | "sex" | "heightCm" | "occupation" | "dietPreference">;
export type GoalsUpdate = Pick<
  Goals,
  "dailySteps" | "weeklyActiveMinutes" | "sleepHours" | "dailyProteinG" | "dailyWaterL" | "targetWeightKg"
>;

export interface ProfileUpdate {
  persona: PersonaUpdate;
  goals: GoalsUpdate;
}

export interface FieldError {
  field: string;
  message: string;
}

export const SEX_OPTIONS = ["female", "male", "other"];

const TEXT_FIELDS: { key: keyof PersonaUpdate; label: string; max: number; required: boolean }[] = [
  { key: "name", label: "Name", max: 50, required: true },
  { key: "occupation", label: "Occupation", max: 60, required: false },
  { key: "dietPreference", label: "Diet", max: 40, required: false },
];

const NUMBER_FIELDS: {
  group: "persona" | "goals";
  key: string;
  label: string;
  min: number;
  max: number;
  integer: boolean;
}[] = [
  { group: "persona", key: "age", label: "Age", min: 13, max: 110, integer: true },
  { group: "persona", key: "heightCm", label: "Height", min: 100, max: 250, integer: true },
  { group: "goals", key: "dailySteps", label: "Step goal", min: 1000, max: 50000, integer: true },
  { group: "goals", key: "weeklyActiveMinutes", label: "Active minutes goal", min: 30, max: 2000, integer: true },
  { group: "goals", key: "sleepHours", label: "Sleep goal", min: 4, max: 12, integer: false },
  { group: "goals", key: "dailyProteinG", label: "Protein goal", min: 20, max: 300, integer: true },
  { group: "goals", key: "dailyWaterL", label: "Water goal", min: 0.5, max: 6, integer: false },
  { group: "goals", key: "targetWeightKg", label: "Target weight", min: 30, max: 250, integer: false },
];

type Result = { ok: true; profile: ProfileUpdate } | { ok: false; errors: FieldError[] };

// Names and free text end up in the AI prompt, so keep them short and on one line.
const cleanText = (value: string) =>
  value
    .replace(/[\r\n<>]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const validateProfile = (body: unknown): Result => {
  const raw = (body ?? {}) as { persona?: Record<string, unknown>; goals?: Record<string, unknown> };
  const persona = raw.persona ?? {};
  const goals = raw.goals ?? {};
  const errors: FieldError[] = [];
  const out = { persona: {} as Record<string, unknown>, goals: {} as Record<string, unknown> };

  for (const field of TEXT_FIELDS) {
    const value = persona[field.key];
    const text = typeof value === "string" ? cleanText(value) : "";
    if (value !== undefined && typeof value !== "string")
      errors.push({ field: field.key, message: `${field.label} must be text.` });
    else if (field.required && !text) errors.push({ field: field.key, message: `${field.label} is required.` });
    else if (text.length > field.max)
      errors.push({ field: field.key, message: `${field.label} must be at most ${field.max} characters.` });
    else out.persona[field.key] = text;
  }

  if (!SEX_OPTIONS.includes(persona.sex as string))
    errors.push({ field: "sex", message: "Choose female, male or other." });
  else out.persona.sex = persona.sex;

  for (const field of NUMBER_FIELDS) {
    const value = (field.group === "persona" ? persona : goals)[field.key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      errors.push({ field: field.key, message: `${field.label} must be a number.` });
    } else if (field.integer && !Number.isInteger(value)) {
      errors.push({ field: field.key, message: `${field.label} must be a whole number.` });
    } else if (value < field.min || value > field.max) {
      errors.push({ field: field.key, message: `${field.label} must be between ${field.min} and ${field.max}.` });
    } else {
      out[field.group][field.key] = field.integer ? value : Math.round(value * 10) / 10;
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true, profile: out as unknown as ProfileUpdate };
};

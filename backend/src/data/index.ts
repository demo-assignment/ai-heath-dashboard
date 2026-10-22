import { getSampleData } from "./sampleData.js";
import { getEntryStore } from "./entryStore.js";
import { addDays } from "../utils/date.js";
import type { DailyRecord, HealthData } from "../types/health.js";

export { getSampleData };

const emptyDay = (date: string): DailyRecord => ({
  date,
  steps: null,
  activeMinutes: null,
  sleepHours: null,
  restingHeartRate: null,
  caloriesIn: null,
  proteinG: null,
  waterL: null,
  weightKg: null,
});

// Device data + manual entries, as one continuous list of days.
// Gaps between the last synced day and a new entry become empty days, so weeks stay aligned and
// missing data is shown as missing (not zero).
export const getHealthData = async (): Promise<HealthData> => {
  const base = getSampleData();
  const store = getEntryStore(base.persona.id);
  const profile = await store.getProfile();
  // The edited profile replaces the fictional persona's name, details and goals.
  const sample: HealthData = profile
    ? { ...base, persona: { ...base.persona, ...profile.persona }, goals: { ...base.goals, ...profile.goals } }
    : base;
  const lastSynced = sample.daily[sample.daily.length - 1].date;
  const entries = await store.getAll();
  const isProfileEdited = !!profile;
  if (!entries.length) return { ...sample, manualDates: [], lastSyncedDate: lastSynced, isProfileEdited };

  const byDate = new Map(entries.map(entry => [entry.date, entry]));
  const lastEntry = entries
    .map(entry => entry.date)
    .sort()
    .pop()!;

  const extraDays: DailyRecord[] = [];
  for (let date = addDays(lastSynced, 1); date <= lastEntry; date = addDays(date, 1)) {
    extraDays.push(byDate.get(date) || emptyDay(date));
  }

  return {
    ...sample,
    asOf: lastEntry > sample.asOf ? lastEntry : sample.asOf,
    daily: [...sample.daily, ...extraDays],
    manualDates: entries.map(entry => entry.date).sort(),
    lastSyncedDate: lastSynced,
    isProfileEdited,
  };
};

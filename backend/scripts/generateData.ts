/**
 * Generates the fictional sample data in src/data/health-data.json.
 *
 * The data is random but seeded, so running it again gives the same file.
 * It is shaped on purpose so the dashboard and the assistant have a story to tell:
 * - steps improve over 8 weeks, then drop in the last week (a work deadline)
 * - sleep stays under the 7.5 h goal, worse on weekdays and in the deadline week
 * - resting heart rate goes down slowly, weight goes down about 0.3 kg a week
 * - two days have no data at all (device not synced), stored as null, not 0
 *
 * Run from the backend folder:  npm run seed
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { DailyRecord, HealthData, Workout } from "../src/types/health.js";

const OUT = fileURLToPath(new URL("../src/data/health-data.json", import.meta.url));

// Small seeded random generator (mulberry32), so the output never changes between runs.
const createRandom = (seed: number) => {
  let state = seed;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    between: (min: number, max: number) => min + next() * (max - min),
    int: (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
  };
};

const random = createRandom(26);
const round = (value: number, digits = 0) => Math.round(value * 10 ** digits) / 10 ** digits;

const START = "2026-08-24"; // a Monday
const DAYS = 56;
const MISSING = ["2026-09-12", "2026-10-03"];
const DEADLINE_WEEK = 7; // 0-based: the 8th week

const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const daily: DailyRecord[] = [];
const workouts: Workout[] = [];

for (let i = 0; i < DAYS; i++) {
  const date = addDays(START, i);
  const weekday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7; // 0 = Monday
  const week = Math.floor(i / 7);
  const isWeekend = weekday >= 5;
  const isDeadline = week === DEADLINE_WEEK;

  if (MISSING.includes(date)) {
    daily.push({
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
    continue;
  }

  let steps = 5000 + week * 470 + (isWeekend ? 2600 : 0) + random.int(-900, 900);
  if (isDeadline && !isWeekend) steps -= 1300;

  let sleep = (isWeekend ? 7.3 : 6.2) + random.between(-0.45, 0.45);
  if (isDeadline) sleep -= isWeekend ? 0.2 : 0.7;

  // weigh-in every Monday
  const weightKg = weekday === 0 ? round(week === 7 ? 62.6 : 64.8 - week * 0.3 + random.between(-0.12, 0.12), 1) : null;

  daily.push({
    date,
    steps,
    activeMinutes: Math.max(5, Math.floor((steps - 3500) / 140 + random.int(-6, 6))),
    sleepHours: round(sleep, 1),
    restingHeartRate: Math.round(72 - week * 0.8 + random.between(-1.4, 1.4) + (isDeadline ? 1.5 : 0)),
    caloriesIn: 1850 + random.int(-180, 220) + (isWeekend ? 180 : 0),
    proteinG: Math.floor(64 + week * 0.9 + random.int(-9, 10)),
    waterL: round(1.35 + week * 0.03 + random.between(-0.25, 0.3), 1),
    weightKg,
  });

  if (weekday === 1) workouts.push({ date, type: "Yoga", durationMin: 50, distanceKm: null, caloriesBurned: 170 });
  if (weekday === 3 && week >= 3) {
    workouts.push({
      date,
      type: "Strength training",
      durationMin: 35 + week * 2,
      distanceKm: null,
      caloriesBurned: 190 + week * 8,
    });
  }
  if (weekday === 5) {
    const km = round(3 + week * 0.35 + random.between(-0.2, 0.3), 1);
    workouts.push({
      date,
      type: "Running",
      durationMin: Math.floor(km * 7.4),
      distanceKm: km,
      caloriesBurned: Math.floor(km * 62),
    });
  }
  if (weekday === 6 && week % 2 === 1) {
    workouts.push({ date, type: "Swimming", durationMin: 40, distanceKm: 1, caloriesBurned: 280 });
  }
}

const startWeightKg = daily.find(day => day.weightKg !== null)!.weightKg!;

const data: HealthData = {
  asOf: "2026-10-19",
  persona: {
    id: "long-phan",
    name: "Long Phan",
    age: 25,
    sex: "male",
    heightCm: 172,
    occupation: "Frontend Developer",
    location: "Ho Chi Minh City, Vietnam",
    programStartDate: START,
    about:
      "Works long hours at a desk. Started a wellness plan 8 weeks ago to move more, sleep better and lose a few kilograms. Does yoga on Tuesdays and runs on Saturdays.",
    dietPreference: "Pescatarian",
    device: "Fitness band + phone app",
  },
  goals: {
    dailySteps: 8000,
    weeklyActiveMinutes: 150,
    sleepHours: 7.5,
    dailyProteinG: 90,
    dailyWaterL: 2.0,
    targetWeightKg: 60.0,
    startWeightKg,
    targetDate: "2026-12-31",
  },
  notTracked: ["blood pressure", "blood glucose", "lab test results", "medications", "stress or mood"],
  daily,
  workouts,
};

await writeFile(OUT, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${daily.length} days and ${workouts.length} workouts to ${OUT}`);

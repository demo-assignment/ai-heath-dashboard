export interface Persona {
  id: string;
  name: string;
  age: number;
  sex: string;
  heightCm: number;
  occupation: string;
  location: string;
  programStartDate: string;
  about: string;
  dietPreference: string;
  device: string;
}

export interface Goals {
  dailySteps: number;
  weeklyActiveMinutes: number;
  sleepHours: number;
  dailyProteinG: number;
  dailyWaterL: number;
  targetWeightKg: number;
  startWeightKg: number;
  targetDate: string;
}

export interface DailyRecord {
  date: string;
  steps: number | null;
  activeMinutes: number | null;
  sleepHours: number | null;
  restingHeartRate: number | null;
  caloriesIn: number | null;
  proteinG: number | null;
  waterL: number | null;
  weightKg: number | null;
}

export interface Workout {
  date: string;
  type: string;
  durationMin: number;
  distanceKm: number | null;
  caloriesBurned: number;
}

export interface HealthData {
  asOf: string;
  persona: Persona;
  goals: Goals;
  notTracked: string[];
  daily: DailyRecord[];
  workouts: Workout[];
  // dates the user added by hand (form or Excel), on top of the device data
  manualDates?: string[];
  lastSyncedDate?: string;
  isProfileEdited?: boolean;
}

export interface WeeklySummary {
  week: number;
  startDate: string;
  endDate: string;
  daysTracked: number;
  avgSteps: number | null;
  activeMinutes: number;
  avgSleepHours: number | null;
  avgRestingHeartRate: number | null;
  avgProteinG: number | null;
  avgWaterL: number | null;
  avgCaloriesIn: number | null;
  weightKg: number | null;
  workouts: number;
  // true for the current week while it has fewer than 7 days
  isPartial: boolean;
}

export type GoalStatus = "on_track" | "close" | "behind";

export interface GoalProgress {
  key: "steps" | "activeMinutes" | "sleep" | "weight" | "protein" | "water";
  label: string;
  current: number;
  target: number;
  unit: string;
  // 0..1, how close the user is to the goal
  progress: number;
  status: GoalStatus;
  // change vs previous week, null when there is nothing to compare
  change: number | null;
  detail: string;
}

export interface FocusArea {
  key: GoalProgress["key"];
  title: string;
  reason: string;
  suggestion: string;
}

export interface Dashboard {
  asOf: string;
  persona: Persona;
  goals: Goals;
  notTracked: string[];
  daily: DailyRecord[];
  weekly: WeeklySummary[];
  goalProgress: GoalProgress[];
  focusAreas: FocusArea[];
  sleepPattern: { weekdayAvg: number | null; weekendAvg: number | null };
  recentWorkouts: Workout[];
  missingDays: string[];
  manualDates: string[];
  // true when the user changed the fictional persona's details or goals
  isProfileEdited: boolean;
  // last day that came from the device; manual entries must be after it
  lastSyncedDate: string;
  // the range of dates the user may add right now
  entryWindow: { from: string; to: string };
}

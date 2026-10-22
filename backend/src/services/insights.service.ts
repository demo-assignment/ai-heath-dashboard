import { average, clamp, round, sum } from "../utils/math.js";
import { addDays, getToday } from "../utils/date.js";
import type { Dashboard, FocusArea, GoalProgress, GoalStatus, HealthData, WeeklySummary } from "../types/health.js";

const DAYS_PER_WEEK = 7;

const isWeekend = (date: string) => {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
};

const getStatus = (progress: number): GoalStatus => {
  if (progress >= 0.95) return "on_track";
  if (progress >= 0.85) return "close";
  return "behind";
};

const formatShortDate = (date: string) => {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
};

const daysBetween = (from: string, to: string) => {
  return Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000);
};

export const getWeeklySummaries = (data: HealthData): WeeklySummary[] => {
  const weeks: WeeklySummary[] = [];

  for (let i = 0; i < data.daily.length; i += DAYS_PER_WEEK) {
    const days = data.daily.slice(i, i + DAYS_PER_WEEK);
    const startDate = days[0].date;
    const endDate = days[days.length - 1].date;
    const weighIns = days.map(day => day.weightKg).filter((value): value is number => value !== null);

    weeks.push({
      week: weeks.length + 1,
      startDate,
      endDate,
      daysTracked: days.filter(day => day.steps !== null).length,
      avgSteps: average(
        days.map(day => day.steps),
        0,
      ),
      activeMinutes: sum(days.map(day => day.activeMinutes)),
      avgSleepHours: average(days.map(day => day.sleepHours)),
      avgRestingHeartRate: average(days.map(day => day.restingHeartRate)),
      avgProteinG: average(
        days.map(day => day.proteinG),
        0,
      ),
      avgWaterL: average(days.map(day => day.waterL)),
      avgCaloriesIn: average(
        days.map(day => day.caloriesIn),
        0,
      ),
      weightKg: weighIns.length ? weighIns[weighIns.length - 1] : null,
      workouts: data.workouts.filter(workout => workout.date >= startDate && workout.date <= endDate).length,
      isPartial: days.length < DAYS_PER_WEEK,
    });
  }

  return weeks;
};

const getChange = (current: number | null, previous: number | null, digits = 1) => {
  if (current === null || previous === null) return null;
  return round(current - previous, digits);
};

export const getGoalProgress = (data: HealthData, weekly: WeeklySummary[]): GoalProgress[] => {
  const { goals } = data;
  const thisWeek = weekly[weekly.length - 1];
  const lastWeek = weekly[weekly.length - 2] ?? null;
  const last7Days = data.daily.slice(-DAYS_PER_WEEK);
  const stepGoalDays = last7Days.filter(day => (day.steps ?? 0) >= goals.dailySteps).length;
  const sleepGoalNights = last7Days.filter(day => (day.sleepHours ?? 0) >= goals.sleepHours).length;

  const avgSteps = thisWeek.avgSteps ?? 0;
  const avgSleep = thisWeek.avgSleepHours ?? 0;
  const avgProtein = thisWeek.avgProteinG ?? 0;
  const avgWater = thisWeek.avgWaterL ?? 0;
  const latestWeight = [...weekly].reverse().find(week => week.weightKg !== null)?.weightKg ?? goals.startWeightKg;

  const weightToLose = goals.startWeightKg - goals.targetWeightKg;
  const weightLost = round(goals.startWeightKg - latestWeight, 1);
  // Weight is a long-term goal, so compare it with where the user should be by now, not with the final target.
  const planDays = daysBetween(data.persona.programStartDate, goals.targetDate);
  const expectedWeightProgress = clamp(daysBetween(data.persona.programStartDate, data.asOf) / planDays);
  const weightPace = weightLost / weightToLose / expectedWeightProgress;

  const items: Omit<GoalProgress, "status">[] = [
    {
      key: "steps",
      label: "Daily steps",
      current: avgSteps,
      target: goals.dailySteps,
      unit: "steps",
      progress: clamp(avgSteps / goals.dailySteps),
      change: getChange(thisWeek.avgSteps, lastWeek?.avgSteps ?? null, 0),
      detail: `Goal reached on ${stepGoalDays} of the last 7 days`,
    },
    {
      key: "activeMinutes",
      label: "Active minutes",
      current: thisWeek.activeMinutes,
      target: goals.weeklyActiveMinutes,
      unit: "min/week",
      progress: clamp(thisWeek.activeMinutes / goals.weeklyActiveMinutes),
      change: lastWeek ? thisWeek.activeMinutes - lastWeek.activeMinutes : null,
      detail: thisWeek.isPartial
        ? `Week in progress, ${thisWeek.daysTracked} of 7 days logged`
        : `${thisWeek.workouts} workouts this week`,
    },
    {
      key: "sleep",
      label: "Sleep",
      current: avgSleep,
      target: goals.sleepHours,
      unit: "h/night",
      progress: clamp(avgSleep / goals.sleepHours),
      change: getChange(thisWeek.avgSleepHours, lastWeek?.avgSleepHours ?? null),
      detail: `Goal reached on ${sleepGoalNights} of the last 7 nights`,
    },
    {
      key: "weight",
      label: "Weight",
      current: latestWeight,
      target: goals.targetWeightKg,
      unit: "kg",
      progress: clamp(weightLost / weightToLose),
      change: getChange(thisWeek.weightKg, lastWeek?.weightKg ?? null),
      detail: `${weightLost} kg lost of ${round(weightToLose, 1)} kg goal, ${weightPace >= 1 ? "on pace" : "behind pace"} for ${formatShortDate(goals.targetDate)}`,
    },
    {
      key: "protein",
      label: "Protein",
      current: avgProtein,
      target: goals.dailyProteinG,
      unit: "g/day",
      progress: clamp(avgProtein / goals.dailyProteinG),
      change: getChange(thisWeek.avgProteinG, lastWeek?.avgProteinG ?? null, 0),
      detail: `${Math.max(goals.dailyProteinG - avgProtein, 0)} g below target on average`,
    },
    {
      key: "water",
      label: "Water",
      current: avgWater,
      target: goals.dailyWaterL,
      unit: "L/day",
      progress: clamp(avgWater / goals.dailyWaterL),
      change: getChange(thisWeek.avgWaterL, lastWeek?.avgWaterL ?? null),
      detail: `${round(Math.max(goals.dailyWaterL - avgWater, 0), 1)} L below target on average`,
    },
  ];

  return items.map(item => ({
    ...item,
    progress: round(item.progress, 2),
    status: getStatus(item.key === "weight" ? weightPace : item.progress),
  }));
};

const FOCUS_COPY: Partial<Record<GoalProgress["key"], Omit<FocusArea, "key" | "reason">>> = {
  sleep: {
    title: "Protect your sleep",
    suggestion: "Pick a fixed bedtime on work nights and start winding down 30 minutes earlier.",
  },
  protein: {
    title: "Add protein to each meal",
    suggestion: "Fish, tofu, eggs or Greek yogurt at breakfast closes most of the gap.",
  },
  water: {
    title: "Drink more water",
    suggestion: "Keep a 1 L bottle at your desk and finish it twice during the day.",
  },
  steps: {
    title: "Keep weekday steps up",
    suggestion: "Short walks after lunch help on busy days when weekend activity can't make up for it.",
  },
  activeMinutes: {
    title: "Get more active minutes",
    suggestion: "Add one more 20-minute session, such as a brisk walk, on a weekday.",
  },
};

// Simple rules on purpose: the dashboard should always show the same advice for the same data.
// The AI assistant is for follow-up questions, not for the core numbers.
export const getFocusAreas = (goalProgress: GoalProgress[]): FocusArea[] => {
  return goalProgress
    .filter(goal => goal.status !== "on_track" && FOCUS_COPY[goal.key])
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 3)
    .map(goal => ({
      key: goal.key,
      ...FOCUS_COPY[goal.key]!,
      reason: `${goal.current} ${goal.unit} vs goal of ${goal.target} ${goal.unit} this week.`,
    }));
};

export const getDashboard = (data: HealthData): Dashboard => {
  const weekly = getWeeklySummaries(data);
  const goalProgress = getGoalProgress(data, weekly);
  const tracked = data.daily.filter(day => day.sleepHours !== null);
  const lastSyncedDate = data.lastSyncedDate ?? data.daily[data.daily.length - 1].date;

  return {
    asOf: data.asOf,
    persona: data.persona,
    goals: data.goals,
    notTracked: data.notTracked,
    daily: data.daily,
    weekly,
    goalProgress,
    focusAreas: getFocusAreas(goalProgress),
    sleepPattern: {
      weekdayAvg: average(tracked.filter(day => !isWeekend(day.date)).map(day => day.sleepHours)),
      weekendAvg: average(tracked.filter(day => isWeekend(day.date)).map(day => day.sleepHours)),
    },
    recentWorkouts: [...data.workouts].reverse().slice(0, 6),
    missingDays: data.daily.filter(day => day.steps === null).map(day => day.date),
    manualDates: data.manualDates ?? [],
    isProfileEdited: data.isProfileEdited ?? false,
    lastSyncedDate,
    entryWindow: { from: addDays(lastSyncedDate, 1), to: getToday() },
  };
};

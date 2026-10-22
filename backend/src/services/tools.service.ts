import { average, sum } from "../utils/math.js";
import type { HealthData } from "../types/health.js";

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface ChartBlock {
  type: "bar";
  title: string;
  unit: string;
  goal: number | null;
  points: { date: string; value: number | null }[];
}

export interface ToolResult {
  // what goes back to the model
  content: Record<string, unknown>;
  // short human label, e.g. "Daily data, 3 Oct – 9 Oct"
  label: string;
  // extra UI to show in the chat; data comes from code, never from the model
  chart?: ChartBlock;
}

const CHART_METRICS: Record<string, { title: string; unit: string; goal?: (data: HealthData) => number }> = {
  steps: { title: "Steps", unit: "steps", goal: data => data.goals.dailySteps },
  activeMinutes: { title: "Active minutes", unit: "min" },
  sleepHours: { title: "Sleep", unit: "h", goal: data => data.goals.sleepHours },
  restingHeartRate: { title: "Resting heart rate", unit: "bpm" },
  caloriesIn: { title: "Calories eaten", unit: "kcal" },
  proteinG: { title: "Protein", unit: "g", goal: data => data.goals.dailyProteinG },
  waterL: { title: "Water", unit: "L", goal: data => data.goals.dailyWaterL },
};

const MAX_RANGE_DAYS = 31;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// JSON Schema definitions in the OpenAI "tools" format. Groq and Gemini both accept this.
export const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "get_daily_metrics",
      description:
        "Get steps, active minutes, sleep hours, resting heart rate, calories, protein, water and weight for each day in a date range. Use it for questions about specific days or short periods. Max 31 days.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "Start date, YYYY-MM-DD" },
          to: { type: "string", description: "End date, YYYY-MM-DD, inclusive" },
        },
        required: ["from", "to"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_period_summary",
      description:
        "Get averages and totals for a date range, calculated by the app. Call it once per period to compare two periods, e.g. this month vs last month or weekdays of two weeks.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "Start date, YYYY-MM-DD" },
          to: { type: "string", description: "End date, YYYY-MM-DD, inclusive" },
        },
        required: ["from", "to"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_chart",
      description:
        "Show the user a bar chart of one daily metric under your answer. Use it when a trend over several days is easier to see than to read. At most once per answer. Max 31 days.",
      parameters: {
        type: "object",
        properties: {
          metric: {
            type: "string",
            enum: ["steps", "activeMinutes", "sleepHours", "restingHeartRate", "caloriesIn", "proteinG", "waterL"],
          },
          from: { type: "string", description: "Start date, YYYY-MM-DD" },
          to: { type: "string", description: "End date, YYYY-MM-DD, inclusive" },
        },
        required: ["metric", "from", "to"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_workouts",
      description: "List logged workouts in a date range, optionally filtered by type.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "Start date, YYYY-MM-DD" },
          to: { type: "string", description: "End date, YYYY-MM-DD, inclusive" },
          type: { type: "string", enum: ["Running", "Yoga", "Swimming", "Strength training"] },
        },
        required: ["from", "to"],
        additionalProperties: false,
      },
    },
  },
];

const shortDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

const rangeLabel = (from: string, to: string) =>
  from === to ? shortDate(from) : `${shortDate(from)} – ${shortDate(to)}`;

const daysBetween = (from: string, to: string) =>
  Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000);

type RangeCheck = { ok: true; from: string; to: string } | { ok: false; error: string };

// Errors are returned to the model as data, so it can tell the user instead of crashing the chat.
const checkRange = (args: Record<string, unknown>, data: HealthData, maxDays?: number): RangeCheck => {
  const { from, to } = args;
  const firstDate = data.daily[0].date;
  const lastDate = data.daily[data.daily.length - 1].date;

  if (typeof from !== "string" || typeof to !== "string" || !DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) {
    return { ok: false, error: "Dates must be strings in YYYY-MM-DD format." };
  }
  if (Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) {
    return { ok: false, error: "One of the dates is not a real date." };
  }
  if (from > to) return { ok: false, error: "'from' must be before or equal to 'to'." };
  if (to < firstDate || from > lastDate) {
    return { ok: false, error: `No data in this range. Data is only available from ${firstDate} to ${lastDate}.` };
  }
  if (maxDays && daysBetween(from, to) + 1 > maxDays) {
    return {
      ok: false,
      error: `Range is too long. Use at most ${maxDays} days, or get_period_summary for longer periods.`,
    };
  }

  // Clamp to the available data so a slightly wider range still works.
  return { ok: true, from: from < firstDate ? firstDate : from, to: to > lastDate ? lastDate : to };
};

const parseArgs = (raw: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const executeTool = (call: ToolCall, data: HealthData): ToolResult => {
  const args = parseArgs(call.arguments);
  if (!args) return { content: { error: "Arguments must be a valid JSON object." }, label: "Invalid tool call" };

  switch (call.name) {
    case "get_daily_metrics": {
      const range = checkRange(args, data, MAX_RANGE_DAYS);
      if (!range.ok) return { content: { error: range.error }, label: "Daily data (no match)" };
      const days = data.daily
        .filter(day => day.date >= range.from && day.date <= range.to)
        .map(day =>
          day.steps === null
            ? { date: day.date, note: "no data synced" }
            : {
                ...day,
                stepsGoalMet: day.steps >= data.goals.dailySteps,
                sleepGoalMet: day.sleepHours === null ? null : day.sleepHours >= data.goals.sleepHours,
              },
        );
      return {
        content: { from: range.from, to: range.to, days },
        label: `Daily data, ${rangeLabel(range.from, range.to)}`,
      };
    }

    case "get_period_summary": {
      const range = checkRange(args, data);
      if (!range.ok) return { content: { error: range.error }, label: "Period summary (no match)" };
      const days = data.daily.filter(day => day.date >= range.from && day.date <= range.to);
      const workouts = data.workouts.filter(workout => workout.date >= range.from && workout.date <= range.to);
      return {
        content: {
          from: range.from,
          to: range.to,
          daysInRange: days.length,
          daysTracked: days.filter(day => day.steps !== null).length,
          avgSteps: average(
            days.map(day => day.steps),
            0,
          ),
          totalActiveMinutes: sum(days.map(day => day.activeMinutes)),
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
          workouts: workouts.length,
        },
        label: `Summary, ${rangeLabel(range.from, range.to)}`,
      };
    }

    case "get_workouts": {
      const range = checkRange(args, data);
      if (!range.ok) return { content: { error: range.error }, label: "Workouts (no match)" };
      const type = typeof args.type === "string" ? args.type : null;
      const workouts = data.workouts.filter(
        workout => workout.date >= range.from && workout.date <= range.to && (!type || workout.type === type),
      );
      return {
        content: { from: range.from, to: range.to, type, count: workouts.length, workouts },
        label: `Workouts, ${rangeLabel(range.from, range.to)}`,
      };
    }

    case "show_chart": {
      const metric = typeof args.metric === "string" ? CHART_METRICS[args.metric] : undefined;
      if (!metric) return { content: { error: "Unknown metric." }, label: "Chart (no match)" };
      const range = checkRange(args, data, MAX_RANGE_DAYS);
      if (!range.ok) return { content: { error: range.error }, label: "Chart (no match)" };
      const days = data.daily.filter(day => day.date >= range.from && day.date <= range.to);
      const key = args.metric as keyof (typeof days)[number];
      const points = days.map(day => ({ date: day.date, value: day[key] as number | null }));
      const goal = metric.goal?.(data) ?? null;
      // Counting is done here, not by the model (it miscounted "7.2 h" as meeting a 7.5 h goal).
      const synced = points.filter(point => point.value !== null);
      const goalSummary =
        goal === null
          ? undefined
          : {
              goal,
              metOn: synced.filter(point => (point.value as number) >= goal).map(point => point.date),
              daysWithData: synced.length,
            };
      return {
        content: {
          shown: true,
          metric: args.metric,
          from: range.from,
          to: range.to,
          points: points.map(point =>
            goal === null || point.value === null ? point : { ...point, goalMet: point.value >= goal },
          ),
          ...(goalSummary && {
            goalMetCount: goalSummary.metOn.length,
            goalMetOn: goalSummary.metOn,
            daysWithData: goalSummary.daysWithData,
          }),
        },
        label: `${metric.title} chart, ${rangeLabel(range.from, range.to)}`,
        chart: { type: "bar", title: metric.title, unit: metric.unit, goal: metric.goal?.(data) ?? null, points },
      };
    }

    default:
      return { content: { error: `Unknown tool "${call.name}".` }, label: "Unknown tool" };
  }
};

export const getToolStatus = (call: ToolCall) => {
  if (call.name === "get_workouts") return "Checking your workouts…";
  if (call.name === "get_period_summary") return "Comparing periods in your data…";
  if (call.name === "show_chart") return "Drawing a chart…";
  return "Looking up your daily data…";
};

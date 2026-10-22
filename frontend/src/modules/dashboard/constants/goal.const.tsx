import type { GoalProgress, GoalStatus } from "@/types/health";

export const GOAL_DIGITS: Record<GoalProgress["key"], number> = {
  steps: 0,
  activeMinutes: 0,
  sleep: 1,
  weight: 1,
  protein: 0,
  water: 1,
};

// weight going down is the good direction
export const LOWER_IS_BETTER: GoalProgress["key"][] = ["weight"];

export const STATUS_LABEL: Record<GoalStatus, string> = {
  on_track: "On track",
  close: "Almost there",
  behind: "Needs focus",
};

export const STATUS_DOT: Record<GoalStatus, string> = {
  on_track: "bg-emerald-500",
  close: "bg-amber-400",
  behind: "bg-rose-500",
};

export const TIP_COLORS: Partial<Record<GoalProgress["key"], string>> = {
  steps: "bg-orange-100 text-orange-700",
  activeMinutes: "bg-rose-100 text-rose-700",
  sleep: "bg-indigo-100 text-indigo-700",
  protein: "bg-amber-100 text-amber-800",
  water: "bg-sky-100 text-sky-700",
};

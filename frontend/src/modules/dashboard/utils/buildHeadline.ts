import { formatNumber } from "@/utils/format";
import type { Dashboard } from "@/types/health";

const joinList = (items: string[]) => {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
};

export const buildHeadline = (dashboard: Dashboard) => {
  const first = dashboard.weekly[0];
  const last = dashboard.weekly[dashboard.weekly.length - 1];
  const parts: string[] = [];

  if (first?.avgSteps && last?.avgSteps && last.avgSteps > first.avgSteps) {
    parts.push(`You're walking ${formatNumber(last.avgSteps - first.avgSteps)} more steps a day than in week 1.`);
  }

  const onTrack = dashboard.goalProgress
    .filter(goal => goal.status === "on_track")
    .map(goal => goal.label.toLowerCase());
  if (onTrack.length) parts.push(`You're on track for ${joinList(onTrack)}.`);

  const sleep = dashboard.goalProgress.find(goal => goal.key === "sleep");
  if (sleep && sleep.status !== "on_track") {
    parts.push(`Sleep is still short at ${formatNumber(sleep.current, 1)} h a night.`);
  }

  return parts.join(" ") || "Here's how your week went.";
};

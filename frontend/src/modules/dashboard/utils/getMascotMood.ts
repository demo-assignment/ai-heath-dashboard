import type { MascotMood } from "@/components/mascot/Mascot";
import type { Dashboard } from "@/types/health";

// Hearty's face follows the data, so it's honest: happy only when most goals are on track.
export const getMascotMood = (dashboard: Dashboard): MascotMood => {
  const onTrack = dashboard.goalProgress.filter(goal => goal.status === "on_track").length;
  if (onTrack >= 4) return "happy";
  if (onTrack >= 2) return "proud";
  return "concerned";
};

export const getPlanWeeks = (dashboard: Dashboard) => {
  const toTime = (date: string) => new Date(`${date}T00:00:00Z`).getTime();
  const days = (toTime(dashboard.goals.targetDate) - toTime(dashboard.persona.programStartDate)) / 86_400_000;
  return Math.ceil(days / 7);
};

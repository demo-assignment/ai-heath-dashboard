import { FC } from "react";
import Mascot from "@/components/mascot/Mascot";
import { buildHeadline } from "../utils/buildHeadline";
import { getMascotMood, getPlanWeeks } from "../utils/getMascotMood";
import { formatChange, formatDate } from "@/utils/format";
import type { Dashboard } from "@/types/health";

interface HeroCardProps {
  dashboard: Dashboard;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
};

const HeroCard: FC<HeroCardProps> = props => {
  const { dashboard } = props;
  const first = dashboard.weekly[0];
  const thisWeek = dashboard.weekly[dashboard.weekly.length - 1];
  const totalWeeks = getPlanWeeks(dashboard);
  const onTrack = dashboard.goalProgress.filter(goal => goal.status === "on_track").length;
  const heartRateChange =
    first.avgRestingHeartRate !== null && thisWeek.avgRestingHeartRate !== null
      ? thisWeek.avgRestingHeartRate - first.avgRestingHeartRate
      : null;

  const chips = [
    `${onTrack} of ${dashboard.goalProgress.length} goals on track`,
    `${thisWeek.workouts} workouts this week`,
    heartRateChange === null ? null : `Resting HR ${formatChange(heartRateChange, 1)} bpm since week 1`,
  ].filter(Boolean);

  return (
    <section className="relative flex h-full flex-col overflow-hidden rounded-[32px] bg-gradient-to-br from-[#1f6f5c] via-[#185a4b] to-[#0e3a31] p-6 text-white sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-lime/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-mint/20 blur-3xl" />

      <p className="relative w-fit rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-lime">
        Week {thisWeek.week} of {totalWeeks} · {formatDate(thisWeek.startDate)} – {formatDate(thisWeek.endDate)}
      </p>

      <div className="relative mt-5 flex flex-1 flex-col gap-6 sm:flex-row sm:items-end">
        <div className="flex-1">
          <h1 className="font-display text-[2.5rem] font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            {getGreeting()}, {dashboard.persona.name.split(" ")[0]}.
          </h1>
          <div className="relative mt-5 rounded-3xl rounded-bl-md bg-white p-4 text-ink shadow-xl shadow-black/10">
            <p className="text-[15px] font-medium leading-relaxed">{buildHeadline(dashboard)}</p>
            <p className="mt-2 text-xs font-semibold text-brand">Hearty, your health buddy</p>
          </div>
        </div>
        <Mascot
          mood={getMascotMood(dashboard)}
          size={140}
          label="Hearty, the health buddy"
          className="order-first mx-auto sm:order-none sm:mx-0"
        />
      </div>

      <div className="relative mt-6">
        <div className="mb-2 flex justify-between text-[11px] font-semibold uppercase tracking-wider text-white/60">
          <span>Plan start</span>
          <span>Goal date</span>
        </div>
        <div className="flex gap-1" aria-label={`Week ${thisWeek.week} of ${totalWeeks}`}>
          {Array.from({ length: totalWeeks }).map((_, index) => (
            <span
              key={index}
              className={`h-2 flex-1 rounded-full ${index < thisWeek.week - 1 ? "bg-lime" : index === thisWeek.week - 1 ? "bg-white" : "bg-white/15"}`}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map(chip => (
            <span key={chip} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium">
              {chip}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroCard;

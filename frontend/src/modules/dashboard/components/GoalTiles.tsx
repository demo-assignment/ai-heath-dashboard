import { FC, ReactNode } from "react";
import ProgressRing from "@/components/charts/ProgressRing";
import BarChart from "@/components/charts/BarChart";
import Mascot from "@/components/mascot/Mascot";
import WillRender from "@/components/will-render/WillRender";
import { FlameIcon, FootIcon, LeafIcon, MoonIcon } from "@/components/icons/Icons";
import { GOAL_DIGITS, LOWER_IS_BETTER, STATUS_DOT, STATUS_LABEL } from "../constants/goal.const";
import { formatChange, formatDate, formatNumber, formatWeekday } from "@/utils/format";
import type { Dashboard, GoalProgress } from "@/types/health";

interface TileProps {
  goal: GoalProgress;
  dashboard: Dashboard;
}

// Same white chip on every tile, so labels stay readable over any artwork or colour.
const BADGE = "rounded-full bg-white/90 text-ink shadow-sm";

const StatusPill: FC<{ goal: GoalProgress }> = ({ goal }) => (
  <span className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-1 text-[11px] font-bold ${BADGE}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[goal.status]}`} />
    {STATUS_LABEL[goal.status]}
  </span>
);

// onColor: for bright tiles (orange, blue) where green/red text would be hard to read
const ChangeText: FC<{ goal: GoalProgress; isDark?: boolean; onColor?: boolean }> = ({ goal, isDark, onColor }) => {
  const change = formatChange(goal.change, GOAL_DIGITS[goal.key]);
  if (!change) return null;
  const isGood = LOWER_IS_BETTER.includes(goal.key) ? (goal.change ?? 0) < 0 : (goal.change ?? 0) > 0;
  const arrow = goal.change === 0 ? "" : isGood ? "▲ " : "▼ ";

  let color = "";
  if (onColor) color = "text-current";
  else if (goal.change !== 0)
    color = isGood ? (isDark ? "text-lime" : "text-emerald-700") : isDark ? "text-rose-300" : "text-rose-600";

  return (
    <span className={`font-bold ${color}`}>
      {arrow}
      {change} vs last week
    </span>
  );
};

// hasBadge: white chip behind the label, for tiles where artwork runs under the title
const TileHeader: FC<{
  icon: ReactNode;
  label: string;
  goal: GoalProgress;
}> = props => {
  const { icon, label, goal } = props;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className={`flex items-center gap-2 whitespace-nowrap py-1 pl-2 pr-3 text-sm font-semibold ${BADGE}`}>
        {icon}
        {label}
      </span>
      <StatusPill goal={goal} />
    </div>
  );
};

const BigNumber: FC<{ value: string; suffix: string; className?: string }> = ({ value, suffix, className = "" }) => (
  <p className={`mt-3 flex flex-wrap items-baseline gap-x-1.5 ${className}`}>
    <span className="font-display text-4xl font-extrabold tracking-tight @[260px]:text-5xl">{value}</span>
    <span className="whitespace-nowrap text-sm font-medium opacity-75">{suffix}</span>
  </p>
);

const StepsTile: FC<TileProps> = ({ goal, dashboard }) => {
  const days = dashboard.daily.slice(-7);
  const max = Math.max(...days.map(day => day.steps ?? 0), goal.target);

  return (
    <article className="flex h-full flex-col rounded-[28px] bg-gradient-to-br from-[#ffb547] to-[#ff6b3d] p-5 text-white">
      <TileHeader icon={<FootIcon className="text-orange-500" />} label="Steps" goal={goal} />
      <BigNumber value={formatNumber(goal.current)} suffix={`/ ${formatNumber(goal.target)} a day`} />
      <div className="relative mt-4 flex min-h-16 flex-1 items-end gap-1.5" aria-hidden>
        <span
          className="absolute inset-x-0 border-t border-dashed border-white/60"
          style={{ bottom: `${(goal.target / max) * 100}%` }}
        />
        {days.map(day => (
          <span
            key={day.date}
            title={`${formatWeekday(day.date)}: ${formatNumber(day.steps)}`}
            className={`flex-1 rounded-md ${(day.steps ?? 0) >= goal.target ? "bg-white" : "bg-white/45"}`}
            style={{ height: `${Math.max(((day.steps ?? 0) / max) * 100, 6)}%` }}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-white">
        <ChangeText goal={goal} onColor /> · {goal.detail.toLowerCase()}
      </p>
    </article>
  );
};

const ActiveTile: FC<TileProps> = ({ goal }) => (
  <article className="flex h-full flex-col rounded-[28px] bg-[#ffe1db] p-5 text-ink">
    <TileHeader icon={<FlameIcon className="text-rose-500" />} label="Active minutes" goal={goal} />
    <div className="mt-3 flex flex-wrap items-center gap-4">
      <ProgressRing progress={goal.progress} colorClassName="stroke-rose-500" size={84}>
        <span className="font-display text-xl font-extrabold">{Math.round(goal.progress * 100)}%</span>
      </ProgressRing>
      <div>
        <p className="font-display text-4xl font-extrabold tracking-tight">{goal.current}</p>
        <p className="whitespace-nowrap text-sm text-muted">/ {goal.target} min this week</p>
      </div>
    </div>
    <p className="mt-auto pt-3 text-xs text-muted">
      <ChangeText goal={goal} /> · {goal.detail.toLowerCase()}
    </p>
  </article>
);

const SleepTile: FC<TileProps> = ({ goal, dashboard }) => {
  const nights = dashboard.daily.slice(-7).map(day => ({
    label: formatWeekday(day.date).slice(0, 2),
    tooltipLabel: `${formatWeekday(day.date)}, ${formatDate(day.date)}`,
    value: day.sleepHours,
  }));

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-[28px] bg-gradient-to-b from-[#1c1a46] to-[#2e2a7a] p-5 text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {[
          [18, 22],
          [72, 14],
          [86, 38],
          [40, 10],
          [60, 30],
          [28, 44],
        ].map(([left, top], index) => (
          <span
            key={index}
            className="twinkle absolute h-1 w-1 rounded-full bg-white"
            style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${index * 0.5}s` }}
          />
        ))}
        <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-100/90 shadow-[0_0_60px_10px_rgba(254,243,199,0.35)]" />
        <span className="absolute -right-1 -top-9 h-24 w-24 rounded-full bg-[#1c1a46]" />
      </div>

      <div className="relative">
        <TileHeader icon={<MoonIcon className="text-indigo-500" />} label="Sleep" goal={goal} />
        <BigNumber value={formatNumber(goal.current, 1)} suffix={`h / ${goal.target} h a night`} />
        <p className="mt-1 text-xs text-indigo-200">
          <ChangeText goal={goal} isDark /> · {goal.detail.toLowerCase()}
        </p>
      </div>

      <div className="relative mt-4">
        <BarChart
          data={nights}
          goal={goal.target}
          barClassName="fill-indigo-300"
          labelClassName="fill-indigo-200"
          goalClassName="stroke-white/40"
          formatValue={value => `${formatNumber(value, 1)} h`}
          ariaLabel={`Sleep for the last 7 nights, goal ${goal.target} hours`}
          height={140}
          viewWidth={300}
        />
      </div>

      <div className="relative mt-auto flex items-end justify-between gap-3 pt-4">
        <div className="grid flex-1 grid-cols-2 gap-2 text-xs">
          <div className="rounded-2xl bg-white/10 px-3 py-2">
            <div className="text-indigo-200">Weekdays</div>
            <div className="whitespace-nowrap font-display text-lg font-bold">
              {formatNumber(dashboard.sleepPattern.weekdayAvg, 1)} h
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2">
            <div className="text-indigo-200">Weekends</div>
            <div className="whitespace-nowrap font-display text-lg font-bold">
              {formatNumber(dashboard.sleepPattern.weekendAvg, 1)} h
            </div>
          </div>
        </div>
        <Mascot mood="sleepy" size={56} className="hidden @[240px]:block" />
      </div>
    </article>
  );
};

const WeightTile: FC<TileProps> = ({ goal, dashboard }) => {
  const percent = Math.round(goal.progress * 100);

  return (
    <article className="flex h-full flex-col rounded-[28px] bg-[#e6f9b8] p-5 text-ink">
      <TileHeader icon={<span className="text-base">⚖️</span>} label="Weight journey" goal={goal} />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <BigNumber value={formatNumber(goal.current, 1)} suffix="kg now" className="mt-0" />
        <p className="text-sm text-muted">
          <ChangeText goal={goal} />
        </p>
      </div>

      <div className="relative mt-6 mb-2 mr-3" aria-label={`${percent}% of the way to ${goal.target} kg`}>
        <div className="h-3 rounded-full bg-white/80" />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-lime-400 to-emerald-500"
          style={{ width: `${percent}%` }}
        />
        <span
          className="absolute top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[#e6f9b8] bg-ink text-[10px] font-bold text-lime"
          style={{ left: `${percent}%` }}
        >
          {percent}%
        </span>
        <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 text-base" aria-hidden>
          🏁
        </span>
      </div>
      <div className="flex justify-between text-xs font-semibold text-muted">
        <span>Start {dashboard.goals.startWeightKg} kg</span>
        <span>Goal {goal.target} kg</span>
      </div>
      <p className="mt-auto pt-3 text-xs text-muted">{goal.detail}</p>
    </article>
  );
};

const WaterTile: FC<TileProps> = ({ goal }) => {
  const level = Math.round(goal.progress * 100);
  const wave = "M0 10 Q 25 0 50 10 T 100 10 T 150 10 T 200 10 V 40 H 0 Z";

  return (
    <article className="relative flex h-full min-h-[200px] flex-col overflow-hidden rounded-[28px] bg-[#e3f4ff] p-5 text-ink">
      <div
        className="absolute inset-x-0 bottom-0 transition-[height] duration-1000"
        style={{ height: `${level}%` }}
        aria-hidden
      >
        <svg
          viewBox="0 0 100 20"
          preserveAspectRatio="none"
          className="absolute -top-3 left-0 h-4 w-[200%] fill-sky-300/60"
        >
          <path d={wave} className="wave-drift-slow" />
        </svg>
        <svg
          viewBox="0 0 100 20"
          preserveAspectRatio="none"
          className="absolute -top-2 left-0 h-4 w-[200%] fill-sky-400/70"
        >
          <path d={wave} className="wave-drift" />
        </svg>
        <div className="h-full bg-gradient-to-b from-sky-400/70 to-sky-500/80" />
      </div>

      <div className="relative">
        <TileHeader icon={<span className="text-base">💧</span>} label="Water" goal={goal} />
        <BigNumber value={formatNumber(goal.current, 1)} suffix={`/ ${formatNumber(goal.target, 1)} L`} />
      </div>
      <p className="relative mt-auto w-fit rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold">
        {level}% of daily goal · <ChangeText goal={goal} />
      </p>
    </article>
  );
};

const ProteinTile: FC<TileProps> = ({ goal, dashboard }) => {
  const segments = 9;
  const filled = Math.round(goal.progress * segments);
  const calories = dashboard.weekly[dashboard.weekly.length - 1]?.avgCaloriesIn;

  return (
    <article className="flex h-full flex-col rounded-[28px] bg-[#fff0c2] p-5 text-ink">
      <TileHeader icon={<LeafIcon className="text-amber-600" />} label="Protein" goal={goal} />
      <BigNumber value={formatNumber(goal.current)} suffix={`/ ${goal.target} g a day`} />
      <div className="mt-3 flex gap-1" aria-hidden>
        {Array.from({ length: segments }).map((_, index) => (
          <span key={index} className={`h-3 flex-1 rounded-full ${index < filled ? "bg-amber-500" : "bg-white/80"}`} />
        ))}
      </div>
      <p className="mt-auto pt-3 text-xs text-muted">
        <WillRender when={!!calories}>
          <span className="font-semibold text-ink">{formatNumber(calories)} kcal/day eaten · </span>
        </WillRender>
        {goal.detail.toLowerCase()}
      </p>
    </article>
  );
};

const TILE_BY_KEY: Record<GoalProgress["key"], FC<TileProps>> = {
  steps: StepsTile,
  activeMinutes: ActiveTile,
  sleep: SleepTile,
  weight: WeightTile,
  water: WaterTile,
  protein: ProteinTile,
};

// Bento placement: on 2 columns the 6 tiles make 3 even rows; on 4 columns (xl) sleep is tall and weight is wide,
// so together with the hero card the grid fills without holes.
const LAYOUT: { key: GoalProgress["key"]; className: string }[] = [
  { key: "steps", className: "" },
  { key: "sleep", className: "xl:row-span-2" },
  { key: "activeMinutes", className: "" },
  { key: "weight", className: "xl:col-span-2" },
  { key: "water", className: "" },
  { key: "protein", className: "" },
];

interface GoalTilesProps {
  dashboard: Dashboard;
}

export const renderGoalTiles = (props: GoalTilesProps) => {
  const { dashboard } = props;
  return LAYOUT.map(({ key, className }) => {
    const goal = dashboard.goalProgress.find(item => item.key === key);
    if (!goal) return null;
    const Tile = TILE_BY_KEY[key];
    return (
      <div key={key} className={`rise-in @container ${className}`}>
        <Tile goal={goal} dashboard={dashboard} />
      </div>
    );
  });
};

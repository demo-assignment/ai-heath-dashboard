import { FC, useMemo, useState } from "react";
import Card from "@/components/card/Card";
import BarChart, { BarDatum } from "@/components/charts/BarChart";
import EmptyState from "@/components/state/EmptyState";
import { formatDate, formatNumber, formatWeekday, isWeekend } from "@/utils/format";
import type { DailyRecord, WeeklySummary } from "@/types/health";

type Range = "daily" | "weekly";

interface ActivityChartProps {
  daily: DailyRecord[];
  weekly: WeeklySummary[];
  stepGoal: number;
}

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: "daily", label: "Last 28 days" },
  { value: "weekly", label: "8 weeks" },
];

const ActivityChart: FC<ActivityChartProps> = props => {
  const { daily, weekly, stepGoal } = props;
  const [range, setRange] = useState<Range>("daily");

  const data = useMemo(() => {
    if (range === "weekly") {
      return weekly.map(week => ({
        label: `W${week.week}`,
        tooltipLabel: `Week ${week.week} · ${formatDate(week.startDate)} – ${formatDate(week.endDate)}`,
        value: week.avgSteps,
      }));
    }
    return daily.slice(-28).map(day => ({
      label: formatDate(day.date, { day: "numeric" }),
      tooltipLabel: `${formatWeekday(day.date)}, ${formatDate(day.date)}`,
      value: day.steps,
      muted: !isWeekend(day.date),
    }));
  }, [range, daily, weekly]);

  const hasData = data.some(item => item.value !== null);

  // quick numbers under the chart, nulls (no sync) are left out
  const stats = useMemo(() => {
    const synced = data.filter(item => item.value !== null) as (BarDatum & { value: number })[];
    if (!synced.length) return [];
    const average = synced.reduce((sum, item) => sum + item.value, 0) / synced.length;
    const best = synced.reduce((top, item) => (item.value > top.value ? item : top));
    const hits = synced.filter(item => item.value >= stepGoal).length;
    const unit = range === "daily" ? "days" : "weeks";

    return [
      { label: range === "daily" ? "Daily average" : "Average of weeks", value: formatNumber(Math.round(average)) },
      { label: range === "daily" ? "Best day" : "Best week", value: formatNumber(best.value), hint: best.tooltipLabel },
      { label: "Goal reached", value: `${hits} / ${synced.length}`, hint: unit },
    ];
  }, [data, range, stepGoal]);

  return (
    <Card
      className="flex h-full flex-col"
      title="Steps over time"
      subtitle={range === "daily" ? "Weekends are your most active days" : "Average steps per day, each week"}
      action={
        <div className="flex rounded-full bg-canvas p-1 text-xs font-semibold" role="group" aria-label="Chart range">
          {RANGE_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => setRange(option.value)}
              aria-pressed={range === option.value}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 ${range === option.value ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      }
    >
      {hasData ? (
        <>
          <BarChart
            data={data}
            goal={stepGoal}
            barClassName="fill-orange-400"
            formatValue={value => `${formatNumber(value)} steps`}
            ariaLabel={`Steps chart, goal ${stepGoal} per day`}
            labelEvery={range === "daily" ? 3 : 1}
            height={215}
          />
          <p className="mt-2 text-xs text-muted">
            Dashed line: {formatNumber(stepGoal)} steps goal. Grey bars: no data synced.
          </p>
          <dl className="mt-auto grid grid-cols-3 gap-2 pt-4">
            {stats.map(stat => (
              <div key={stat.label} className="rounded-2xl bg-canvas px-3 py-2.5">
                <dt className="text-xs text-muted">{stat.label}</dt>
                <dd className="font-display text-lg font-bold tracking-tight">{stat.value}</dd>
                {stat.hint && <dd className="truncate text-[11px] text-muted">{stat.hint}</dd>}
              </div>
            ))}
          </dl>
        </>
      ) : (
        <EmptyState title="No step data yet" message="Sync your device to see your activity here." />
      )}
    </Card>
  );
};

export default ActivityChart;

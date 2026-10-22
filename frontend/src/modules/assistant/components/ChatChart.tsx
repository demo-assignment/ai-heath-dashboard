import { FC } from "react";
import BarChart from "@/components/charts/BarChart";
import { formatDate, formatNumber, formatWeekday } from "@/utils/format";
import type { ChartBlock } from "@/types/chat";

interface ChatChartProps {
  chart: ChartBlock;
}

const ChatChart: FC<ChatChartProps> = props => {
  const { chart } = props;
  const digits = chart.unit === "h" || chart.unit === "L" ? 1 : 0;
  const isShort = chart.points.length <= 10;
  const first = chart.points[0]?.date;
  const last = chart.points[chart.points.length - 1]?.date;

  return (
    <figure className="rounded-3xl border border-line bg-white p-3">
      <figcaption className="mb-1 flex items-baseline justify-between gap-2 px-1 text-xs">
        <span className="font-semibold text-ink">{chart.title}</span>
        <span className="text-muted">
          {first && last ? `${formatDate(first)} – ${formatDate(last)}` : ""}
          {chart.goal !== null ? ` · goal ${formatNumber(chart.goal, digits)} ${chart.unit}` : ""}
        </span>
      </figcaption>
      <BarChart
        data={chart.points.map(point => ({
          label: isShort ? formatWeekday(point.date).slice(0, 2) : formatDate(point.date, { day: "numeric" }),
          tooltipLabel: `${formatWeekday(point.date)}, ${formatDate(point.date)}`,
          value: point.value,
        }))}
        goal={chart.goal ?? undefined}
        barClassName="fill-rose-400"
        formatValue={value => `${formatNumber(value, digits)} ${chart.unit}`}
        ariaLabel={`${chart.title} chart`}
        height={130}
        viewWidth={320}
        labelEvery={isShort ? 1 : 4}
      />
    </figure>
  );
};

export default ChatChart;

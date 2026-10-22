import { FC, useState } from "react";
import WillRender from "../will-render/WillRender";

export interface BarDatum {
  label: string;
  tooltipLabel?: string;
  value: number | null;
  muted?: boolean;
}

interface BarChartProps {
  data: BarDatum[];
  goal?: number;
  barClassName: string;
  formatValue: (value: number) => string;
  ariaLabel: string;
  height?: number;
  // show every Nth x label so they don't overlap
  labelEvery?: number;
  // smaller viewBox = bigger text, use it for charts inside narrow cards
  viewWidth?: number;
  labelClassName?: string;
  goalClassName?: string;
}

const LABEL_SPACE = 22;

const BarChart: FC<BarChartProps> = props => {
  const {
    data,
    goal,
    barClassName,
    formatValue,
    ariaLabel,
    height = 180,
    labelEvery = 1,
    viewWidth: WIDTH = 600,
    labelClassName = "fill-muted",
    goalClassName = "stroke-slate-400",
  } = props;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const values = data.map(item => item.value ?? 0);
  const max = Math.max(...values, goal ?? 0) * 1.12 || 1;
  const chartHeight = height - LABEL_SPACE;
  const slot = WIDTH / data.length;
  const barWidth = Math.min(slot * 0.62, 36);
  const toY = (value: number) => chartHeight - (value / max) * chartHeight;
  const active = activeIndex === null ? null : data[activeIndex];

  return (
    <div className="relative" onMouseLeave={() => setActiveIndex(null)}>
      <svg viewBox={`0 0 ${WIDTH} ${height}`} className="h-auto w-full" role="img" aria-label={ariaLabel}>
        {data.map((item, index) => {
          const x = index * slot + (slot - barWidth) / 2;
          const isActive = index === activeIndex;
          const barHeight = item.value === null ? 4 : Math.max(chartHeight - toY(item.value), 2);

          return (
            <g key={`${item.label}-${index}`} onMouseEnter={() => setActiveIndex(index)}>
              <rect x={index * slot} y={0} width={slot} height={chartHeight} fill="transparent" />
              <rect
                x={x}
                y={chartHeight - barHeight}
                width={barWidth}
                height={barHeight}
                rx={Math.min(8, barWidth / 2.4)}
                className={item.value === null ? "fill-slate-300/40" : barClassName}
                opacity={item.muted && !isActive ? 0.55 : activeIndex !== null && !isActive ? 0.75 : 1}
              />
              <WillRender when={index % labelEvery === 0 || index === data.length - 1}>
                <text
                  x={index * slot + slot / 2}
                  y={height - 4}
                  textAnchor="middle"
                  className={`${labelClassName} text-[12px] font-medium`}
                >
                  {item.label}
                </text>
              </WillRender>
            </g>
          );
        })}
        <WillRender when={goal !== undefined}>
          <line
            x1={0}
            x2={WIDTH}
            y1={toY(goal ?? 0)}
            y2={toY(goal ?? 0)}
            strokeDasharray="6 6"
            className={goalClassName}
            strokeWidth={1.5}
          />
        </WillRender>
      </svg>

      <WillRender when={!!active}>
        <div
          className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{ left: `${(((activeIndex ?? 0) + 0.5) / data.length) * 100}%` }}
        >
          <div className="text-white/70">{active?.tooltipLabel || active?.label}</div>
          <div className="font-semibold">{active?.value === null ? "No data" : formatValue(active?.value ?? 0)}</div>
        </div>
      </WillRender>
    </div>
  );
};

export default BarChart;

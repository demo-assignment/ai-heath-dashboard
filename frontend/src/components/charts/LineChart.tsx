import { FC, useState } from "react";
import WillRender from "../will-render/WillRender";

export interface LinePoint {
  label: string;
  value: number | null;
}

interface LineChartProps {
  data: LinePoint[];
  strokeClassName: string;
  dotClassName: string;
  formatValue: (value: number) => string;
  ariaLabel: string;
  height?: number;
}

const WIDTH = 340;
const PADDING_X = 14;
const PADDING_TOP = 16;
const LABEL_SPACE = 22;

const LineChart: FC<LineChartProps> = props => {
  const { data, strokeClassName, dotClassName, formatValue, ariaLabel, height = 140 } = props;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const values = data.map(point => point.value).filter((value): value is number => value !== null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const chartBottom = height - LABEL_SPACE;
  const step = (WIDTH - PADDING_X * 2) / Math.max(data.length - 1, 1);

  const toX = (index: number) => PADDING_X + index * step;
  const toY = (value: number) => chartBottom - 8 - ((value - min) / range) * (chartBottom - PADDING_TOP - 8);

  // Break the line where data is missing instead of drawing a fake connection.
  const path = data.reduce((acc, point, index) => {
    if (point.value === null) return acc;
    const previous = data[index - 1];
    const command = index === 0 || previous?.value === null ? "M" : "L";
    return `${acc} ${command}${toX(index)},${toY(point.value)}`;
  }, "");

  const active = activeIndex === null ? null : data[activeIndex];

  return (
    <div className="relative" onMouseLeave={() => setActiveIndex(null)}>
      <svg viewBox={`0 0 ${WIDTH} ${height}`} className="h-auto w-full" role="img" aria-label={ariaLabel}>
        <path
          d={path}
          fill="none"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={strokeClassName}
        />
        {data.map((point, index) => (
          <g key={`${point.label}-${index}`} onMouseEnter={() => setActiveIndex(index)}>
            <rect x={toX(index) - step / 2} y={0} width={step} height={chartBottom} fill="transparent" />
            <WillRender when={point.value !== null}>
              <circle
                cx={toX(index)}
                cy={toY(point.value ?? 0)}
                r={index === activeIndex ? 6 : 4}
                className={`${dotClassName} stroke-white`}
                strokeWidth={2}
              />
            </WillRender>
            <text x={toX(index)} y={height - 4} textAnchor="middle" className="fill-muted text-[11px]">
              {point.label}
            </text>
          </g>
        ))}
      </svg>

      <WillRender when={!!active}>
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{ left: `${(toX(activeIndex ?? 0) / WIDTH) * 100}%` }}
        >
          <span className="text-white/70">{active?.label}: </span>
          <span className="font-semibold">{active?.value === null ? "No data" : formatValue(active?.value ?? 0)}</span>
        </div>
      </WillRender>
    </div>
  );
};

export default LineChart;

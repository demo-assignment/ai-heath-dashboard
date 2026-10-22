import { FC, ReactNode } from "react";
import Card from "@/components/card/Card";
import LineChart, { LinePoint } from "@/components/charts/LineChart";
import EmptyState from "@/components/state/EmptyState";

interface TrendCardProps {
  title: string;
  subtitle: string;
  summary: ReactNode;
  data: LinePoint[];
  strokeClassName: string;
  dotClassName: string;
  formatValue: (value: number) => string;
}

const TrendCard: FC<TrendCardProps> = props => {
  const { title, subtitle, summary, data, strokeClassName, dotClassName, formatValue } = props;
  const points = data.filter(point => point.value !== null).length;

  return (
    <Card title={title} subtitle={subtitle} className="h-full">
      {points >= 2 ? (
        <>
          <div className="mb-2 text-sm">{summary}</div>
          <LineChart
            data={data}
            strokeClassName={strokeClassName}
            dotClassName={dotClassName}
            formatValue={formatValue}
            ariaLabel={`${title} over 8 weeks`}
            height={180}
          />
        </>
      ) : (
        <EmptyState title="Not enough data" message="We need at least two weeks of data to show a trend." />
      )}
    </Card>
  );
};

export default TrendCard;

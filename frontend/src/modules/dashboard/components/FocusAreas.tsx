import { FC } from "react";
import Card from "@/components/card/Card";
import Mascot from "@/components/mascot/Mascot";
import EmptyState from "@/components/state/EmptyState";
import { TIP_COLORS } from "../constants/goal.const";
import type { FocusArea } from "@/types/health";

interface FocusAreasProps {
  focusAreas: FocusArea[];
}

const FocusAreas: FC<FocusAreasProps> = props => {
  const { focusAreas } = props;

  return (
    <Card className="h-full">
      <div className="mb-4 flex items-center gap-3">
        <Mascot mood="thinking" size={52} />
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight">Hearty's tips for this week</h2>
          <p className="text-sm text-muted">Your biggest gaps, largest first</p>
        </div>
      </div>
      {focusAreas.length ? (
        <ol className="space-y-3">
          {focusAreas.map((area, index) => (
            <li key={area.key} className="rounded-3xl bg-canvas/80 p-4">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${TIP_COLORS[area.key] || "bg-slate-100"}`}
                >
                  {index + 1}
                </span>
                <p className="font-semibold">{area.title}</p>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed">{area.suggestion}</p>
              <p className="mt-1 text-xs text-muted">{area.reason}</p>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title="You're hitting all your goals" message="Nice work. Keep the same routine this week." />
      )}
    </Card>
  );
};

export default FocusAreas;

import { FC } from "react";
import Card from "@/components/card/Card";
import EmptyState from "@/components/state/EmptyState";
import { formatDate, formatWeekday } from "@/utils/format";
import type { Workout } from "@/types/health";

interface RecentWorkoutsProps {
  workouts: Workout[];
}

const WORKOUT_STYLE: Record<string, { emoji: string; className: string }> = {
  Running: { emoji: "🏃‍♀️", className: "bg-orange-100" },
  Yoga: { emoji: "🧘‍♀️", className: "bg-violet-100" },
  Swimming: { emoji: "🏊‍♀️", className: "bg-sky-100" },
  "Strength training": { emoji: "🏋️‍♀️", className: "bg-rose-100" },
};

const RecentWorkouts: FC<RecentWorkoutsProps> = props => {
  const { workouts } = props;

  return (
    <Card title="Recent workouts" className="h-full">
      {workouts.length ? (
        <ul className="divide-y divide-line/70">
          {workouts.map(workout => (
            <li key={`${workout.date}-${workout.type}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg ${WORKOUT_STYLE[workout.type]?.className || "bg-slate-100"}`}
                aria-hidden
              >
                {WORKOUT_STYLE[workout.type]?.emoji || "💪"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{workout.type}</p>
                <p className="text-xs text-muted">
                  {formatWeekday(workout.date)}, {formatDate(workout.date)}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold">
                  {workout.distanceKm ? `${workout.distanceKm} km` : `${workout.durationMin} min`}
                </p>
                <p className="text-xs text-muted">{workout.caloriesBurned} kcal</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No workouts yet" message="Workouts you log will show up here." />
      )}
    </Card>
  );
};

export default RecentWorkouts;

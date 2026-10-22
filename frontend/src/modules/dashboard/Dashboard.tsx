import { FC, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { fetchDashboard } from "./dashboardSlice";
import DashboardSkeleton from "@/components/state/DashboardSkeleton";
import ErrorState from "@/components/state/ErrorState";
import EmptyState from "@/components/state/EmptyState";
import TopBar from "./components/TopBar";
import HeroCard from "./components/HeroCard";
import { renderGoalTiles } from "./components/GoalTiles";
import FocusAreas from "./components/FocusAreas";
import ActivityChart from "./components/ActivityChart";
import TrendCard from "./components/TrendCard";
import RecentWorkouts from "./components/RecentWorkouts";
import DataNotice from "./components/DataNotice";
import OfflineBanner from "./components/OfflineBanner";
import DataEntryModal from "@/modules/data-entry/DataEntryModal";
import ProfileModal from "@/modules/profile/ProfileModal";
import { formatChange, formatNumber } from "@/utils/format";

const Dashboard: FC = () => {
  const dispatch = useAppDispatch();
  const { data, status, errorMessage, isOffline, savedAt } = useAppSelector(state => state.dashboard);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchDashboard());
  }, [dispatch]);

  // While showing the saved copy, try again when the tab gets focus or the network comes back.
  useEffect(() => {
    if (!isOffline) return;
    const retry = () => dispatch(fetchDashboard());
    window.addEventListener("online", retry);
    window.addEventListener("focus", retry);
    return () => {
      window.removeEventListener("online", retry);
      window.removeEventListener("focus", retry);
    };
  }, [isOffline, dispatch]);

  const renderContent = () => {
    if (status === "failed") {
      return (
        <ErrorState
          title="Couldn't load your dashboard"
          message={errorMessage}
          onRetry={() => dispatch(fetchDashboard())}
        />
      );
    }
    if (!data) return <DashboardSkeleton />;
    // a retry keeps the current data on screen; status "loading" only shows in the banner button
    if (!data.daily.length) {
      return <EmptyState title="No health data yet" message="Connect a device or log your first day to get started." />;
    }

    const first = data.weekly[0];
    const last = data.weekly[data.weekly.length - 1];
    const weightChange = first.weightKg !== null && last.weightKg !== null ? last.weightKg - first.weightKg : null;
    const heartRateChange =
      first.avgRestingHeartRate !== null && last.avgRestingHeartRate !== null
        ? last.avgRestingHeartRate - first.avgRestingHeartRate
        : null;

    return (
      <div className="space-y-5">
        {isOffline && savedAt && (
          <OfflineBanner
            savedAt={savedAt}
            isRetrying={status === "loading"}
            onRetry={() => dispatch(fetchDashboard())}
          />
        )}

        <section aria-label="This week" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rise-in sm:col-span-2 xl:row-span-2">
            <HeroCard dashboard={data} />
          </div>
          {renderGoalTiles({ dashboard: data })}
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 lg:h-full">
            <ActivityChart daily={data.daily} weekly={data.weekly} stepGoal={data.goals.dailySteps} />
          </div>
          <FocusAreas focusAreas={data.focusAreas} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <TrendCard
            title="Resting heart rate"
            subtitle="Weekly average, lower usually means fitter"
            summary={
              <>
                <span className="font-display text-3xl font-extrabold">
                  {formatNumber(last.avgRestingHeartRate, 1)}
                </span>
                <span className="text-muted"> bpm · {formatChange(heartRateChange, 1)} since week 1</span>
              </>
            }
            data={data.weekly.map(week => ({ label: `W${week.week}`, value: week.avgRestingHeartRate }))}
            strokeClassName="stroke-rose-400"
            dotClassName="fill-rose-400"
            formatValue={value => `${formatNumber(value, 1)} bpm`}
          />
          <TrendCard
            title="Weight trend"
            subtitle={`Weekly weigh-in, goal ${data.goals.targetWeightKg} kg`}
            summary={
              <>
                <span className="font-display text-3xl font-extrabold">{formatNumber(last.weightKg, 1)}</span>
                <span className="text-muted"> kg · {formatChange(weightChange, 1)} kg since week 1</span>
              </>
            }
            data={data.weekly.map(week => ({ label: `W${week.week}`, value: week.weightKg }))}
            strokeClassName="stroke-emerald-500"
            dotClassName="fill-emerald-500"
            formatValue={value => `${formatNumber(value, 1)} kg`}
          />
          <div className="md:col-span-2 lg:col-span-1">
            <RecentWorkouts workouts={data.recentWorkouts} />
          </div>
        </div>

        <DataNotice dashboard={data} />
        {isEntryOpen && <DataEntryModal dashboard={data} onClose={() => setIsEntryOpen(false)} />}
        {isProfileOpen && <ProfileModal dashboard={data} onClose={() => setIsProfileOpen(false)} />}
      </div>
    );
  };

  const showTopBar = status !== "failed" && !!data?.daily.length;

  return (
    <>
      {/* Full-width bar so the blurred background spans the screen; the content inside stays aligned with the page. */}
      {showTopBar && data && (
        <div className="sticky top-0 z-40 border-b border-white/60 bg-canvas/85 backdrop-blur-md">
          <TopBar
            dashboard={data}
            onAddData={() => setIsEntryOpen(true)}
            onEditProfile={() => setIsProfileOpen(true)}
          />
        </div>
      )}
      <main className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${showTopBar ? "pb-6 pt-5" : "py-6"}`}>
        {renderContent()}
      </main>
    </>
  );
};

export default Dashboard;

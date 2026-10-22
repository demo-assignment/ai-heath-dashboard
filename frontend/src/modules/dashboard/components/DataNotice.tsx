import { FC } from "react";
import { formatDate } from "@/utils/format";
import type { Dashboard } from "@/types/health";

interface DataNoticeProps {
  dashboard: Dashboard;
}

const DataNotice: FC<DataNoticeProps> = props => {
  const { dashboard } = props;

  return (
    <footer className="space-y-1 pb-24 text-xs text-muted">
      <p>
        Device data up to {formatDate(dashboard.lastSyncedDate)}
        {dashboard.manualDates.length > 0 && `, plus ${dashboard.manualDates.length} day(s) you added`}.
      </p>
      {dashboard.missingDays.length > 0 && (
        <p>No data on {dashboard.missingDays.map(date => formatDate(date)).join(", ")}. Averages skip those days.</p>
      )}
      <p>Not tracked: {dashboard.notTracked.join(", ")}.</p>
      <p>Wellness information only, not medical advice. Demo data for a fictional user.</p>
    </footer>
  );
};

export default DataNotice;

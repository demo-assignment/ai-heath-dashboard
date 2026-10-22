import { FC, useEffect, useState } from "react";
import { useAppDispatch } from "@/app/hooks";
import Mascot from "@/components/mascot/Mascot";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { CloseIcon } from "@/components/icons/Icons";
import { dashboardUpdated } from "@/modules/dashboard/dashboardSlice";
import { resetEntries } from "@/services/entry.service";
import { clearDashboardCache } from "@/utils/dashboardCache";
import LogDayForm from "./components/LogDayForm";
import ExcelImport from "./components/ExcelImport";
import DeviceConnect from "./components/DeviceConnect";
import type { Dashboard } from "@/types/health";

type Tab = "form" | "excel";

interface DataEntryModalProps {
  dashboard: Dashboard;
  onClose: () => void;
}

const TABS: { value: Tab; label: string }[] = [
  { value: "form", label: "Log a day" },
  { value: "excel", label: "Upload Excel" },
];

const DataEntryModal: FC<DataEntryModalProps> = props => {
  const { dashboard, onClose } = props;
  const dispatch = useAppDispatch();
  useLockBodyScroll();
  const [tab, setTab] = useState<Tab>("form");
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const reset = async () => {
    if (!isConfirmingReset) {
      setIsConfirmingReset(true);
      return;
    }
    const result = await resetEntries().catch(() => null);
    if (result) {
      clearDashboardCache();
      dispatch(dashboardUpdated(result.dashboard));
    }
    setIsConfirmingReset(false);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Add your data"
        onClick={event => event.stopPropagation()}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl sm:max-w-xl sm:rounded-[32px]"
      >
        <header className="flex items-center gap-3 px-5 pt-5 sm:px-6">
          <Mascot mood="waving" size={48} />
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold">Add your data</h2>
            <p className="text-xs text-muted">Log a day by hand, or import many days from Excel.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-canvas">
            <CloseIcon />
          </button>
        </header>

        <div className="px-5 pt-4 sm:px-6" role="tablist">
          <div className="flex rounded-full bg-canvas p-1 text-sm font-semibold">
            {TABS.map(item => (
              <button
                key={item.value}
                role="tab"
                aria-selected={tab === item.value}
                onClick={() => setTab(item.value)}
                className={`flex-1 rounded-full py-2 ${tab === item.value ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          {tab === "form" ? <LogDayForm dashboard={dashboard} /> : <ExcelImport />}
          <DeviceConnect />
        </div>

        {(dashboard.manualDates.length > 0 || dashboard.isProfileEdited) && (
          <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs sm:px-6">
            <span className="text-muted">
              {dashboard.manualDates.length} day{dashboard.manualDates.length === 1 ? "" : "s"} added
              {dashboard.isProfileEdited ? " · profile edited" : ""}
            </span>
            <button
              onClick={reset}
              className={`rounded-full px-3 py-1.5 font-semibold ${isConfirmingReset ? "bg-rose-600 text-white" : "text-rose-600 hover:bg-rose-50"}`}
            >
              {isConfirmingReset ? "Click again to remove them" : "Reset to sample data"}
            </button>
          </footer>
        )}
      </section>
    </div>
  );
};

export default DataEntryModal;

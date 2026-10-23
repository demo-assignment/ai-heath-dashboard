import { toast } from "@/utils/toast";
import { FC, useState } from "react";
import Avatar from "boring-avatars";
import Mascot from "@/components/mascot/Mascot";
import { formatDate } from "@/utils/format";
import type { Dashboard } from "@/types/health";
import { useAuth } from "@/modules/auth/AuthProvider";

interface TopBarProps {
  dashboard: Dashboard;
  onAddData: () => void;
  onEditProfile: () => void;
}

const TopBar: FC<TopBarProps> = props => {
  const { dashboard, onAddData, onEditProfile } = props;
  const { persona } = dashboard;
  const { logout } = useAuth();
  const [logoutError, setLogoutError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const lastSync = dashboard.daily[dashboard.daily.length - 1]?.date;

  const signOut = async () => {
    setLogoutError("");
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      setLogoutError("We couldn't sign you out on the server. Please try again.");
      toast.error("We couldn't sign you out on the server. Please try again.");
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex shrink-0 items-center gap-2">
        <Mascot mood="happy" size={36} />
        <span className="hidden font-display text-2xl font-extrabold tracking-tight sm:inline">hearty</span>
      </div>
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
        {logoutError && (
          <span role="alert" className="hidden max-w-48 text-xs font-medium text-rose-700 sm:block">
            {logoutError}
          </span>
        )}
        <button
          onClick={onAddData}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-3.5 py-2.5 text-sm sm:px-4 font-semibold text-white shadow-sm hover:bg-brand"
        >
          <span className="text-base leading-none">+</span> Add data
        </button>
        {lastSync && (
          <span className="hidden items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-muted lg:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Data to {formatDate(lastSync)}
          </span>
        )}
        <button
          onClick={onEditProfile}
          title="Edit profile and goals"
          aria-label="Edit profile and goals"
          className="flex items-center gap-2.5 rounded-full bg-white/80 p-1 shadow-sm transition hover:bg-white hover:shadow sm:pr-4"
        >
          <Avatar
            name={persona.name}
            size={36}
            variant="beam"
            colors={["#1f6f5c", "#4ade9b", "#c6f36b", "#dff3ea", "#14211c"]}
          />
          <span className="hidden text-sm font-semibold sm:inline">{persona.name}</span>
        </button>
        <button
          onClick={() => void signOut()}
          disabled={isLoggingOut}
          className="whitespace-nowrap rounded-full px-2 py-2 text-sm font-semibold text-muted sm:px-3 transition hover:bg-white hover:text-ink disabled:opacity-60"
        >
          {isLoggingOut ? "Signing out…" : "Log out"}
        </button>
      </div>
      {logoutError && (
        <p role="alert" className="w-full text-xs font-medium text-rose-700 sm:hidden">
          {logoutError}
        </p>
      )}
    </header>
  );
};

export default TopBar;

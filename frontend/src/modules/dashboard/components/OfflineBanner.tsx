import { FC } from "react";
import Mascot from "@/components/mascot/Mascot";

interface OfflineBannerProps {
  savedAt: string;
  isRetrying: boolean;
  onRetry: () => void;
}

const OfflineBanner: FC<OfflineBannerProps> = props => {
  const { savedAt, isRetrying, onRetry } = props;
  const time = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(savedAt));

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-3xl bg-amber-100 px-4 py-3 text-sm text-amber-950"
    >
      <Mascot mood="concerned" size={36} />
      <p className="min-w-0 flex-1">
        <span className="font-semibold">Can't reach the server.</span> Showing your data saved on {time}. Adding data
        and Hearty need the server.
      </p>
      <button
        onClick={onRetry}
        disabled={isRetrying}
        className="rounded-full bg-amber-950 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        {isRetrying ? "Trying…" : "Try again"}
      </button>
    </div>
  );
};

export default OfflineBanner;

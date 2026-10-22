import { FC } from "react";

const DEVICES = ["Apple Health", "Google Health Connect", "Garmin", "Fitbit"];

// Placeholder for the real product direction: automatic syncing from a watch.
// It's clearly marked as coming soon and has no fake "connect" action.
const DeviceConnect: FC = () => {
  return (
    <div className="flex items-start gap-3 rounded-3xl border border-dashed border-line p-4">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-lg"
        aria-hidden
      >
        ⌚
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">Connect a device</p>
          <span className="rounded-full bg-lime px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
            Coming soon
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted">
          Sync steps, sleep and heart rate from your watch automatically, no typing needed.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {DEVICES.map(device => (
            <span key={device} className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-medium text-muted">
              {device}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeviceConnect;

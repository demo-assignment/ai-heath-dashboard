import { FC, useSyncExternalStore } from "react";
import { CloseIcon } from "@/components/icons/Icons";
import { dismissToast, getToasts, subscribeToasts, ToastType } from "@/utils/toast";

const STYLE: Record<ToastType, { box: string; dot: string }> = {
  success: { box: "border-emerald-200 bg-white text-ink", dot: "bg-emerald-500" },
  error: { box: "border-rose-200 bg-rose-50 text-rose-900", dot: "bg-rose-500" },
  info: { box: "border-line bg-white text-ink", dot: "bg-sky-500" },
};

const Toaster: FC = () => {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[80] flex flex-col items-center gap-2 px-4">
      {toasts.map(item => (
        <div
          key={item.id}
          role={item.type === "error" ? "alert" : "status"}
          className={`toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border py-2.5 pl-4 pr-2 text-sm font-medium shadow-lg shadow-emerald-950/10 ${STYLE[item.type].box}`}
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${STYLE[item.type].dot}`} aria-hidden />
          <span className="flex-1">{item.message}</span>
          <button
            onClick={() => dismissToast(item.id)}
            aria-label="Dismiss"
            className="rounded-full p-1.5 opacity-60 hover:bg-black/5 hover:opacity-100"
          >
            <CloseIcon width={14} height={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toaster;

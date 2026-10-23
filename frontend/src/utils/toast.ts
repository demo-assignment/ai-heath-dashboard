export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

type Listener = () => void;

const DURATION_MS: Record<ToastType, number> = { success: 3500, info: 3500, error: 6000 };
const MAX_TOASTS = 3;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<Listener>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

const emit = () => listeners.forEach(listener => listener());

export const dismissToast = (id: number) => {
  clearTimeout(timers.get(id));
  timers.delete(id);
  toasts = toasts.filter(toast => toast.id !== id);
  emit();
};

// A plain module store (not Redux) so hooks, services and components can all call it.
const show = (type: ToastType, message: string) => {
  const id = nextId++;
  // A success means the earlier problem is fixed, so drop old error toasts instead of showing both.
  if (type === "success") {
    toasts
      .filter(item => item.type === "error")
      .forEach(item => {
        clearTimeout(timers.get(item.id));
        timers.delete(item.id);
      });
    toasts = toasts.filter(item => item.type !== "error");
  }
  toasts = [...toasts, { id, type, message }].slice(-MAX_TOASTS);
  timers.set(
    id,
    setTimeout(() => dismissToast(id), DURATION_MS[type]),
  );
  emit();
  return id;
};

export const toast = {
  success: (message: string) => show("success", message),
  error: (message: string) => show("error", message),
  info: (message: string) => show("info", message),
};

export const subscribeToasts = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getToasts = () => toasts;

export const clearToasts = () => {
  timers.forEach(clearTimeout);
  timers.clear();
  toasts = [];
  emit();
};

"use client";

import * as React from "react";
import { AlertCircle, Check, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastVariant = "success" | "error" | "info";

export type ToastItem = {
  id: number;
  title: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  action?: { label: string; onClick: () => void };
  duration?: number;
};

export type ToastInput = Omit<ToastItem, "id">;

type Ctx = { toast: (t: ToastInput) => number; dismiss: (id: number) => void; dismissAll: () => void };
const ToastCtx = React.createContext<Ctx | null>(null);

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

function fa(value: number): string {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)] ?? d);
}

const icons: Record<ToastVariant, typeof Info> = {
  success: Check,
  error: AlertCircle,
  info: Info,
};

const iconTint: Record<ToastVariant, string> = {
  success: "bg-accent-soft text-accent-dark",
  error: "bg-destructive text-destructive-foreground",
  info: "bg-secondary text-secondary-foreground",
};

type Position = "bottom-start" | "bottom-end" | "top-start" | "top-end";

export interface ToastProviderProps {
  children: React.ReactNode;
  /** Visible at once; older ones are dropped. */
  max?: number;
  position?: Position;
}

/** Wrap your app once; then call `useToast().toast({...})` or the imperative `notify()` anywhere. */
export function ToastProvider({ children, max = 3, position = "bottom-start" }: ToastProviderProps) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const timers = React.useRef(new Map<number, number>());

  const dismiss = React.useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const dismissAll = React.useCallback(() => {
    setItems([]);
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
  }, []);

  const push = React.useCallback(
    (t: ToastInput) => {
      const id = Date.now() + Math.random();
      setItems((list) => [...list, { id, ...t }].slice(-max));
      timers.current.set(id, window.setTimeout(() => dismiss(id), t.duration ?? 4000));
      return id;
    },
    [dismiss, max],
  );

  // The imperative `notify()` bridge — same event name the old Batool toaster used.
  React.useEffect(() => {
    const onNotify = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; tone?: ToastVariant }>).detail;
      push({ title: detail.message, variant: detail.tone ?? "success" });
    };
    window.addEventListener("batool:toast", onNotify);
    return () => window.removeEventListener("batool:toast", onNotify);
  }, [push]);

  const posClass: Record<Position, string> = {
    "bottom-start": "bottom-4 start-4",
    "bottom-end": "bottom-4 end-4",
    "top-start": "top-4 start-4",
    "top-end": "top-4 end-4",
  };
  const fromTop = position.startsWith("top");

  return (
    <ToastCtx.Provider value={{ toast: push, dismiss, dismissAll }}>
      {children}
      <div
        aria-live="polite"
        className={cn(
          "pointer-events-none fixed z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2",
          posClass[position],
          fromTop ? "" : "flex-col-reverse",
        )}
      >
        {items.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => dismiss(t.id)} />
        ))}
        {items.length > 1 && (
          <button
            type="button"
            onClick={dismissAll}
            className="pointer-events-auto self-end rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            بستن همه ({fa(items.length)})
          </button>
        )}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): Ctx {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error("useToast باید داخل <ToastProvider> استفاده شود.");
  return ctx;
}

/**
 * Imperative toast, usable outside React. Dispatches a `batool:toast` window
 * event that the nearest <ToastProvider> picks up; a no-op when no provider
 * is mounted.
 */
export function notify(message: string, tone: ToastVariant = "success"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("batool:toast", { detail: { message, tone } }));
}

/** اعلان. The card itself; rendered by the provider, exported for previews. */
export function ToastCard({
  toast,
  onClose,
  className,
}: {
  toast: ToastInput;
  onClose?: () => void;
  className?: string;
}) {
  const Icon = icons[toast.variant ?? "info"];
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-popover px-3.5 py-3 text-popover-foreground shadow-elevated",
        className,
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
          iconTint[toast.variant ?? "info"],
        )}
      >
        <Icon className="size-3" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium leading-5">{toast.title}</p>
        {toast.description && <p className="text-xs text-muted-foreground">{toast.description}</p>}
      </div>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            onClose?.();
          }}
          className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs transition-colors hover:bg-accent-soft"
        >
          {toast.action.label}
        </button>
      )}
      {onClose && (
        <button
          type="button"
          aria-label="بستن"
          onClick={onClose}
          className="-me-1 -mt-0.5 cursor-pointer rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}
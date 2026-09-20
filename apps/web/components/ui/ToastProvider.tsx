"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Toast = { id: number; tone: "success" | "error"; message: string };
const ToastContext = createContext<(message: string) => void>(() => undefined);

export function notify(message: string, tone: Toast["tone"] = "success"): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("batool:toast", { detail: { message, tone } }));
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; tone: Toast["tone"] }>).detail;
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, ...detail }]);
      window.setTimeout(
        () => setToasts((current) => current.filter((toast) => toast.id !== id)),
        3500,
      );
    };
    window.addEventListener("batool:toast", onToast);
    return () => window.removeEventListener("batool:toast", onToast);
  }, []);
  return (
    <ToastContext.Provider value={(message) => notify(message)}>
      <>
        {children}
        <div className="fixed bottom-4 left-4 z-50 flex max-w-sm flex-col gap-2" aria-live="polite">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`rounded-xl px-4 py-3 text-sm font-bold text-white shadow-lg ${toast.tone === "error" ? "bg-danger" : "bg-accent-dark"}`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      </>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

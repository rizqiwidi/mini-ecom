"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ToastVariant = "info" | "success" | "error" | "warning";

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastItem = ToastInput & { id: string };

type ToastContextValue = {
  push: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_DURATION = 4500;

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback(
    ({ title, description, variant = "info", durationMs = DEFAULT_DURATION }: ToastInput) => {
      if (!title?.trim()) return;
      const id = generateId();
      setToasts((current) => [...current, { id, title: title.trim(), description, variant, durationMs }]);
      const timer = setTimeout(() => remove(id), durationMs);
      timers.current[id] = timer;
    },
    [remove]
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-6 z-[9999] flex justify-center px-4 sm:justify-end sm:px-6">
        <div className="flex w-full max-w-sm flex-col gap-3">
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={() => remove(toast.id)} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

function variantClasses(variant: ToastVariant) {
  switch (variant) {
    case "success":
      return "border-emerald-400/40 bg-emerald-500/20 text-emerald-100";
    case "error":
      return "border-rose-400/40 bg-rose-500/20 text-rose-100";
    case "warning":
      return "border-amber-400/40 bg-amber-500/20 text-amber-100";
    default:
      return "border-indigo-400/40 bg-indigo-500/20 text-indigo-100";
  }
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const { title, description, variant = "info" } = toast;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg shadow-black/20 backdrop-blur ${variantClasses(variant)}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold leading-tight">{title}</p>
          {description && <p className="text-xs leading-snug text-white/80">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full border border-white/20 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:border-white/40 hover:text-white"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}


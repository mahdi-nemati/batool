"use client";

import { cn } from "@/lib/cn";

const percentFormat = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });

export function Progress({
  value,
  max = 100,
  label,
  showPercent = true,
  className,
  indicatorClassName = "bg-primary",
}: {
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
  className?: string;
  indicatorClassName?: string;
}) {
  const safeMax = Math.max(max, 0);
  const safeValue = Math.min(Math.max(value, 0), safeMax || 0);
  const percent = safeMax === 0 ? 0 : (safeValue / safeMax) * 100;
  const accessibleLabel = label ?? "پیشرفت";

  return (
    <div dir="rtl" className={cn("flex w-full flex-col gap-1.5", className)}>
      {label || showPercent ? (
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          {label ? <span>{label}</span> : <span />}
          {showPercent ? <span className="tabular-nums">{percentFormat.format(percent)}٪</span> : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-label={accessibleLabel}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        className="flex h-2 w-full justify-start overflow-hidden rounded-full bg-secondary"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none", indicatorClassName)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

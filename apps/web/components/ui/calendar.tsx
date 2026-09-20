"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  gregorianDateToJalaliInput,
  jalaliInputToGregorian,
  jalaliMonthDays,
  jalaliMonthLabel,
} from "@/lib/formatting/jalali";

const weekdays = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

function dateToInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function activeJalali(date: Date): [number, number, number] {
  const input = gregorianDateToJalaliInput(dateToInput(date));
  const [jy = 1405, jm = 1, jd = 1] = (input || "1405/01/01").split("/").map(Number);
  return [jy, jm, jd];
}

export interface CalendarProps {
  value?: Date | null;
  defaultValue?: Date | null;
  onChange?: (date: Date) => void;
  /** Disable dates before/after these. */
  min?: Date;
  max?: Date;
  /** Grey out Fridays (default true). */
  markWeekend?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * تقویم شمسی. Renders a Jalali month; weeks start on شنبه, Fridays are
 * marked, today gets a ring. Values are plain JS Dates (UTC-noon, the app
 * convention) so the rest of the app stays Gregorian-agnostic.
 */
export function Calendar({
  value,
  defaultValue = null,
  onChange,
  min,
  max,
  markWeekend = true,
  compact,
  className,
}: CalendarProps) {
  const [internal, setInternal] = React.useState<Date | null>(defaultValue);
  const selected = value === undefined ? internal : value;
  const today = React.useMemo(() => new Date(), []);
  const [initialJy, initialJm] = activeJalali(selected ?? today);
  const [view, setView] = React.useState({ jy: initialJy, jm: initialJm });

  const first = jalaliInputToGregorian(`${view.jy}/${view.jm}/1`);
  const leading = first === null ? 0 : (new Date(`${first}T12:00:00Z`).getUTCDay() + 1) % 7;
  const days = jalaliMonthDays(view.jy, view.jm);
  const cells = Array.from({ length: leading + days }, (_, i) =>
    i < leading ? null : i - leading + 1,
  );
  const monthLabel = jalaliMonthLabel(view.jy, view.jm);

  function move(delta: number) {
    setView((v) => {
      let jm = v.jm + delta;
      let jy = v.jy;
      if (jm < 1) {
        jm = 12;
        jy -= 1;
      }
      if (jm > 12) {
        jm = 1;
        jy += 1;
      }
      return { jy, jm };
    });
  }

  function pick(d: number) {
    const gregorian = jalaliInputToGregorian(`${view.jy}/${view.jm}/${d}`);
    if (gregorian === null) return;
    const date = new Date(`${gregorian}T12:00:00Z`);
    if (value === undefined) setInternal(date);
    onChange?.(date);
  }

  const nav =
    "flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent-soft hover:text-foreground";

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-3",
        compact ? "w-[220px]" : "w-[260px]",
        className,
      )}
    >
      <div className="flex items-center justify-between px-1">
        <span className={cn("font-semibold", compact ? "text-xs" : "text-sm")}>{monthLabel}</span>
        <div className="flex gap-0.5">
          <button type="button" aria-label="ماه قبل" onClick={() => move(-1)} className={nav}>
            <ChevronRight className="size-4" />
          </button>
          <button type="button" aria-label="ماه بعد" onClick={() => move(1)} className={nav}>
            <ChevronLeft className="size-4" />
          </button>
        </div>
      </div>
      <div
        className={cn(
          "mt-2 grid grid-cols-7 overflow-hidden text-center",
          compact ? "gap-px text-[10px]" : "gap-0.5 text-[11px]",
        )}
        role="grid"
      >
        {weekdays.map((d) => (
          <span key={d} className="py-1 text-muted-foreground/80" aria-hidden>
            {d}
          </span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={`e${i}`} className={compact ? "h-6" : "h-8"} />;
          const gregorian = jalaliInputToGregorian(`${view.jy}/${view.jm}/${d}`);
          const cellDate = gregorian === null ? null : new Date(`${gregorian}T12:00:00Z`);
          const isSel =
            selected !== null &&
            cellDate !== null &&
            dateToInput(selected) === cellDate.toISOString().slice(0, 10);
          const isToday =
            cellDate !== null && dateToInput(today) === cellDate.toISOString().slice(0, 10);
          const fri = i % 7 === 6;
          const disabled =
            (min !== undefined && cellDate !== null && cellDate < min) ||
            (max !== undefined && cellDate !== null && cellDate > max);
          return (
            <button
              key={d}
              type="button"
              role="gridcell"
              aria-selected={isSel}
              aria-label={`${d.toLocaleString("fa-IR")} ${monthLabel}`}
              disabled={!!disabled}
              onClick={() => pick(d)}
              className={cn(
                "flex w-full min-w-0 items-center justify-center rounded-md leading-none whitespace-nowrap tabular-nums transition-colors",
                compact ? "h-6" : "h-8",
                isSel && "bg-primary font-semibold text-primary-foreground",
                !isSel && isToday && "ring-1 ring-inset ring-foreground/40",
                !isSel && markWeekend && fri && "text-muted-foreground/60",
                !isSel && !disabled && "cursor-pointer hover:bg-accent-soft hover:text-foreground",
                disabled && "cursor-not-allowed opacity-30",
              )}
            >
              {d.toLocaleString("fa-IR")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

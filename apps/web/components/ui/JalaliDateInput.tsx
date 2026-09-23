"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  gregorianDateToJalaliInput,
  formatJalaliDateLong,
  jalaliInputToGregorian,
  jalaliMonthDays,
  jalaliMonthLabel,
} from "@/lib/formatting/jalali";

const weekdays = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

function parseJalali(value: string): [number, number, number] {
  const [year = "1405", month = "1", day = "1"] = value.split("/");
  return [Number(year), Number(month), Number(day)];
}

export function JalaliDateInput({
  value,
  onChange,
  id,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const selected = value ? gregorianDateToJalaliInput(value) : "";
  const selectedLabel = value ? formatJalaliDateLong(value) : "";
  const [year, month, day] = parseJalali(
    selected || gregorianDateToJalaliInput(new Date().toISOString().slice(0, 10)),
  );
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ year, month });
  useEffect(() => {
    if (!open) setView({ year, month });
  }, [open, year, month]);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);
  const days = jalaliMonthDays(view.year, view.month);
  const firstGregorian = jalaliInputToGregorian(`${view.year}/${view.month}/1`);
  const leading =
    firstGregorian === null ? 0 : (new Date(`${firstGregorian}T12:00:00Z`).getUTCDay() + 1) % 7;
  const cells = useMemo(
    () =>
      Array.from({ length: leading + days }, (_, index) =>
        index < leading ? null : index - leading + 1,
      ),
    [leading, days],
  );
  function shift(delta: number) {
    const index = view.year * 12 + view.month - 1 + delta;
    setView({ year: Math.floor(index / 12), month: (index % 12) + 1 });
  }
  return (
    <div ref={root} className="relative" dir="rtl">
      <button
        type="button"
        id={id}
        onClick={() => setOpen((current) => !current)}
        className={`${className ?? "h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-body text-foreground"} text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 motion-reduce:transition-none`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open && id ? `${id}-popover` : undefined}
        aria-label={ariaLabel}
      >
        {selectedLabel || "انتخاب تاریخ"}
      </button>
      {open ? (
        <div
          id={id ? `${id}-popover` : undefined}
          role="dialog"
          aria-label="انتخاب تاریخ"
          className="absolute start-0 z-30 mt-2 w-72 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-elevated transition-opacity duration-200 motion-reduce:transition-none"
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => shift(1)} aria-label="ماه بعد" className="rounded-md p-1 text-muted-foreground hover:bg-accent-soft hover:text-foreground">
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <b className="text-title">{jalaliMonthLabel(view.year, view.month)}</b>
            <button type="button" onClick={() => shift(-1)} aria-label="ماه قبل" className="rounded-md p-1 text-muted-foreground hover:bg-accent-soft hover:text-foreground">
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-label text-muted-foreground">
            {weekdays.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1 text-center">
            {cells.map((cell, index) =>
              cell === null ? (
                <span key={`empty-${index}`} />
              ) : (
                <button
                  type="button"
                  key={cell}
                  onClick={() => {
                    const gregorian = jalaliInputToGregorian(`${view.year}/${view.month}/${cell}`);
                    if (gregorian !== null) {
                      onChange(gregorian);
                      setOpen(false);
                    }
                  }}
                  aria-label={`${cell.toLocaleString("fa-IR")} ${jalaliMonthLabel(view.year, view.month)}`}
                  aria-pressed={view.year === year && view.month === month && cell === day}
                  className={`rounded-lg px-1 py-1 text-body transition-colors hover:bg-accent-soft hover:text-foreground motion-reduce:transition-none ${view.year === year && view.month === month && cell === day ? "bg-accent text-accent-foreground" : ""}`}
                >
                  {cell.toLocaleString("fa-IR")}
                </button>
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

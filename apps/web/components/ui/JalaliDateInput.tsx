"use client";

import { useEffect, useMemo, useState } from "react";
import {
  gregorianDateToJalaliInput,
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
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className: string;
}) {
  const selected = gregorianDateToJalaliInput(value);
  const [year, month, day] = parseJalali(
    selected || gregorianDateToJalaliInput(new Date().toISOString().slice(0, 10)),
  );
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ year, month });
  useEffect(() => {
    if (!open) setView({ year, month });
  }, [open, year, month]);
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
    <div className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen((current) => !current)}
        className={`${className} text-right`}
        aria-expanded={open}
      >
        {selected || "انتخاب تاریخ شمسی"}
      </button>
      {open ? (
        <div
          className="absolute z-30 mt-2 w-72 rounded-2xl border border-line bg-panel p-3 shadow-xl"
          dir="rtl"
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => shift(1)} aria-label="ماه بعد">
              ›
            </button>
            <b>{jalaliMonthLabel(view.year, view.month)}</b>
            <button type="button" onClick={() => shift(-1)} aria-label="ماه قبل">
              ‹
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
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
                  className={`rounded-lg px-1 py-1 text-sm hover:bg-accent/10 ${view.year === year && view.month === month && cell === day ? "bg-accent text-white" : ""}`}
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

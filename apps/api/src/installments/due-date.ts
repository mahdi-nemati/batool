// Deterministic Jalali monthly-occurrence math with Gregorian UTC persistence.
// `dueDayOfMonth` is a Jalali day. Occurrence 1 is in the Jalali month of
// `startDate`; each subsequent occurrence advances one Jalali month.
//
// Nonexistent due day policy: if the due day does not exist in a given month
// (e.g. 31 in a 30-day month, or 29/30/31 in February), it is CLAMPED to that
// month's last day. February 29 clamps to 28 in non-leap years and stays 29 in
// leap years. This is a single, predictable rule used consistently everywhere.

export function daysInMonthUtc(year: number, monthIndex0: number): number {
  // Date.UTC(year, month+1, 0) => last day of `month`.
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

const TEHRAN = "Asia/Tehran";
const jalaliParts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
  timeZone: TEHRAN,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function calendarParts(date: Date): { year: number; month: number; day: number } {
  const values = Object.fromEntries(
    jalaliParts.formatToParts(date).map((part) => [part.type, Number(part.value)]),
  );
  return { year: values.year ?? NaN, month: values.month ?? NaN, day: values.day ?? NaN };
}

function shiftJalaliMonth(year: number, month: number, delta: number) {
  const index = year * 12 + month - 1 + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function gregorianForJalaliDate(year: number, month: number, day: number): Date | null {
  const estimate = Date.UTC(year + 621, 2, 21, 12);
  for (let offset = -370; offset <= 370; offset += 1) {
    const candidate = new Date(estimate + offset * 86400000);
    const parts = calendarParts(candidate);
    if (parts.year === year && parts.month === month && parts.day === day) {
      return new Date(
        Date.UTC(candidate.getUTCFullYear(), candidate.getUTCMonth(), candidate.getUTCDate()),
      );
    }
  }
  return null;
}

/** Scheduled due date (UTC midnight) for a 1-based Jalali occurrence. */
export function dueDateForOccurrence(
  startDate: Date,
  dueDayOfMonth: number,
  occurrenceNo: number,
): Date {
  const base = calendarParts(startDate);
  const target = shiftJalaliMonth(base.year, base.month, occurrenceNo - 1);
  for (let day = Math.min(dueDayOfMonth, 31); day >= 1; day -= 1) {
    const resolved = gregorianForJalaliDate(target.year, target.month, day);
    if (resolved !== null) return resolved;
  }
  throw new Error("Unable to resolve Jalali installment due date");
}

export type OccurrenceStatus = "UPCOMING" | "DUE" | "OVERDUE";

/** Compare a scheduled due date to "now" at day granularity (UTC calendar day). */
export function occurrenceStatus(dueDate: Date, now: Date = new Date()): OccurrenceStatus {
  const dueDay = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (dueDay < today) {
    return "OVERDUE";
  }
  if (dueDay === today) {
    return "DUE";
  }
  return "UPCOMING";
}

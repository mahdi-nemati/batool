// Deterministic Gregorian (UTC) monthly-occurrence math for installments.
// Occurrence 1 (1-based) is scheduled in the calendar month of `startDate`; each
// subsequent occurrence is one month later on `dueDayOfMonth`.
//
// Nonexistent due day policy: if the due day does not exist in a given month
// (e.g. 31 in a 30-day month, or 29/30/31 in February), it is CLAMPED to that
// month's last day. February 29 clamps to 28 in non-leap years and stays 29 in
// leap years. This is a single, predictable rule used consistently everywhere.

export function daysInMonthUtc(year: number, monthIndex0: number): number {
  // Date.UTC(year, month+1, 0) => last day of `month`.
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

/** Scheduled due date (UTC midnight) for a 1-based occurrence. */
export function dueDateForOccurrence(
  startDate: Date,
  dueDayOfMonth: number,
  occurrenceNo: number,
): Date {
  const baseYear = startDate.getUTCFullYear();
  const baseMonth = startDate.getUTCMonth();
  const totalMonths = baseMonth + (occurrenceNo - 1);
  const year = baseYear + Math.floor(totalMonths / 12);
  const month = ((totalMonths % 12) + 12) % 12;
  const day = Math.min(dueDayOfMonth, daysInMonthUtc(year, month));
  return new Date(Date.UTC(year, month, day));
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

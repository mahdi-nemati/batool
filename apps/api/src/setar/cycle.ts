// Deterministic 4-session-cycle semantics for Setar.
//
// Sessions carry a 1-based, never-reused global sequence number (sessionNo).
// The owning cycle of a session is fixed by its position in that sequence:
//   cycle 1 = sessions 1-4, cycle 2 = sessions 5-8, cycle 3 = sessions 9-12, ...
//
// Payments are strictly in-order: a payment is only possible for the EARLIEST
// un-paid cycle once that cycle holds 4 sessions. Because session numbers are
// never reused and a cycle owns exactly 4 slots, this guarantees paid cycles
// always form a prefix {1..paidCycleCount}. This makes the current-cycle
// progress and the exact target cycle derivable from just the total session
// count and the paid-cycle count — with no mutable counters to drift.
//
// Recording more sessions while a prior cycle is unpaid is ALLOWED (the spec
// requires this case to stay deterministic): the extra sessions belong to later
// cycles (e.g. sessions 5-6 with cycle 1 unpaid belong to cycle 2). The unpaid
// obligation keeps its identity and is never erased or reset.

export const SESSIONS_PER_PAYMENT = 4;

export function cycleNoForSession(sessionNo: number): number {
  return Math.floor((sessionNo - 1) / SESSIONS_PER_PAYMENT) + 1;
}

/** Session numbers owned by a 1-based cycle. */
export function sessionRangeForCycle(cycleNo: number): { start: number; end: number } {
  const start = (cycleNo - 1) * SESSIONS_PER_PAYMENT + 1;
  return { start, end: start + SESSIONS_PER_PAYMENT - 1 };
}

export interface CycleProgress {
  currentCycleNo: number;
  sessionsInCurrentCycle: number;
  sessionsRemainingUntilTuition: number;
  tuitionPayable: boolean;
}

/** Derive the current-cycle state from total sessions and paid cycles. */
export function cycleProgress(totalSessions: number, paidCycleCount: number): CycleProgress {
  const currentCycleNo = paidCycleCount + 1;
  const accrued = totalSessions - paidCycleCount * SESSIONS_PER_PAYMENT;
  const sessionsInCurrentCycle = Math.min(SESSIONS_PER_PAYMENT, Math.max(0, accrued));
  const payable = accrued >= SESSIONS_PER_PAYMENT;
  return {
    currentCycleNo,
    sessionsInCurrentCycle,
    sessionsRemainingUntilTuition: payable ? 0 : SESSIONS_PER_PAYMENT - sessionsInCurrentCycle,
    tuitionPayable: payable,
  };
}

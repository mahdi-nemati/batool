// Phase 7 — Setar (three-string Persian instrument) lessons & tuition.
//
// Fixed MVP cycle: one tuition payment per SESSIONS_PER_PAYMENT completed
// sessions (4). Cycle numbering is derived from the global session sequence:
//   cycleNo = floor((sessionNo - 1) / 4) + 1  (cycle 1 = sessions 1-4, ...)
// Payments are strictly in-order: a payment is only possible for the earliest
// un-paid cycle once it has 4 sessions, so paid cycles always form a prefix.

export const SESSIONS_PER_PAYMENT = 4;

export interface SetarProfileDto {
  id: string;
  /** Current tuition in Toman. Historical payments keep their own snapshot. */
  tuitionAmountToman: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Derived status for the current profile (never stored — always computed). */
export interface SetarStatusDto {
  /** null when the user has not created a Setar profile yet. */
  profile: SetarProfileDto | null;
  /** Total completed sessions ever recorded. */
  totalSessions: number;
  /** Number of fully-paid 4-session cycles (always a prefix 1..paidCycleCount). */
  paidCycleCount: number;
  /** The cycle tuition is currently being accrued for (paid cycles + 1). */
  currentCycleNo: number;
  /** Sessions completed inside the current cycle (capped at SESSIONS_PER_PAYMENT). */
  sessionsInCurrentCycle: number;
  /** Sessions needed before the current cycle becomes payable. */
  sessionsRemainingUntilTuition: number;
  /** True when the current cycle is complete and tuition may be paid. */
  tuitionPayable: boolean;
}

export interface SetarSessionDto {
  id: string;
  /** 1-based global sequence (never reused). */
  sessionNo: number;
  occurredAt: string;
  description: string | null;
  createdAt: string;
}

export interface SetarTuitionPaymentDto {
  id: string;
  /** The 4-session cycle this payment settled (1-based). */
  cycleNo: number;
  /** SessionNos covered by this cycle: (cycleNo-1)*4+1 ... cycleNo*4. */
  sessionStartNo: number;
  sessionEndNo: number;
  /** Historical snapshot of what was actually paid. */
  amountToman: number;
  paidAt: string;
  description: string | null;
  financialTransactionId: string;
  createdAt: string;
}

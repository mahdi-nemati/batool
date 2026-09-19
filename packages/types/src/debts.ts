import type { AssetRefDto } from "./finance";

export const CounterpartyKind = {
  EXTERNAL: "EXTERNAL",
  USER: "USER",
} as const;
export type CounterpartyKind = (typeof CounterpartyKind)[keyof typeof CounterpartyKind];

/** Obligation direction from the OWNER's point of view. */
export const DebtDirection = {
  OWES_ME: "OWES_ME", // counterparty owes the owner (receivable)
  I_OWE: "I_OWE", // owner owes the counterparty (payable)
} as const;
export type DebtDirection = (typeof DebtDirection)[keyof typeof DebtDirection];

export const DebtEntryKind = {
  OBLIGATION: "OBLIGATION",
  SETTLEMENT: "SETTLEMENT",
} as const;
export type DebtEntryKind = (typeof DebtEntryKind)[keyof typeof DebtEntryKind];

/** Derived view of a relationship: explicit direction + magnitude (no ambiguity). */
export const DebtViewDirection = {
  OWES_ME: "OWES_ME",
  I_OWE: "I_OWE",
  SETTLED: "SETTLED",
} as const;
export type DebtViewDirection = (typeof DebtViewDirection)[keyof typeof DebtViewDirection];

export interface CounterpartyDto {
  id: string;
  kind: CounterpartyKind;
  name: string;
  linkedUsername: string | null;
  archived: boolean;
  /** Signed net from the owner's view (positive = they owe me). Internal use. */
  netToman: number;
  direction: DebtViewDirection;
  /** Absolute outstanding amount (Toman). */
  outstandingToman: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionDto {
  id: string;
  username: string;
  nickname: string;
  /** The counterparty row in the CURRENT user's context for that connected user. */
  counterpartyId: string;
  createdAt: string;
}

export interface DebtEventDto {
  id: string;
  kind: DebtEntryKind;
  direction: DebtDirection;
  amountToman: number;
  description: string | null;
  occurredAt: string;
  createdAt: string;
  /** Participant share this receivable came from (split expense), if any. */
  sourceShareId: string | null;
  /** Asset the settlement cash moved through (SETTLEMENT only). */
  asset: AssetRefDto | null;
}

export interface DebtSummaryEntryDto {
  counterpartyId: string;
  name: string;
  kind: CounterpartyKind;
  direction: DebtViewDirection;
  outstandingToman: number;
}

export interface DebtSummaryDto {
  totalReceivableToman: number;
  totalPayableToman: number;
  /** Signed: positive = net receivable overall. */
  netToman: number;
  counterparties: DebtSummaryEntryDto[];
}

export interface CounterpartyHistoryDto {
  counterparty: CounterpartyDto;
  events: DebtEventDto[];
}

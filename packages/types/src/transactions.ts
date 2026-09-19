import type { AssetRefDto } from "./finance";

export const CategoryType = {
  INCOME: "INCOME",
  EXPENSE: "EXPENSE",
} as const;

export type CategoryType = (typeof CategoryType)[keyof typeof CategoryType];

export interface CategoryDto {
  id: string;
  name: string;
  type: CategoryType;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Minimal category reference embedded in a transaction (name survives soft-delete). */
export interface CategoryRefDto {
  id: string;
  name: string;
  type: CategoryType;
  isActive: boolean;
}

export const TransactionType = {
  INCOME: "INCOME",
  EXPENSE: "EXPENSE",
} as const;

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

/** A split-expense share. Exactly one has isOwner = true. */
export interface TransactionShareDto {
  id: string;
  isOwner: boolean;
  label: string | null;
  amountToman: number;
}

export interface FinancialTransactionDto {
  id: string;
  type: TransactionType;
  /** Full cash effect on the source asset. */
  amountToman: number;
  category: CategoryRefDto;
  asset: AssetRefDto;
  description: string | null;
  occurredAt: string;
  createdAt: string;
  /** The user's personal expense (owner share). For income this equals amountToman. */
  personalToman: number;
  /** Participant shares (Phase-4 debt foundation). Empty for non-split entries. */
  participantShares: TransactionShareDto[];
  isSplit: boolean;
}

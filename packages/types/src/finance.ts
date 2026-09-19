export const AssetKind = {
  BANK: "BANK",
  FUND: "FUND",
  GOLD: "GOLD",
  USD: "USD",
} as const;

export type AssetKind = (typeof AssetKind)[keyof typeof AssetKind];

/** A resolved asset endpoint shown to the UI (with a human-readable name). */
export interface AssetRefDto {
  kind: AssetKind;
  id: string;
  name: string;
}

export interface BankAccountDto {
  id: string;
  name: string;
  isActive: boolean;
  // Derived from the ledger. Exposed as a JSON-safe number (Toman is integer).
  balanceToman: number;
  createdAt: string;
  updatedAt: string;
}

export interface FundDto {
  id: string;
  name: string;
  // Optional savings goal (not a balance).
  goalToman: number | null;
  balanceToman: number;
  createdAt: string;
  updatedAt: string;
}

// Gold/USD balances are exact decimals; serialised as strings to avoid float loss.
export interface GoldWalletDto {
  id: string;
  balanceGram: string;
  createdAt: string;
}

export interface UsdWalletDto {
  id: string;
  balanceUsd: string;
  createdAt: string;
}

export interface TransferDto {
  id: string;
  source: AssetRefDto;
  destination: AssetRefDto;
  amountToman: number | null;
  amountGram: string | null;
  amountUsd: string | null;
  description: string;
  occurredAt: string;
  createdAt: string;
}

import { AssetKind } from "@batool/types";
import type {
  ApiResponse,
  BankAccountDto,
  FundDto,
  GoldWalletDto,
  TransferDto,
  UsdWalletDto,
} from "@batool/types";
import { ApiClientError, SERVER_API_ORIGIN, request } from "./client";

export interface CreateBankAccountInput {
  name: string;
  initialBalanceToman: number | string;
}

export interface CreateFundInput {
  name: string;
  goalToman?: number | string;
}

export interface CreateTransferInput {
  sourceKind: AssetKind;
  sourceId?: string;
  destinationKind: AssetKind;
  destinationId?: string;
  amountToman?: number | string;
  amountGram?: string;
  amountUsd?: string;
}

export interface AssetsOverview {
  bankAccounts: BankAccountDto[];
  funds: FundDto[];
  gold: GoldWalletDto;
  usd: UsdWalletDto;
  transfers: TransferDto[];
}

export interface WalletOverview {
  accounts: BankAccountDto[];
  transfers: TransferDto[];
  // Native-currency balance (grams / dollars) as an exact decimal string. The
  // wallet value is NEVER a Toman figure.
  balance: string;
  createdAt: string;
}

const unwrap = <T>(p: Promise<ApiResponse<T>>) => p.then((r) => r.data);

function cookieOpts(cookieHeader: string | undefined) {
  const headers =
    cookieHeader !== undefined && cookieHeader.length > 0 ? { cookie: cookieHeader } : undefined;
  return {
    baseUrl: SERVER_API_ORIGIN,
    method: "GET" as const,
    cache: "no-store" as const,
    ...(headers ? { headers } : {}),
  };
}

// Browser-side calls (credentials: include sends the session cookie).
export const listBankAccounts = () =>
  unwrap(request<ApiResponse<BankAccountDto[]>>("/bank-accounts"));
export const createBankAccount = (body: CreateBankAccountInput) =>
  unwrap(
    request<ApiResponse<BankAccountDto>>("/bank-accounts", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
export const listFunds = () => unwrap(request<ApiResponse<FundDto[]>>("/funds"));
export const createFund = (body: CreateFundInput) =>
  unwrap(request<ApiResponse<FundDto>>("/funds", { method: "POST", body: JSON.stringify(body) }));
export const createTransfer = (body: CreateTransferInput) =>
  unwrap(
    request<ApiResponse<TransferDto>>("/transfers", { method: "POST", body: JSON.stringify(body) }),
  );
export const listTransfers = (kind?: AssetKind) =>
  unwrap(
    request<ApiResponse<TransferDto[]>>(`/transfers${kind !== undefined ? `?kind=${kind}` : ""}`),
  );

/**
 * Server-side overview load for React Server Components, forwarding the caller's
 * session cookie. Returns null when unauthenticated (401).
 */
export async function getAssetsOverviewServer(
  cookieHeader: string | undefined,
): Promise<AssetsOverview | null> {
  const opts = cookieOpts(cookieHeader);
  try {
    const [bankAccounts, funds, gold, usd, transfers] = await Promise.all([
      unwrap(request<ApiResponse<BankAccountDto[]>>("/bank-accounts", opts)),
      unwrap(request<ApiResponse<FundDto[]>>("/funds", opts)),
      unwrap(request<ApiResponse<GoldWalletDto>>("/assets/gold", opts)),
      unwrap(request<ApiResponse<UsdWalletDto>>("/assets/usd", opts)),
      unwrap(request<ApiResponse<TransferDto[]>>("/transfers", opts)),
    ]);
    return { bankAccounts, funds, gold, usd, transfers };
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

/**
 * Server-side load for a Gold/USD wallet page: bank accounts (valid counterparties
 * for buy/sell), the wallet's own movement history (transfers involving it) and its
 * native-currency balance. Returns null when unauthenticated (401).
 */
export async function getWalletOverviewServer(
  cookieHeader: string | undefined,
  kind: "GOLD" | "USD",
): Promise<WalletOverview | null> {
  const opts = cookieOpts(cookieHeader);
  const path = kind === AssetKind.GOLD ? "/assets/gold" : "/assets/usd";
  try {
    const [wallet, accounts, transfers] = await Promise.all([
      kind === AssetKind.GOLD
        ? unwrap(request<ApiResponse<GoldWalletDto>>(path, opts)).then((g) => ({
            balance: g.balanceGram,
            createdAt: g.createdAt,
          }))
        : unwrap(request<ApiResponse<UsdWalletDto>>(path, opts)).then((u) => ({
            balance: u.balanceUsd,
            createdAt: u.createdAt,
          })),
      unwrap(request<ApiResponse<BankAccountDto[]>>("/bank-accounts", opts)),
      unwrap(request<ApiResponse<TransferDto[]>>(`/transfers?kind=${kind}`, opts)),
    ]);
    return { accounts, transfers, balance: wallet.balance, createdAt: wallet.createdAt };
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

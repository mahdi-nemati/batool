import { AssetKind } from "@batool/types";
import type {
  ApiResponse,
  BankAccountDto,
  FundDto,
  GoldWalletDto,
  PaginatedResponse,
  TransferDto,
  UsdWalletDto,
} from "@batool/types";
import { ApiClientError, queryString, SERVER_API_ORIGIN, request } from "./client";

export interface CreateBankAccountInput {
  name: string;
  initialBalanceToman: number | string;
}

export interface CreateFundInput {
  name: string;
  goalToman?: number | string;
}

/** `goalToman: null` clears the goal; omitting it leaves the goal untouched. */
export interface UpdateFundInput {
  name?: string;
  goalToman?: number | string | null;
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
  transfers: PaginatedResponse<TransferDto>;
}

export interface WalletOverview {
  accounts: BankAccountDto[];
  transfers: PaginatedResponse<TransferDto>;
  // Native-currency balance (grams / dollars) as an exact decimal string. The
  // wallet value is NEVER a Toman figure.
  balance: string;
  createdAt: string;
}

const unwrap = <T>(p: Promise<ApiResponse<T>>) => p.then((r) => r.data);

/**
 * First page of the paginated list endpoints, used by server-side loaders.
 * It must match the page size the history components request from the browser,
 * otherwise the first render and the first client-side page change would use
 * different page sizes and make the pager jump.
 */
const DEFAULT_PAGE_SIZE = 20;
const FIRST_PAGE = queryString(
  Object.entries({ page: 1, pageSize: DEFAULT_PAGE_SIZE }) as [string, number][],
);

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
export const updateFund = (id: string, body: UpdateFundInput) =>
  unwrap(
    request<ApiResponse<FundDto>>(`/funds/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
export const deleteFund = (id: string) =>
  unwrap(request<ApiResponse<null>>(`/funds/${id}`, { method: "DELETE" }));
export const createTransfer = (body: CreateTransferInput) =>
  unwrap(
    request<ApiResponse<TransferDto>>("/transfers", { method: "POST", body: JSON.stringify(body) }),
  );
export interface ListTransfersInput {
  kind?: AssetKind;
  page?: number;
  pageSize?: number;
}
export const listTransfers = ({ kind, page, pageSize }: ListTransfersInput = {}) =>
  unwrap(
    request<ApiResponse<PaginatedResponse<TransferDto>>>(
      `/transfers${queryString(
        Object.entries({ kind, page, pageSize }) as [string, string | number | undefined][],
      )}`,
    ),
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
      unwrap(request<ApiResponse<PaginatedResponse<TransferDto>>>(`/transfers${FIRST_PAGE}`, opts)),
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
      unwrap(
        request<ApiResponse<PaginatedResponse<TransferDto>>>(
          `/transfers${queryString(
            Object.entries({ kind, page: 1, pageSize: DEFAULT_PAGE_SIZE }) as [
              string,
              string | number,
            ][],
          )}`,
          opts,
        ),
      ),
    ]);
    return { accounts, transfers, balance: wallet.balance, createdAt: wallet.createdAt };
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

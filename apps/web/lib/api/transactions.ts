import type {
  ApiResponse,
  AssetKind,
  FinancialTransactionDto,
  PaginatedResponse,
  TransactionType,
} from "@batool/types";
import { queryString, request } from "./client";

const unwrap = <T>(p: Promise<ApiResponse<T>>) => p.then((r) => r.data);

export interface ParticipantShareInput {
  /**
   * A shared-expense participant is always one of the user's existing
   * Counterparties. There is no free-text participant name: the server derives
   * the display name from `counterparty.name`, so the nickname stays the single
   * source of truth.
   */
  counterpartyId: string;
  amountToman: number | string;
}

export interface CreateTransactionInput {
  type: TransactionType;
  amountToman: number | string;
  categoryId: string;
  assetKind: AssetKind;
  assetId: string;
  description?: string;
  occurredAt?: string;
  shares?: ParticipantShareInput[];
}

export interface TransactionFilters {
  type?: TransactionType | undefined;
  categoryId?: string | undefined;
  assetKind?: AssetKind | undefined;
  assetId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}

export interface ListTransactionsInput extends TransactionFilters {
  page?: number;
  pageSize?: number;
}

export const createTransaction = (body: CreateTransactionInput) =>
  unwrap(
    request<ApiResponse<FinancialTransactionDto>>("/transactions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

export const createIncome = (input: Omit<CreateTransactionInput, "type">) =>
  createTransaction({ ...input, type: "INCOME" });

export const createExpense = (input: Omit<CreateTransactionInput, "type">) =>
  createTransaction({ ...input, type: "EXPENSE" });

export function listTransactions(
  filters: ListTransactionsInput = {},
): Promise<PaginatedResponse<FinancialTransactionDto>> {
  return unwrap(
    request<ApiResponse<PaginatedResponse<FinancialTransactionDto>>>(
      `/transactions${queryString(Object.entries(filters))}`,
    ),
  );
}

export const getTransaction = (id: string) =>
  unwrap(request<ApiResponse<FinancialTransactionDto>>(`/transactions/${id}`));

import type {
  ApiResponse,
  AssetKind,
  FinancialTransactionDto,
  TransactionType,
} from "@batool/types";
import { request } from "./client";

const unwrap = <T>(p: Promise<ApiResponse<T>>) => p.then((r) => r.data);

export interface ParticipantShareInput {
  label: string;
  amountToman: number;
}

export interface CreateTransactionInput {
  type: TransactionType;
  amountToman: number;
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
  filters: TransactionFilters = {},
): Promise<FinancialTransactionDto[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }
  const q = params.toString();
  return unwrap(
    request<ApiResponse<FinancialTransactionDto[]>>(`/transactions${q ? `?${q}` : ""}`),
  );
}

export const getTransaction = (id: string) =>
  unwrap(request<ApiResponse<FinancialTransactionDto>>(`/transactions/${id}`));

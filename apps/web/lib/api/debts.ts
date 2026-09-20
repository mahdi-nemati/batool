import type {
  ApiResponse,
  AssetKind,
  ConnectionDto,
  CounterpartyDto,
  CounterpartyHistoryDto,
  DebtDirection,
  DebtEventDto,
  DebtSummaryDto,
} from "@batool/types";
import { request } from "./client";

const unwrap = <T>(p: Promise<ApiResponse<T>>) => p.then((r) => r.data);

export interface CreateDebtEventInput {
  counterpartyId: string;
  direction: DebtDirection;
  amountToman: number | string;
  description?: string;
  occurredAt?: string;
}

export interface SettleInput {
  counterpartyId: string;
  amountToman: number | string;
  assetKind: AssetKind;
  assetId: string;
  description?: string;
  occurredAt?: string;
}

export const listCounterparties = () =>
  unwrap(request<ApiResponse<CounterpartyDto[]>>("/counterparties"));

export const createExternalCounterparty = (name: string) =>
  unwrap(
    request<ApiResponse<CounterpartyDto>>("/counterparties", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  );

export const updateCounterparty = (id: string, body: { name?: string; archived?: boolean }) =>
  unwrap(
    request<ApiResponse<CounterpartyDto>>(`/counterparties/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );

export const getCounterparty = (id: string) =>
  unwrap(request<ApiResponse<CounterpartyHistoryDto>>(`/counterparties/${id}`));

export const connectUser = (username: string) =>
  unwrap(
    request<ApiResponse<ConnectionDto>>("/connections", {
      method: "POST",
      body: JSON.stringify({ username }),
    }),
  );

export const listConnections = () => unwrap(request<ApiResponse<ConnectionDto[]>>("/connections"));

export const createDebtEvent = (body: CreateDebtEventInput) =>
  unwrap(
    request<ApiResponse<DebtEventDto>>("/debts/events", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

export const settleDebt = (body: SettleInput) =>
  unwrap(
    request<ApiResponse<DebtEventDto>>("/debts/settlements", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

export const linkShare = (shareId: string, counterpartyId: string) =>
  unwrap(
    request<ApiResponse<DebtEventDto>>("/debts/link-share", {
      method: "POST",
      body: JSON.stringify({ shareId, counterpartyId }),
    }),
  );

export const debtSummary = () => unwrap(request<ApiResponse<DebtSummaryDto>>("/debts/summary"));

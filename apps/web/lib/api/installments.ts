import type {
  ApiResponse,
  AssetKind,
  InstallmentDetailDto,
  InstallmentDto,
  InstallmentPaymentDto,
} from "@batool/types";
import { request } from "./client";

const unwrap = <T>(p: Promise<ApiResponse<T>>) => p.then((r) => r.data);

export interface CreateInstallmentInput {
  name: string;
  description?: string;
  amountToman: number | string;
  totalCount: number;
  dueDayOfMonth: number;
  startDate: number; // epoch millis (UTC)
}

export interface UpdateInstallmentInput {
  name?: string;
  description?: string;
  amountToman?: number | string;
  totalCount?: number;
  dueDayOfMonth?: number;
  startDate?: number;
  archived?: boolean;
}

export const listInstallments = () =>
  unwrap(request<ApiResponse<InstallmentDto[]>>("/installments"));

export const getInstallment = (id: string) =>
  unwrap(request<ApiResponse<InstallmentDetailDto>>(`/installments/${id}`));

export const createInstallment = (body: CreateInstallmentInput) =>
  unwrap(
    request<ApiResponse<InstallmentDto>>("/installments", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

export const updateInstallment = (id: string, body: UpdateInstallmentInput) =>
  unwrap(
    request<ApiResponse<InstallmentDto>>(`/installments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );

export const payInstallment = (id: string, body: { assetKind: AssetKind; assetId: string }) =>
  unwrap(
    request<ApiResponse<InstallmentDetailDto>>(`/installments/${id}/pay`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

export type { InstallmentPaymentDto };

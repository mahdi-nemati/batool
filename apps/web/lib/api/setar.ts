import type {
  ApiResponse,
  AssetKind,
  PaginatedResponse,
  SetarSessionDto,
  SetarStatusDto,
  SetarTuitionPaymentDto,
} from "@batool/types";
import { queryString, request } from "./client";

const unwrap = <T>(p: Promise<ApiResponse<T>>) => p.then((r) => r.data);

const pageQuery = (page: number, pageSize: number | undefined) =>
  queryString(Object.entries({ page, pageSize }) as [string, number | undefined][]);

export const getSetarStatus = () => unwrap(request<ApiResponse<SetarStatusDto>>("/setar"));

export const createSetarProfile = (tuitionAmountToman: number | string) =>
  unwrap(
    request<ApiResponse<SetarStatusDto>>("/setar", {
      method: "POST",
      body: JSON.stringify({ tuitionAmountToman }),
    }),
  );

export const updateSetarProfile = (
  id: string,
  body: { tuitionAmountToman?: number | string; archived?: boolean },
) =>
  unwrap(
    request<ApiResponse<SetarStatusDto>>(`/setar/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );

export const listSetarSessions = (page = 1, pageSize?: number) =>
  unwrap(
    request<ApiResponse<PaginatedResponse<SetarSessionDto>>>(
      `/setar/sessions${pageQuery(page, pageSize)}`,
    ),
  );

export const createSetarSession = (body: { occurredAt?: number; description?: string }) =>
  unwrap(
    request<ApiResponse<SetarStatusDto>>("/setar/sessions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

export const listSetarPayments = (page = 1, pageSize?: number) =>
  unwrap(
    request<ApiResponse<PaginatedResponse<SetarTuitionPaymentDto>>>(
      `/setar/payments${pageQuery(page, pageSize)}`,
    ),
  );

/** Tuition is always paid from a Bank Account. */
export const paySetarTuition = (body: {
  assetKind: AssetKind;
  assetId: string;
  description?: string;
}) =>
  unwrap(
    request<ApiResponse<SetarStatusDto>>("/setar/pay", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

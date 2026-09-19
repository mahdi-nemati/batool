import type {
  ApiResponse,
  AssetKind,
  SetarSessionDto,
  SetarStatusDto,
  SetarTuitionPaymentDto,
} from "@batool/types";
import { request } from "./client";

const unwrap = <T>(p: Promise<ApiResponse<T>>) => p.then((r) => r.data);

export const getSetarStatus = () => unwrap(request<ApiResponse<SetarStatusDto>>("/setar"));

export const createSetarProfile = (tuitionAmountToman: number) =>
  unwrap(
    request<ApiResponse<SetarStatusDto>>("/setar", {
      method: "POST",
      body: JSON.stringify({ tuitionAmountToman }),
    }),
  );

export const updateSetarProfile = (
  id: string,
  body: { tuitionAmountToman?: number; archived?: boolean },
) =>
  unwrap(
    request<ApiResponse<SetarStatusDto>>(`/setar/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );

export const listSetarSessions = () =>
  unwrap(request<ApiResponse<SetarSessionDto[]>>("/setar/sessions"));

export const createSetarSession = (body: { occurredAt?: number; description?: string }) =>
  unwrap(
    request<ApiResponse<SetarStatusDto>>("/setar/sessions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

export const listSetarPayments = () =>
  unwrap(request<ApiResponse<SetarTuitionPaymentDto[]>>("/setar/payments"));

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

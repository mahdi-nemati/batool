import type { ApiResponse, DashboardSummaryDto } from "@batool/types";
import { request } from "./client";

const unwrap = <T>(promise: Promise<ApiResponse<T>>) => promise.then((response) => response.data);

export const getDashboardSummary = (month?: string) =>
  unwrap(
    request<ApiResponse<DashboardSummaryDto>>(
      month === undefined
        ? "/dashboard/summary"
        : `/dashboard/summary?month=${encodeURIComponent(month)}`,
      { cache: "no-store" },
    ),
  );

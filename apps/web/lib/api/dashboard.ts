import type { ApiResponse, DashboardStatisticsDto, DashboardSummaryDto } from "@batool/types";
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

export const getDashboardStatistics = (month?: string) =>
  unwrap(
    request<ApiResponse<DashboardStatisticsDto>>(
      month === undefined
        ? "/dashboard/statistics"
        : `/dashboard/statistics?month=${encodeURIComponent(month)}`,
      { cache: "no-store" },
    ),
  );

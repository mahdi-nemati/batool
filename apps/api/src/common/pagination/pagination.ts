import type { PaginatedResponse } from "@batool/types";
import { ApiError } from "../errors/api-error";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PageRequest {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

function positiveInt(raw: string | undefined, fallback: number, field: string, max: number): number {
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw ApiError.validation(field, "مقدار باید عدد صحیح مثبت باشد");
  }
  return Math.min(value, max);
}

/**
 * Normalizes `?page=&pageSize=` into Prisma skip/take. Out-of-range values are
 * clamped rather than rejected so a stale client page never fails the request.
 */
export function parsePage(rawPage?: string, rawPageSize?: string): PageRequest {
  const page = positiveInt(rawPage, 1, "page", Number.MAX_SAFE_INTEGER);
  const pageSize = positiveInt(rawPageSize, DEFAULT_PAGE_SIZE, "pageSize", MAX_PAGE_SIZE);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** Wraps a page of rows plus its total count in the shared pagination envelope. */
export function paginate<T>(rows: T[], total: number, request: PageRequest): PaginatedResponse<T> {
  return {
    data: rows,
    meta: { page: request.page, pageSize: request.pageSize, total },
  };
}

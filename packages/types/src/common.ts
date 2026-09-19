export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  INSUFFICIENT_ASSET_QUANTITY: "INSUFFICIENT_ASSET_QUANTITY",
  INVALID_TRANSFER_ROUTE: "INVALID_TRANSFER_ROUTE",
  SETTLEMENT_EXCEEDS_OUTSTANDING: "SETTLEMENT_EXCEEDS_OUTSTANDING",
  NOTHING_TO_SETTLE: "NOTHING_TO_SETTLE",
  COUNTERPARTY_ARCHIVED: "COUNTERPARTY_ARCHIVED",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    fields?: Record<string, string>;
    requestId?: string;
  };
}

export interface ApiResponse<T> {
  data: T;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface HealthDto {
  status: "ok";
  service: string;
  timestamp: string;
}

export interface ReadinessDto {
  status: "ok";
  service: string;
  database: "up";
  timestamp: string;
}

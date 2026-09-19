import type { ApiErrorBody } from "@batool/types";

// Browser-facing API origin (compiled into the client bundle).
export const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:4000/api";

// Server-side origin used by RSC / route handlers. Override inside Docker with
// API_SERVER_ORIGIN (e.g. an internal hostname like http://api:4000/api).
export const SERVER_API_ORIGIN = process.env.API_SERVER_ORIGIN ?? API_ORIGIN;

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export interface RequestOptions {
  baseUrl?: string;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: string;
  cache?: RequestCache;
}

/**
 * Sends a request with credentials included so the HttpOnly session cookie is
 * transmitted on same-site (localhost cross-port) requests.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { baseUrl = API_ORIGIN, method = "GET", headers, body, cache } = options;

  const init: RequestInit = {
    method,
    credentials: "include",
    headers: { "content-type": "application/json", ...(headers ?? {}) },
  };
  if (body !== undefined) {
    init.body = body;
  }
  if (cache !== undefined) {
    init.cache = cache;
  }

  const response = await fetch(`${baseUrl}${path}`, init);

  if (!response.ok) {
    let code = "INTERNAL_ERROR";
    let message = "خطایی رخ داد";
    let fields: Record<string, string> | undefined;
    try {
      const parsed = (await response.json()) as ApiErrorBody;
      code = parsed.error.code;
      message = parsed.error.message;
      fields = parsed.error.fields;
    } catch {
      // Non-JSON error body (e.g. proxy) — keep the generic message.
    }
    throw new ApiClientError(response.status, code, message, fields);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

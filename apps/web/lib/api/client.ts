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
 * Builds `?a=1&b=2` from defined values only, returning "" when nothing is set.
 * Shared by every list endpoint so pagination/filter params are encoded the same
 * way across the app. Takes entries (not an object) so any caller shape works,
 * including typed filter objects without an index signature.
 */
export function queryString(
  values: Iterable<readonly [string, string | number | undefined]>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of values) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }
  const encoded = params.toString();
  return encoded.length > 0 ? `?${encoded}` : "";
}

/** Detail event used by the global ToastProvider to surface backend failures. */
export const API_TOAST_EVENT = "batool:toast";

export interface ApiToastDetail {
  message: string;
  tone: "error" | "success" | "info";
  fields?: Record<string, string>;
}

function emitToast(detail: ApiToastDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ApiToastDetail>(API_TOAST_EVENT, { detail }));
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

  const isMutation = method !== "GET";
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
    // Every backend failure is surfaced through the global notification channel,
    // not just mutations: a failed GET must not fail silently either.
    emitToast({ message, tone: "error", ...(fields ? { fields } : {}) });
    throw new ApiClientError(response.status, code, message, fields);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  if (isMutation) {
    emitToast({ message: "عملیات با موفقیت انجام شد", tone: "success" });
  }
  return (await response.json()) as T;
}

import type { AppEnv } from "../config/env.schema";

export const SESSION_COOKIE = "batool_session";
export const SESSION_TTL_DAYS = 7;
// Express `res.cookie({ maxAge })` is in MILLISECONDS; align with DB expiry.
export const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export interface SessionCookieOptions {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
}

export function sessionCookieOptions(env: AppEnv): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: SESSION_TTL_MS,
  };
}

export function sessionExpiry(now: number = Date.now()): Date {
  return new Date(now + SESSION_TTL_MS);
}

import type { ApiResponse, UserDto } from "@batool/types";
import { ApiClientError, SERVER_API_ORIGIN, request } from "./client";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  username: string;
  nickname: string;
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  nickname?: string;
  email?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export async function login(input: LoginInput): Promise<UserDto> {
  const res = await request<ApiResponse<UserDto>>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function register(input: RegisterInput): Promise<UserDto> {
  const res = await request<ApiResponse<UserDto>>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function logout(): Promise<void> {
  await request<void>("/auth/logout", { method: "POST" });
}

export async function getMe(): Promise<UserDto> {
  const res = await request<ApiResponse<UserDto>>("/auth/me", { method: "GET" });
  return res.data;
}

export async function updateProfile(input: UpdateProfileInput): Promise<UserDto> {
  const res = await request<ApiResponse<UserDto>>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await request<void>("/users/me/password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Server-side identity lookup for React Server Components. Returns null when
 * unauthenticated (401) so callers can redirect; rethrows unexpected errors.
 */
export async function getMeServer(cookieHeader: string | undefined): Promise<UserDto | null> {
  try {
    const res = await request<ApiResponse<UserDto>>("/auth/me", {
      baseUrl: SERVER_API_ORIGIN,
      method: "GET",
      cache: "no-store",
      ...(cookieHeader !== undefined && cookieHeader.length > 0
        ? { headers: { cookie: cookieHeader } }
        : {}),
    });
    return res.data;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

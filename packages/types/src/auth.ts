export const Role = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

/** Public-safe user representation. Never includes passwordHash. */
export interface UserDto {
  id: string;
  username: string;
  email: string;
  nickname: string;
  role: Role;
  createdAt: string;
}

/** Authenticated principal attached to each request (used for authorization). */
export interface AuthUser {
  id: string;
  username: string;
  nickname: string;
  role: Role;
}

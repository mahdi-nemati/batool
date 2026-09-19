import type { AuthUser } from "@batool/types";

export type { AuthUser };

export interface RequestWithUser {
  user?: AuthUser;
}

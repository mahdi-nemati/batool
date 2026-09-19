import { SetMetadata, createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Role } from "@batool/types";
import { ApiError } from "../errors/api-error";
import type { AuthUser, RequestWithUser } from "./auth.types";

export const IS_PUBLIC_KEY = "batool:isPublic";
export const ROLES_KEY = "batool:roles";

/** Marks a route as not requiring authentication. */
export const Public = (): ReturnType<typeof SetMetadata> => SetMetadata(IS_PUBLIC_KEY, true);

/** Restricts a route to the given roles (implies authentication). */
export const Roles = (...roles: Role[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);

/** Injects the authenticated principal into a handler argument. */
export const CurrentUser = createParamDecorator<never, AuthUser>((_data, ctx) => {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>();
  if (request.user === undefined) {
    throw ApiError.unauthorized();
  }
  return request.user;
});

import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "@batool/types";
import { ApiError } from "../errors/api-error";
import { ROLES_KEY } from "./decorators";
import type { RequestWithUser } from "./auth.types";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required === undefined || required.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (user === undefined) {
      throw ApiError.unauthorized();
    }
    if (!required.includes(user.role)) {
      throw ApiError.forbidden();
    }
    return true;
  }
}

import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ApiError } from "../errors/api-error";
import { IS_PUBLIC_KEY } from "./decorators";
import type { RequestWithUser } from "./auth.types";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (request.user === undefined) {
      throw ApiError.unauthorized();
    }
    return true;
  }
}

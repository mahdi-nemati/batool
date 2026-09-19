import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { ConfigService } from "../config/config.service";
import { ApiError } from "../errors/api-error";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Defence-in-depth against CSRF. Session cookies are SameSite=Lax (which
 * already blocks cross-site unsafe requests), but we additionally reject any
 * unsafe request whose browser `Origin` is present and not the configured web
 * origin. Non-browser clients (no Origin header) are unaffected.
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    if (UNSAFE_METHODS.has(req.method)) {
      const origin = req.headers.origin;
      if (origin !== undefined && origin !== this.config.app.webOrigin) {
        next(ApiError.forbidden("منبع درخواست مجاز نیست"));
        return;
      }
    }
    next();
  }
}

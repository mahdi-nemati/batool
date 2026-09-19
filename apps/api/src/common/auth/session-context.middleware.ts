import type { NextFunction, Request, Response } from "express";
import { Inject, Injectable, NestMiddleware } from "@nestjs/common";
import type { AuthUser } from "@batool/types";
import { SESSION_COOKIE } from "./security.config";
import type { RequestWithUser } from "./auth.types";

export interface SessionValidator {
  resolveUserByToken(token: string): Promise<AuthUser | undefined>;
}

export const SESSION_VALIDATOR = "SESSION_VALIDATOR";

// `req.cookies` is provided by the cookie-parser + @types/cookie-parser augmentation.
type CookieRequest = Request & RequestWithUser;

/**
 * Populates `req.user` from the session cookie (if present and valid) so that
 * guards can enforce authorization. Runs before route guards in the NestJS
 * request lifecycle.
 */
@Injectable()
export class SessionContextMiddleware implements NestMiddleware {
  constructor(@Inject(SESSION_VALIDATOR) private readonly validator: SessionValidator) {}

  use(req: CookieRequest, _res: Response, next: NextFunction): void {
    const token = req.cookies?.[SESSION_COOKIE];
    if (token === undefined) {
      next();
      return;
    }
    void this.validator
      .resolveUserByToken(token)
      .then((user) => {
        if (user !== undefined) {
          req.user = user;
        }
        next();
      })
      .catch(() => next());
  }
}

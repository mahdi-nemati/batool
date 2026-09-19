import { Body, Controller, Get, HttpCode, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import type { ApiResponse, AuthUser, UserDto } from "@batool/types";
import { ConfigService } from "../common/config/config.service";
import { CurrentUser, Public } from "../common/auth/decorators";
import { SESSION_COOKIE, sessionCookieOptions } from "../common/auth/security.config";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto } from "./dto/auth.dto";

// `req.cookies` is provided by the cookie-parser + @types/cookie-parser augmentation.
type CookieRequest = Request;

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private meta(req: CookieRequest): { userAgent?: string; ipAddress?: string } {
    const userAgent = req.headers["user-agent"];
    return {
      ...(typeof userAgent === "string" ? { userAgent } : {}),
      ...(req.ip !== undefined ? { ipAddress: req.ip } : {}),
    };
  }

  private issueCookie(res: Response, token: string): void {
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(this.config.app));
  }

  @Public()
  @Post("register")
  async register(
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() body: RegisterDto,
  ): Promise<ApiResponse<UserDto>> {
    const { user, token } = await this.auth.register(body, this.meta(req));
    this.issueCookie(res, token);
    return { data: user };
  }

  @Public()
  @HttpCode(200)
  @Post("login")
  async login(
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() body: LoginDto,
  ): Promise<ApiResponse<UserDto>> {
    const { user, token } = await this.auth.login(body, this.meta(req));
    this.issueCookie(res, token);
    return { data: user };
  }

  @Public()
  @HttpCode(204)
  @Post("logout")
  async logout(
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(req.cookies?.[SESSION_COOKIE]);
    res.clearCookie(SESSION_COOKIE);
  }

  @Get("me")
  async me(@CurrentUser() user: AuthUser): Promise<ApiResponse<UserDto>> {
    return { data: await this.auth.me(user.id) };
  }
}

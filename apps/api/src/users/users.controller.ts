import { Body, Controller, HttpCode, Patch, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import type { ApiResponse, AuthUser, UserDto } from "@batool/types";
import { CurrentUser } from "../common/auth/decorators";
import { SESSION_COOKIE } from "../common/auth/security.config";
import { AuthService } from "../auth/auth.service";
import { ChangePasswordDto, UpdateProfileDto } from "../auth/dto/profile.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly auth: AuthService) {}

  @Patch("me")
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateProfileDto,
  ): Promise<ApiResponse<UserDto>> {
    return { data: await this.auth.updateProfile(user.id, body) };
  }

  @HttpCode(204)
  @Post("me/password")
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() body: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    // Revokes all sessions (defensive). Clear the current cookie so the client
    // returns to a logged-out state and can log back in with the new password.
    await this.auth.changePassword(user.id, body.currentPassword, body.newPassword);
    res.clearCookie(SESSION_COOKIE);
  }
}

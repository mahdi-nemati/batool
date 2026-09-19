import { Injectable } from "@nestjs/common";
import type { User } from "@batool/database";
import type { AuthUser, Role, UserDto } from "@batool/types";
import { ApiError } from "../common/errors/api-error";
import { SessionRepository, type SessionMeta } from "./session.repository";
import { UsersService, type RegisterInput, type UpdateProfileInput } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionRepository,
  ) {}

  private toUserDto(user: User): UserDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      role: user.role as Role,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      role: user.role as Role,
    };
  }

  async register(
    input: RegisterInput,
    meta: SessionMeta,
  ): Promise<{ user: UserDto; token: string }> {
    const user = await this.users.create(input);
    const session = await this.sessions.issue(user.id, meta);
    return { user: this.toUserDto(user), token: session.token };
  }

  async login(
    input: { email: string; password: string },
    meta: SessionMeta,
  ): Promise<{ user: UserDto; token: string }> {
    const user = await this.users.findByEmail(input.email);
    const matches =
      user !== null ? await this.users.verifyPassword(user.passwordHash, input.password) : false;
    // Same response for unknown email and wrong password (no enumeration).
    if (user === null || !matches) {
      throw ApiError.unauthorized();
    }
    const session = await this.sessions.issue(user.id, meta);
    return { user: this.toUserDto(user), token: session.token };
  }

  async resolveUserByToken(token: string): Promise<AuthUser | undefined> {
    const session = await this.sessions.findActiveByToken(token);
    if (session === null) {
      return undefined;
    }
    return this.toAuthUser(session.user);
  }

  async logout(token: string | undefined): Promise<void> {
    if (token !== undefined) {
      await this.sessions.revokeByToken(token);
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessions.revokeAllForUser(userId);
  }

  async me(userId: string): Promise<UserDto> {
    const user = await this.users.getById(userId);
    return this.toUserDto(user);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserDto> {
    const user = await this.users.updateProfile(userId, input);
    return this.toUserDto(user);
  }

  /**
   * Verifies the current password, stores the new hash and revokes every
   * existing session (the client must log in again on the next request).
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.users.getById(userId);
    const matches = await this.users.verifyPassword(user.passwordHash, currentPassword);
    if (!matches) {
      throw ApiError.validation("currentPassword", "رمز عبور فعلی نادرست است");
    }
    await this.users.changePassword(userId, newPassword);
    await this.sessions.revokeAllForUser(userId);
  }
}

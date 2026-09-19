import { Injectable } from "@nestjs/common";
import type { User } from "@batool/database";
import { ApiError } from "../common/errors/api-error";
import { PasswordService, isStrongPassword } from "../auth/password.service";
import { UsersRepository } from "./users.repository";

export interface RegisterInput {
  username: string;
  nickname: string;
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  nickname?: string | undefined;
  email?: string | undefined;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly passwords: PasswordService,
  ) {}

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async create(input: RegisterInput): Promise<User> {
    const username = input.username.trim().toLowerCase();
    const nickname = input.nickname.trim();
    const email = this.normalizeEmail(input.email);

    if (nickname.length === 0) {
      throw ApiError.validation("nickname", "نام مستعار نمی‌تواند خالی باشد");
    }
    if (!isStrongPassword(input.password)) {
      throw ApiError.validation(
        "password",
        "رمز عبور باید حداقل ۸ نویسه و شامل حداقل یک حرف و یک رقم باشد",
      );
    }
    if ((await this.users.findByUsername(username)) !== null) {
      throw ApiError.conflict("این نام کاربری قبلاً ثبت شده است");
    }
    if ((await this.users.findByEmail(email)) !== null) {
      throw ApiError.conflict("این ایمیل قبلاً ثبت شده است");
    }

    const passwordHash = await this.passwords.hashPassword(input.password);
    return this.users.create({ username, nickname, email, passwordHash });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.findByEmail(this.normalizeEmail(email));
  }

  async getById(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (user === null) {
      throw ApiError.notFound();
    }
    return user;
  }

  async updateProfile(id: string, input: UpdateProfileInput): Promise<User> {
    const current = await this.getById(id);
    const data: { nickname?: string; email?: string } = {};

    if (input.nickname !== undefined) {
      const nickname = input.nickname.trim();
      if (nickname.length === 0) {
        throw ApiError.validation("nickname", "نام مستعار نمی‌تواند خالی باشد");
      }
      data.nickname = nickname;
    }
    if (input.email !== undefined) {
      const email = this.normalizeEmail(input.email);
      if (email !== current.email && (await this.users.findByEmail(email)) !== null) {
        throw ApiError.conflict("این ایمیل قبلاً ثبت شده است");
      }
      data.email = email;
    }

    if (data.nickname === undefined && data.email === undefined) {
      return current;
    }
    return this.users.update(id, data);
  }

  async changePassword(id: string, newPassword: string): Promise<void> {
    if (!isStrongPassword(newPassword)) {
      throw ApiError.validation(
        "newPassword",
        "رمز عبور باید حداقل ۸ نویسه و شامل حداقل یک حرف و یک رقم باشد",
      );
    }
    const passwordHash = await this.passwords.hashPassword(newPassword);
    await this.users.update(id, { passwordHash });
  }

  verifyPassword(passwordHash: string, password: string): Promise<boolean> {
    return this.passwords.verifyPassword(passwordHash, password);
  }
}

import { hash, verify } from "@node-rs/argon2";
import { Injectable } from "@nestjs/common";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export function isStrongPassword(password: string): boolean {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH &&
    // At least one letter (Latin or Persian) and one digit.
    /[a-zA-Z؀-ۿ]/.test(password) &&
    /[0-9]/.test(password)
  );
}

@Injectable()
export class PasswordService {
  async hashPassword(password: string): Promise<string> {
    return hash(password);
  }

  async verifyPassword(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }
}

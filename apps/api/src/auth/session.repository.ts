import { createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { sessionExpiry } from "../common/auth/security.config";

export interface SessionMeta {
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
}

export interface IssuedSession {
  token: string;
  userId: string;
}

/**
 * Opaque bearer-token sessions. The browser cookie holds a random token; the
 * database stores only its SHA-256 hash, so a data leak never exposes live
 * session tokens. Sessions are short-lived (expiry) and individually revocable.
 */
@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  generateToken(): string {
    return randomBytes(32).toString("base64url");
  }

  async issue(userId: string, meta: SessionMeta): Promise<IssuedSession> {
    const token = this.generateToken();
    await this.prisma.authenticationSession.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        expiresAt: sessionExpiry(),
        ...(meta.userAgent !== undefined ? { userAgent: meta.userAgent } : {}),
        ...(meta.ipAddress !== undefined ? { ipAddress: meta.ipAddress } : {}),
      },
    });
    return { token, userId };
  }

  findActiveByToken(token: string) {
    return this.prisma.authenticationSession.findFirst({
      where: {
        tokenHash: this.hashToken(token),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  async revokeByToken(token: string): Promise<void> {
    await this.prisma.authenticationSession.updateMany({
      where: { tokenHash: this.hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.authenticationSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

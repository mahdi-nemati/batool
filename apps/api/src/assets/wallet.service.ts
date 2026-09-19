import { Injectable } from "@nestjs/common";
import type { GoldWallet, Prisma, UsdWallet } from "@batool/database";
import { PrismaService } from "../database/prisma.service";

type Client = Prisma.TransactionClient | PrismaService;

/**
 * The Gold and USD wallets exist exactly once per user, are created on demand
 * (idempotent upsert) and are never deletable through the API.
 */
@Injectable()
export class WalletService {
  ensureGold(client: Client, userId: string): Promise<GoldWallet> {
    return client.goldWallet.upsert({ where: { userId }, create: { userId }, update: {} });
  }

  ensureUsd(client: Client, userId: string): Promise<UsdWallet> {
    return client.usdWallet.upsert({ where: { userId }, create: { userId }, update: {} });
  }
}

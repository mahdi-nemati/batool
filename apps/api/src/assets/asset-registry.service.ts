import { Injectable } from "@nestjs/common";
import type { Prisma } from "@batool/database";
import { AssetKind, type AssetKind as AssetKindType } from "@batool/types";
import { PrismaService } from "../database/prisma.service";
import { ApiError } from "../common/errors/api-error";
import { Decimal } from "../common/validation/quantity";
import { LedgerService } from "./ledger.service";
import { WalletService } from "./wallet.service";

export type AssetCurrency = "TOMAN" | "GRAM" | "USD";

export interface ResolvedAsset {
  kind: AssetKindType;
  id: string;
  name: string;
  currency: AssetCurrency;
}

/**
 * Resolves a transfer endpoint to an asset the caller actually owns, enforcing
 * ownership (a missing id for BANK/FUND, or any row belonging to another user,
 * yields 404). GOLD/USD are singletons per user and are ensured to exist.
 */
@Injectable()
export class AssetRegistryService {
  constructor(
    private readonly wallets: WalletService,
    private readonly ledger: LedgerService,
  ) {}

  async resolve(
    tx: Prisma.TransactionClient,
    userId: string,
    kind: AssetKindType,
    id: string | undefined,
  ): Promise<ResolvedAsset> {
    switch (kind) {
      case AssetKind.GOLD: {
        const wallet = await this.wallets.ensureGold(tx, userId);
        return { kind, id: wallet.id, name: "طلا", currency: "GRAM" };
      }
      case AssetKind.USD: {
        const wallet = await this.wallets.ensureUsd(tx, userId);
        return { kind, id: wallet.id, name: "دلار", currency: "USD" };
      }
      case AssetKind.BANK: {
        if (id === undefined) {
          throw ApiError.validation("sourceId", "شناسه حساب بانکی الزامی است");
        }
        const account = await tx.bankAccount.findFirst({ where: { id, userId } });
        if (account === null) {
          throw ApiError.notFound();
        }
        return { kind, id: account.id, name: account.name, currency: "TOMAN" };
      }
      case AssetKind.FUND: {
        if (id === undefined) {
          throw ApiError.validation("sourceId", "شناسه صندوق الزامی است");
        }
        const fund = await tx.fund.findFirst({ where: { id, userId } });
        if (fund === null) {
          throw ApiError.notFound();
        }
        return { kind, id: fund.id, name: fund.name, currency: "TOMAN" };
      }
    }
  }

  async balanceOf(tx: Prisma.TransactionClient, asset: ResolvedAsset): Promise<bigint | Decimal> {
    switch (asset.currency) {
      case "TOMAN":
        return this.ledger.sumToman(tx, asset.kind, asset.id);
      case "GRAM":
        return this.ledger.sumGram(tx, asset.kind, asset.id);
      case "USD":
        return this.ledger.sumUsd(tx, asset.kind, asset.id);
    }
  }

  /**
   * Row-level lock (SELECT ... FOR UPDATE) so two concurrent transfers touching
   * the same asset serialize; combined with the derived-balance check this makes
   * the non-negative invariant race-safe.
   */
  async lock(tx: Prisma.TransactionClient, asset: ResolvedAsset, userId: string): Promise<void> {
    switch (asset.kind) {
      case AssetKind.BANK:
        await tx.$queryRaw`SELECT id FROM "BankAccount" WHERE id = ${asset.id} AND "userId" = ${userId} FOR UPDATE`;
        break;
      case AssetKind.FUND:
        await tx.$queryRaw`SELECT id FROM "Fund" WHERE id = ${asset.id} AND "userId" = ${userId} FOR UPDATE`;
        break;
      case AssetKind.GOLD:
        await tx.$queryRaw`SELECT id FROM "GoldWallet" WHERE id = ${asset.id} FOR UPDATE`;
        break;
      case AssetKind.USD:
        await tx.$queryRaw`SELECT id FROM "UsdWallet" WHERE id = ${asset.id} FOR UPDATE`;
        break;
    }
  }
}

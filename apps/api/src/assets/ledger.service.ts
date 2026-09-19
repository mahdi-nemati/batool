import { Injectable } from "@nestjs/common";
import type { Prisma } from "@batool/database";
import type { AssetKind } from "@batool/types";
import { PrismaService } from "../database/prisma.service";
import { Decimal, fromStorageQuantity } from "../common/validation/quantity";

type Client = Prisma.TransactionClient | PrismaService;

/**
 * Aggregates signed AssetMovement rows to derive an asset's current balance in
 * its native currency. This is the single source of truth for balances — no
 * stored, mutable balance column exists anywhere.
 */
@Injectable()
export class LedgerService {
  sumToman(client: Client, assetKind: AssetKind, assetId: string): Promise<bigint> {
    return client.assetMovement
      .aggregate({ where: { assetKind, assetId }, _sum: { amountToman: true } })
      .then((r) => r._sum.amountToman ?? 0n);
  }

  sumGram(client: Client, assetKind: AssetKind, assetId: string): Promise<Decimal> {
    return client.assetMovement
      .aggregate({ where: { assetKind, assetId }, _sum: { amountGram: true } })
      .then((r) => fromStorageQuantity(r._sum.amountGram ?? null));
  }

  sumUsd(client: Client, assetKind: AssetKind, assetId: string): Promise<Decimal> {
    return client.assetMovement
      .aggregate({ where: { assetKind, assetId }, _sum: { amountUsd: true } })
      .then((r) => fromStorageQuantity(r._sum.amountUsd ?? null));
  }
}

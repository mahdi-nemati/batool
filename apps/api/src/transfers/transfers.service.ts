import { Injectable } from "@nestjs/common";
import type { Prisma, Transfer } from "@batool/database";
import {
  AssetKind,
  type AssetRefDto,
  type PaginatedResponse,
  type TransferDto,
} from "@batool/types";
import { PrismaService } from "../database/prisma.service";
import { ApiError } from "../common/errors/api-error";
import { parseToman } from "../common/validation/money";
import { paginate, type PageRequest } from "../common/pagination/pagination";
import { Decimal, parseQuantity } from "../common/validation/quantity";
import { formatQuantityFa, formatTomanFa } from "../common/formatting/fa";
import { AssetRegistryService, type ResolvedAsset } from "../assets/asset-registry.service";

type PrismaTx = Prisma.TransactionClient;

interface LegValue {
  toman?: bigint;
  gram?: Decimal;
  usd?: Decimal;
}

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AssetRegistryService,
  ) {}

  async create(
    userId: string,
    dto: {
      sourceKind: AssetKind;
      sourceId?: string;
      destinationKind: AssetKind;
      destinationId?: string;
      amountToman?: number;
      amountGram?: string;
      amountUsd?: string;
      occurredAt?: string;
    },
  ): Promise<TransferDto> {
    const occurredAt = this.parseOccurredAt(dto.occurredAt);

    return this.prisma.$transaction(async (tx) => {
      const source = await this.registry.resolve(tx, userId, dto.sourceKind, dto.sourceId);
      const dest = await this.registry.resolve(tx, userId, dto.destinationKind, dto.destinationId);
      this.assertNotSameAsset(source, dest);

      // Deterministic lock order avoids deadlocks between opposite transfers.
      const [first, second] =
        `${source.kind}:${source.id}` <= `${dest.kind}:${dest.id}`
          ? [source, dest]
          : [dest, source];
      await this.registry.lock(tx, first, userId);
      await this.registry.lock(tx, second, userId);

      const { sourceLeg, destLeg, amounts, description } = this.classifyAndValidate(
        dto,
        source,
        dest,
      );

      // The source always bears the outflow: enforce its native non-negative balance.
      await this.assertSourceCanDebit(tx, source, sourceLeg);

      const transfer = await tx.transfer.create({
        data: {
          userId,
          sourceKind: source.kind,
          sourceId: source.id,
          destinationKind: dest.kind,
          destinationId: dest.id,
          occurredAt,
          description,
          ...this.transferAmountColumns(amounts),
        },
      });

      await tx.assetMovement.create({
        data: this.movement(userId, source, sourceLeg, occurredAt, transfer.id),
      });
      await tx.assetMovement.create({
        data: this.movement(userId, dest, destLeg, occurredAt, transfer.id),
      });

      return this.toDto(transfer, source, dest);
    });
  }

  private parseOccurredAt(value: string | undefined): Date {
    if (value === undefined) {
      return new Date();
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw ApiError.validation("occurredAt", "تاریخ نامعتبر است");
    }
    return date;
  }

  private assertNotSameAsset(source: ResolvedAsset, dest: ResolvedAsset): void {
    if (source.kind === dest.kind && source.id === dest.id) {
      throw ApiError.validation("destinationId", "مبدأ و مقصد نمی‌توانند یک دارایی باشند");
    }
  }

  private classifyAndValidate(
    dto: { amountToman?: number; amountGram?: string; amountUsd?: string },
    source: ResolvedAsset,
    dest: ResolvedAsset,
  ): { sourceLeg: LegValue; destLeg: LegValue; amounts: LegValue; description: string } {
    const srcAsset = source.kind === AssetKind.GOLD || source.kind === AssetKind.USD;
    const dstAsset = dest.kind === AssetKind.GOLD || dest.kind === AssetKind.USD;

    if (srcAsset && dstAsset) {
      throw ApiError.invalidTransferRoute("انتقال مستقیم بین طلا و دلار مجاز نیست");
    }

    if (!srcAsset && !dstAsset) {
      // Pure Toman movement between bank accounts / funds.
      if (source.kind === AssetKind.FUND && dest.kind === AssetKind.FUND) {
        throw ApiError.invalidTransferRoute("انتقال بین دو صندوق مجاز نیست");
      }
      const toman = parseToman(dto.amountToman);
      return {
        sourceLeg: { toman: -toman },
        destLeg: { toman },
        amounts: { toman },
        description: this.tomanTomanDescription(source, dest, toman),
      };
    }

    // Exactly one Gold/USD endpoint; the other must be a bank account.
    const asset = srcAsset ? source : dest;
    const bank = srcAsset ? dest : source;
    if (bank.kind !== AssetKind.BANK) {
      throw ApiError.invalidTransferRoute("طلا و دلار فقط با حساب بانکی قابل جابه‌جایی‌اند");
    }
    const toman = parseToman(dto.amountToman);

    if (asset.kind === AssetKind.GOLD) {
      if (dto.amountGram === undefined) {
        throw ApiError.validation("amountGram", "مقدار طلا الزامی است");
      }
      const gram = parseQuantity(dto.amountGram, "amountGram");
      return {
        sourceLeg: srcAsset ? { gram: gram.negated() } : { toman: -toman },
        destLeg: dstAsset ? { gram } : { toman },
        amounts: { toman, gram },
        description: srcAsset
          ? `فروش ${formatQuantityFa(gram.toString())} گرم طلا به حساب ${bank.name}`
          : `خرید ${formatQuantityFa(gram.toString())} گرم طلا از حساب ${bank.name}`,
      };
    }

    // USD
    if (dto.amountUsd === undefined) {
      throw ApiError.validation("amountUsd", "مقدار دلار الزامی است");
    }
    const usd = parseQuantity(dto.amountUsd, "amountUsd");
    return {
      sourceLeg: srcAsset ? { usd: usd.negated() } : { toman: -toman },
      destLeg: dstAsset ? { usd } : { toman },
      amounts: { toman, usd },
      description: srcAsset
        ? `فروش ${formatQuantityFa(usd.toString())} دلار به حساب ${bank.name}`
        : `خرید ${formatQuantityFa(usd.toString())} دلار از حساب ${bank.name}`,
    };
  }

  private tomanTomanDescription(source: ResolvedAsset, dest: ResolvedAsset, toman: bigint): string {
    const amount = formatTomanFa(toman);
    if (dest.kind === AssetKind.FUND) {
      return `واریز ${amount} تومان از حساب ${source.name}`;
    }
    if (source.kind === AssetKind.FUND) {
      return `برداشت ${amount} تومان از صندوق ${source.name} به حساب ${dest.name}`;
    }
    return `انتقال ${amount} تومان از حساب ${source.name} به حساب ${dest.name}`;
  }

  private async assertSourceCanDebit(
    tx: PrismaTx,
    source: ResolvedAsset,
    leg: LegValue,
  ): Promise<void> {
    const balance = await this.registry.balanceOf(tx, source);
    if (source.currency === "TOMAN") {
      const debit = leg.toman ?? 0n; // negative
      if ((balance as bigint) + debit < 0n) {
        throw ApiError.insufficientBalance();
      }
      return;
    }
    const current = balance as Decimal;
    const debit = new Decimal((source.currency === "GRAM" ? leg.gram : leg.usd)?.toString() ?? "0");
    if (current.plus(debit).isNegative()) {
      throw ApiError.insufficientAssetQuantity();
    }
  }

  private movement(
    userId: string,
    asset: ResolvedAsset,
    leg: LegValue,
    occurredAt: Date,
    transferId: string,
  ) {
    return {
      userId,
      assetKind: asset.kind,
      assetId: asset.id,
      reason: "TRANSFER" as const,
      transferId,
      occurredAt,
      ...(leg.toman !== undefined ? { amountToman: leg.toman } : {}),
      ...(leg.gram !== undefined ? { amountGram: leg.gram.toString() } : {}),
      ...(leg.usd !== undefined ? { amountUsd: leg.usd.toString() } : {}),
    };
  }

  private transferAmountColumns(amounts: LegValue) {
    return {
      ...(amounts.toman !== undefined ? { amountToman: amounts.toman } : {}),
      ...(amounts.gram !== undefined ? { amountGram: amounts.gram.toString() } : {}),
      ...(amounts.usd !== undefined ? { amountUsd: amounts.usd.toString() } : {}),
    };
  }

  private toDto(transfer: Transfer, source: AssetRefDto, dest: AssetRefDto): TransferDto {
    return {
      id: transfer.id,
      source,
      destination: dest,
      amountToman: transfer.amountToman === null ? null : Number(transfer.amountToman),
      amountGram: transfer.amountGram === null ? null : transfer.amountGram.toString(),
      amountUsd: transfer.amountUsd === null ? null : transfer.amountUsd.toString(),
      description: transfer.description,
      occurredAt: transfer.occurredAt.toISOString(),
      createdAt: transfer.createdAt.toISOString(),
    };
  }

  async list(
    userId: string,
    assetKind: AssetKind | undefined,
    page: PageRequest,
  ): Promise<PaginatedResponse<TransferDto>> {
    const where: Prisma.TransferWhereInput = {
      userId,
      ...(assetKind !== undefined
        ? {
            OR: [{ sourceKind: assetKind }, { destinationKind: assetKind }],
          }
        : {}),
    };
    const [transfers, total] = await Promise.all([
      this.prisma.transfer.findMany({
        where,
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.transfer.count({ where }),
    ]);
    const data = await Promise.all(
      transfers.map(async (t) =>
        this.toDto(
          t,
          {
            kind: t.sourceKind,
            id: t.sourceId,
            name: await this.labelFor(userId, t.sourceKind, t.sourceId),
          },
          {
            kind: t.destinationKind,
            id: t.destinationId,
            name: await this.labelFor(userId, t.destinationKind, t.destinationId),
          },
        ),
      ),
    );
    return paginate(data, total, page);
  }

  private async labelFor(userId: string, kind: AssetKind, id: string): Promise<string> {
    switch (kind) {
      case AssetKind.GOLD:
        return "طلا";
      case AssetKind.USD:
        return "دلار";
      case AssetKind.BANK: {
        const account = await this.prisma.bankAccount.findFirst({ where: { id, userId } });
        return account?.name ?? "حساب حذف‌شده";
      }
      case AssetKind.FUND: {
        const fund = await this.prisma.fund.findFirst({ where: { id, userId } });
        return fund?.name ?? "صندوق حذف‌شده";
      }
    }
  }
}

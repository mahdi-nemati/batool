import { Injectable } from "@nestjs/common";
import { Prisma } from "@batool/database";
import {
  AssetKind,
  TransactionType,
  type FinancialTransactionDto,
  type TransactionShareDto,
} from "@batool/types";
import { PrismaService } from "../database/prisma.service";
import { ApiError } from "../common/errors/api-error";
import { parseToman } from "../common/validation/money";
import { AssetRegistryService, type ResolvedAsset } from "../assets/asset-registry.service";
import { formatTomanFa } from "../common/formatting/fa";
import { DebtsService } from "../debts/debts.service";
import type { CreateTransactionDto } from "./dto/transaction.dto";

type TxWithRels = Prisma.FinancialTransactionGetPayload<{
  include: { category: true; shares: true };
}>;

export interface ListFilters {
  type?: TransactionType | undefined;
  categoryId?: string | undefined;
  assetKind?: AssetKind | undefined;
  assetId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AssetRegistryService,
    private readonly debts: DebtsService,
  ) {}

  async create(userId: string, dto: CreateTransactionDto): Promise<FinancialTransactionDto> {
    const amount = parseToman(dto.amountToman);
    const occurredAt = this.parseOccurredAt(dto.occurredAt);
    const description = this.cleanDescription(dto.description);

    // Direct Income/Expense entries are bank-only. Funds move through transfers;
    // Gold/USD are separate native-currency trade wallets.
    if (dto.assetKind !== AssetKind.BANK) {
      throw ApiError.validation("assetKind", "درآمد و هزینه مستقیم فقط از حساب بانکی مجاز است");
    }

    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (category === null) {
      throw ApiError.notFound();
    }
    if (!category.isActive) {
      throw ApiError.validation("categoryId", "این دسته‌بندی غیرفعال است و قابل انتخاب نیست");
    }
    if (category.type !== dto.type) {
      throw ApiError.validation("categoryId", "نوع دسته‌بندی با نوع تراکنش مطابقت ندارد");
    }

    const isExpense = dto.type === TransactionType.EXPENSE;
    // Owner share = total - participants (participants are the OTHER people's shares).
    const participants = isExpense ? (dto.shares ?? []) : [];
    let ownerShare = amount;
    const participantData: { label: string; amount: bigint; counterpartyId?: string }[] = [];
    if (isExpense && participants.length > 0) {
      let sum = 0n;
      for (const p of participants) {
        const pAmount = parseToman(p.amountToman, "shares");
        const label = p.label.trim();
        if (label.length === 0) {
          throw ApiError.validation("shares", "نام شرکت‌کننده نمی‌تواند خالی باشد");
        }
        // Fail fast on an unresolvable/inactive counterparty (404 / archived).
        if (p.counterpartyId !== undefined) {
          await this.debts.assertActiveOwned(this.prisma, userId, p.counterpartyId);
        }
        participantData.push({
          label,
          amount: pAmount,
          ...(p.counterpartyId !== undefined ? { counterpartyId: p.counterpartyId } : {}),
        });
        sum += pAmount;
      }
      ownerShare = amount - sum;
      if (ownerShare <= 0n) {
        throw ApiError.validation(
          "shares",
          `سهم‌های شرکت‌کنندگان (${formatTomanFa(sum)} تومان) باید کمتر از مبلغ کل (${formatTomanFa(amount)} تومان) باشد`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const asset = await this.registry.resolve(tx, userId, dto.assetKind, dto.assetId);
      // resolve() guarantees ownership; only Toman assets reach here.
      if (asset.currency !== "TOMAN") {
        throw ApiError.validation("assetId", "منبع باید حساب بانکی یا صندوق باشد");
      }

      if (isExpense) {
        await this.registry.lock(tx, asset, userId);
        const balance = await this.registry.balanceOf(tx, asset);
        if ((balance as bigint) - amount < 0n) {
          throw ApiError.insufficientBalance();
        }
      }

      const transaction = await tx.financialTransaction.create({
        data: {
          userId,
          type: dto.type,
          amountToman: amount,
          categoryId: category.id,
          assetKind: asset.kind,
          assetId: asset.id,
          ...(description !== undefined ? { description } : {}),
          occurredAt,
        },
      });

      const participantRows: { id: string; label: string; amount: bigint }[] = [];
      if (isExpense) {
        await tx.transactionShare.create({
          data: { transactionId: transaction.id, isOwner: true, amountToman: ownerShare },
        });
        for (const p of participantData) {
          const share = await tx.transactionShare.create({
            data: {
              transactionId: transaction.id,
              isOwner: false,
              label: p.label,
              amountToman: p.amount,
            },
          });
          participantRows.push({ id: share.id, label: p.label, amount: p.amount });
          // A resolved participant also becomes a receivable Debt Event, linked to
          // this share. No extra cash movement / expense is created here.
          if (p.counterpartyId !== undefined) {
            await this.debts.createReceivableForShare(tx, {
              userId,
              counterpartyId: p.counterpartyId,
              shareId: share.id,
              amount: p.amount,
              occurredAt,
            });
          }
        }
      }

      // Single signed ledger leg: expense reduces the source, income increases it.
      await tx.assetMovement.create({
        data: {
          userId,
          assetKind: asset.kind,
          assetId: asset.id,
          reason: isExpense ? "EXPENSE" : "INCOME",
          transactionId: transaction.id,
          amountToman: isExpense ? -amount : amount,
          occurredAt,
        },
      });

      return this.toDto(
        transaction,
        asset,
        ownerShare,
        participantRows,
        category.name,
        category.isActive,
        category.type,
        isExpense,
      );
    });
  }

  async list(userId: string, filters: ListFilters): Promise<FinancialTransactionDto[]> {
    const rows = await this.prisma.financialTransaction.findMany({
      where: this.buildWhere(userId, filters),
      orderBy: { occurredAt: "desc" },
      include: { category: true, shares: true },
      take: 200,
    });
    return Promise.all(rows.map((r) => this.toDtoFromRels(userId, r)));
  }

  async get(userId: string, id: string): Promise<FinancialTransactionDto> {
    const row = await this.prisma.financialTransaction.findFirst({
      where: { id, userId },
      include: { category: true, shares: true },
    });
    if (row === null) {
      throw ApiError.notFound();
    }
    return this.toDtoFromRels(userId, row);
  }

  private buildWhere(userId: string, filters: ListFilters): Prisma.FinancialTransactionWhereInput {
    const where: Prisma.FinancialTransactionWhereInput = { userId };
    if (filters.type !== undefined) where.type = filters.type;
    if (filters.categoryId !== undefined) where.categoryId = filters.categoryId;
    if (filters.assetKind !== undefined) where.assetKind = filters.assetKind;
    if (filters.assetId !== undefined) where.assetId = filters.assetId;
    if (filters.from !== undefined || filters.to !== undefined) {
      const gte = filters.from !== undefined ? new Date(filters.from) : undefined;
      const lte = filters.to !== undefined ? new Date(filters.to) : undefined;
      if (gte !== undefined && Number.isNaN(gte.getTime())) {
        throw ApiError.validation("from", "تاریخ شروع نامعتبر است");
      }
      if (lte !== undefined && Number.isNaN(lte.getTime())) {
        throw ApiError.validation("to", "تاریخ پایان نامعتبر است");
      }
      where.occurredAt = {
        ...(gte !== undefined ? { gte } : {}),
        ...(lte !== undefined ? { lte } : {}),
      };
    }
    return where;
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

  private cleanDescription(value: string | undefined): string | undefined {
    if (value === undefined) {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }

  private async labelFor(userId: string, kind: AssetKind, id: string): Promise<string> {
    if (kind === AssetKind.BANK) {
      const account = await this.prisma.bankAccount.findFirst({ where: { id, userId } });
      return account?.name ?? "حساب حذف‌شده";
    }
    const fund = await this.prisma.fund.findFirst({ where: { id, userId } });
    return fund?.name ?? "صندوق حذف‌شده";
  }

  private toDtoFromRels(userId: string, row: TxWithRels): Promise<FinancialTransactionDto> {
    const isExpense = row.type === TransactionType.EXPENSE;
    const owner = row.shares.find((s) => s.isOwner);
    const ownerShare = owner !== undefined ? owner.amountToman : row.amountToman;
    const participantShares: TransactionShareDto[] = row.shares
      .filter((s) => !s.isOwner)
      .map((s) => ({
        id: s.id,
        isOwner: false,
        label: s.label,
        amountToman: Number(s.amountToman),
      }));

    return this.labelFor(userId, row.assetKind, row.assetId).then((assetName) => ({
      id: row.id,
      type: row.type,
      amountToman: Number(row.amountToman),
      category: {
        id: row.category.id,
        name: row.category.name,
        type: row.category.type,
        isActive: row.category.isActive,
      },
      asset: { kind: row.assetKind, id: row.assetId, name: assetName },
      description: row.description,
      occurredAt: row.occurredAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      personalToman: isExpense ? Number(ownerShare) : Number(row.amountToman),
      participantShares,
      isSplit: isExpense && participantShares.length > 0,
    }));
  }

  private toDto(
    transaction: Prisma.FinancialTransactionGetPayload<object>,
    asset: ResolvedAsset,
    ownerShare: bigint,
    participants: { id: string; label: string; amount: bigint }[],
    categoryName: string,
    categoryActive: boolean,
    categoryType: string,
    isExpense: boolean,
  ): FinancialTransactionDto {
    const participantShares: TransactionShareDto[] = participants.map((p) => ({
      id: p.id,
      isOwner: false,
      label: p.label,
      amountToman: Number(p.amount),
    }));
    return {
      id: transaction.id,
      type: transaction.type,
      amountToman: Number(transaction.amountToman),
      category: {
        id: transaction.categoryId,
        name: categoryName,
        type: categoryType as FinancialTransactionDto["category"]["type"],
        isActive: categoryActive,
      },
      asset: { kind: asset.kind, id: asset.id, name: asset.name },
      description: transaction.description,
      occurredAt: transaction.occurredAt.toISOString(),
      createdAt: transaction.createdAt.toISOString(),
      personalToman: isExpense ? Number(ownerShare) : Number(transaction.amountToman),
      participantShares,
      isSplit: isExpense && participantShares.length > 0,
    };
  }
}

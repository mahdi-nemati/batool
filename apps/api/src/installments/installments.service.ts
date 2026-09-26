import { Injectable } from "@nestjs/common";
import { Prisma } from "@batool/database";
import type { Installment, InstallmentPayment as InstallmentPaymentRow } from "@batool/database";
import {
  AssetKind,
  InstallmentStatus,
  type InstallmentDetailDto,
  type InstallmentDto,
  type InstallmentPaymentDto,
} from "@batool/types";
import { PrismaService } from "../database/prisma.service";
import { ApiError } from "../common/errors/api-error";
import { AssetRegistryService } from "../assets/asset-registry.service";
import { formatTomanFa } from "../common/formatting/fa";
import { dueDateForOccurrence, occurrenceStatus } from "./due-date";
import type {
  CreateInstallmentDto,
  PayInstallmentDto,
  UpdateInstallmentDto,
} from "./dto/installment.dto";

const INSTALLMENT_CATEGORY_NAME = "اقساط";

@Injectable()
export class InstallmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AssetRegistryService,
  ) {}

  // ---- create / read ------------------------------------------------------

  async create(userId: string, dto: CreateInstallmentDto): Promise<InstallmentDto> {
    const startDate = new Date(dto.startDate);
    if (Number.isNaN(startDate.getTime())) {
      throw ApiError.validation("startDate", "تاریخ شروع نامعتبر است");
    }
    const name = dto.name.trim();
    if (name.length === 0) {
      throw ApiError.validation("name", "نام نمی‌تواند خالی باشد");
    }
    const installment = await this.prisma.installment.create({
      data: {
        userId,
        name,
        amountToman: BigInt(dto.amountToman),
        totalCount: dto.totalCount,
        dueDayOfMonth: dto.dueDayOfMonth,
        startDate,
        ...(dto.description?.trim() ? { description: dto.description.trim() } : {}),
      },
    });
    return this.toDto(installment, 0);
  }

  async list(userId: string): Promise<InstallmentDto[]> {
    const rows = await this.prisma.installment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    const counts = await this.paidCounts(userId);
    return rows.map((r) => this.toDto(r, counts.get(r.id) ?? 0));
  }

  async detail(userId: string, id: string): Promise<InstallmentDetailDto> {
    const installment = await this.prisma.installment.findFirst({ where: { id, userId } });
    if (installment === null) {
      throw ApiError.notFound();
    }
    const payments = await this.prisma.installmentPayment.findMany({
      where: { installmentId: id },
      orderBy: { occurrenceNo: "asc" },
    });
    return {
      installment: this.toDto(installment, payments.length),
      payments: payments.map((p) => this.toPaymentDto(p)),
    };
  }

  async payments(userId: string, id: string): Promise<InstallmentPaymentDto[]> {
    await this.assertOwned(userId, id);
    const rows = await this.prisma.installmentPayment.findMany({
      where: { installmentId: id },
      orderBy: { occurrenceNo: "asc" },
    });
    return rows.map((p) => this.toPaymentDto(p));
  }

  // ---- edit (guarded) -----------------------------------------------------

  async update(userId: string, id: string, dto: UpdateInstallmentDto): Promise<InstallmentDto> {
    const installment = await this.assertOwned(userId, id);
    const paid = await this.prisma.installmentPayment.count({ where: { installmentId: id } });

    const data: Prisma.InstallmentUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name.length === 0) {
        throw ApiError.validation("name", "نام نمی‌تواند خالی باشد");
      }
      data.name = name;
    }
    if (dto.description !== undefined) {
      data.description = dto.description.trim().length === 0 ? null : dto.description.trim();
    }
    if (dto.archived !== undefined) {
      data.archived = dto.archived;
    }

    const touchesSchedule =
      dto.amountToman !== undefined ||
      dto.totalCount !== undefined ||
      dto.dueDayOfMonth !== undefined ||
      dto.startDate !== undefined;
    if (touchesSchedule) {
      // Financial/schedule fields are frozen once any payment exists, so
      // historical occurrences keep their meaning.
      if (paid > 0) {
        throw ApiError.conflict(
          "پس از ثبت اولین پرداخت، مبلغ/تعداد/روز/تاریخ شروع قابل تغییر نیست",
        );
      }
      if (dto.amountToman !== undefined) data.amountToman = BigInt(dto.amountToman);
      if (dto.totalCount !== undefined) data.totalCount = dto.totalCount;
      if (dto.dueDayOfMonth !== undefined) data.dueDayOfMonth = dto.dueDayOfMonth;
      if (dto.startDate !== undefined) {
        const sd = new Date(dto.startDate);
        if (Number.isNaN(sd.getTime())) {
          throw ApiError.validation("startDate", "تاریخ شروع نامعتبر است");
        }
        data.startDate = sd;
      }
    }

    const updated =
      Object.keys(data).length === 0
        ? installment
        : await this.prisma.installment.update({ where: { id }, data });
    return this.toDto(updated, paid);
  }

  // ---- payment (atomic, single Expense + ledger movement) -----------------

  async pay(userId: string, id: string, dto: PayInstallmentDto): Promise<InstallmentDetailDto> {
    return this.prisma.$transaction(async (tx) => {
      const installment = await tx.installment.findFirst({ where: { id, userId } });
      if (installment === null) {
        throw ApiError.notFound();
      }
      if (installment.archived) {
        throw ApiError.conflict("این اقساط بایگانی شده است");
      }
      const paid = await tx.installmentPayment.count({ where: { installmentId: id } });
      if (paid >= installment.totalCount) {
        throw ApiError.conflict("همه اقساط پرداخت شده است");
      }

      const occurrenceNo = paid + 1;
      const amount = installment.amountToman; // SERVER source of truth (client sends none)
      const dueDate = dueDateForOccurrence(
        installment.startDate,
        installment.dueDayOfMonth,
        occurrenceNo,
      );

      const category = await tx.category.findFirst({
        where: { name: INSTALLMENT_CATEGORY_NAME, type: "EXPENSE" },
        orderBy: { isActive: "desc" },
      });
      if (category === null) {
        throw ApiError.internal(`دسته‌بندی «${INSTALLMENT_CATEGORY_NAME}» یافت نشد`);
      }

      const asset = await this.registry.resolve(tx, userId, dto.assetKind, dto.assetId);
      // Defensive: the DTO already restricts this to BANK, never trust the client.
      if (asset.kind !== AssetKind.BANK) {
        throw ApiError.validation("assetKind", "پرداخت قسط فقط از حساب بانکی انجام می‌شود");
      }
      await this.registry.lock(tx, asset, userId);
      const balance = await this.registry.balanceOf(tx, asset);
      if ((balance as bigint) - amount < 0n) {
        throw ApiError.insufficientBalance();
      }

      const now = new Date();
      const description = `پرداخت قسط ${installment.name} - قسط ${formatTomanFa(occurrenceNo)} از ${formatTomanFa(installment.totalCount)} (${formatTomanFa(amount)} تومان)`;

      const transaction = await tx.financialTransaction.create({
        data: {
          userId,
          type: "EXPENSE",
          amountToman: amount,
          categoryId: category.id,
          assetKind: asset.kind,
          assetId: asset.id,
          description,
          occurredAt: now,
        },
      });
      await tx.assetMovement.create({
        data: {
          userId,
          assetKind: asset.kind,
          assetId: asset.id,
          reason: "EXPENSE",
          transactionId: transaction.id,
          amountToman: -amount,
          occurredAt: now,
        },
      });

      let payment: InstallmentPaymentRow;
      try {
        payment = await tx.installmentPayment.create({
          data: {
            installmentId: id,
            occurrenceNo,
            amountToman: amount,
            dueDate,
            paidAt: now,
            financialTransactionId: transaction.id,
            description,
          },
        });
      } catch (error) {
        // @@unique(installmentId, occurrenceNo): a concurrent request already paid
        // this occurrence → roll back cleanly (no double-pay, no orphan ledger leg).
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw ApiError.conflict("این قسط همین حالا پرداخت شده است");
        }
        throw error;
      }

      const fresh = await tx.installment.findUniqueOrThrow({ where: { id } });
      return {
        installment: this.toDto(fresh, paid + 1),
        payments: [this.toPaymentDto(payment)],
      };
    });
  }

  // ---- helpers ------------------------------------------------------------

  private async assertOwned(userId: string, id: string): Promise<Installment> {
    const installment = await this.prisma.installment.findFirst({ where: { id, userId } });
    if (installment === null) {
      throw ApiError.notFound();
    }
    return installment;
  }

  private async paidCounts(userId: string): Promise<Map<string, number>> {
    const grouped = await this.prisma.installmentPayment.groupBy({
      by: ["installmentId"],
      where: { installment: { userId } },
      _count: { _all: true },
    });
    const map = new Map<string, number>();
    for (const g of grouped) {
      map.set(g.installmentId, g._count._all);
    }
    return map;
  }

  private toDto(installment: Installment, paid: number): InstallmentDto {
    const remaining = Math.max(installment.totalCount - paid, 0);
    const completed = paid >= installment.totalCount;

    let nextOccurrenceNo: number | null = null;
    let nextDueDate: Date | null = null;
    let status: InstallmentStatus;
    if (installment.archived) {
      status = InstallmentStatus.ARCHIVED;
    } else if (completed) {
      status = InstallmentStatus.COMPLETED;
    } else {
      nextOccurrenceNo = paid + 1;
      nextDueDate = dueDateForOccurrence(
        installment.startDate,
        installment.dueDayOfMonth,
        nextOccurrenceNo,
      );
      status = occurrenceStatus(nextDueDate) as InstallmentStatus;
    }

    return {
      id: installment.id,
      name: installment.name,
      description: installment.description,
      amountToman: Number(installment.amountToman),
      totalCount: installment.totalCount,
      paidCount: paid,
      remainingCount: remaining,
      dueDayOfMonth: installment.dueDayOfMonth,
      startDate: installment.startDate.toISOString(),
      status,
      nextOccurrenceNo,
      nextDueDate: nextDueDate ? nextDueDate.toISOString() : null,
      archived: installment.archived,
      createdAt: installment.createdAt.toISOString(),
      updatedAt: installment.updatedAt.toISOString(),
    };
  }

  private toPaymentDto(p: InstallmentPaymentRow): InstallmentPaymentDto {
    return {
      id: p.id,
      occurrenceNo: p.occurrenceNo,
      amountToman: Number(p.amountToman),
      dueDate: p.dueDate.toISOString(),
      paidAt: p.paidAt.toISOString(),
      financialTransactionId: p.financialTransactionId,
      description: p.description,
    };
  }
}

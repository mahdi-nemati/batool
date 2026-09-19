import { Injectable } from "@nestjs/common";
import { Prisma } from "@batool/database";
import type {
  SetarProfile,
  SetarSession as SetarSessionRow,
  SetarTuitionPayment as SetarTuitionPaymentRow,
} from "@batool/database";
import type { SetarSessionDto, SetarStatusDto, SetarTuitionPaymentDto } from "@batool/types";
import { PrismaService } from "../database/prisma.service";
import { ApiError } from "../common/errors/api-error";
import { AssetRegistryService } from "../assets/asset-registry.service";
import { formatTomanFa } from "../common/formatting/fa";
import { cycleProgress, sessionRangeForCycle, SESSIONS_PER_PAYMENT } from "./cycle";
import type {
  CreateSetarDto,
  CreateSetarSessionDto,
  PaySetarTuitionDto,
  UpdateSetarDto,
} from "./dto/setar.dto";

// Must match the seeded system EXPENSE category (protected like «اقساط»: a system
// category can never be flipped to INCOME, so historical payments stay valid).
const SETAR_CATEGORY_NAME = "شهریه سه‌تار";

@Injectable()
export class SetarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AssetRegistryService,
  ) {}

  // ---- read ----------------------------------------------------------------

  async status(userId: string): Promise<SetarStatusDto> {
    const profile = await this.prisma.setarProfile.findUnique({ where: { userId } });
    if (profile === null) {
      return this.emptyStatus();
    }
    return this.buildStatus(profile, await this.deriveProgress(this.prisma, profile.id));
  }

  async sessions(userId: string): Promise<SetarSessionDto[]> {
    const profile = await this.prisma.setarProfile.findUnique({ where: { userId } });
    if (profile === null) {
      return [];
    }
    const rows = await this.prisma.setarSession.findMany({
      where: { setarProfileId: profile.id },
      orderBy: { sessionNo: "asc" },
      take: 100,
    });
    return rows.map((s) => this.toSessionDto(s));
  }

  async payments(userId: string): Promise<SetarTuitionPaymentDto[]> {
    const profile = await this.prisma.setarProfile.findUnique({ where: { userId } });
    if (profile === null) {
      return [];
    }
    const rows = await this.prisma.setarTuitionPayment.findMany({
      where: { setarProfileId: profile.id },
      orderBy: { cycleNo: "asc" },
      take: 100,
    });
    return rows.map((p) => this.toPaymentDto(p));
  }

  // ---- create / edit (guarded) ---------------------------------------------

  async create(userId: string, dto: CreateSetarDto): Promise<SetarStatusDto> {
    const existing = await this.prisma.setarProfile.findUnique({ where: { userId } });
    if (existing !== null) {
      throw ApiError.conflict("پروفایل سه‌تار برای این کاربر قبلاً ایجاد شده است");
    }
    const profile = await this.prisma.setarProfile.create({
      data: { userId, tuitionAmountToman: BigInt(dto.tuitionAmountToman) },
    });
    return this.buildStatus(profile, { totalSessions: 0, paidCycleCount: 0 });
  }

  async update(userId: string, id: string, dto: UpdateSetarDto): Promise<SetarStatusDto> {
    const profile = await this.assertOwned(userId, id);
    const data: Prisma.SetarProfileUpdateInput = {};
    if (dto.tuitionAmountToman !== undefined) {
      // The CURRENT tuition. Only future unpaid cycles use it — historical
      // payments keep their amountToman snapshot untouched.
      data.tuitionAmountToman = BigInt(dto.tuitionAmountToman);
    }
    if (dto.archived !== undefined) {
      data.archived = dto.archived;
    }
    const updated =
      Object.keys(data).length === 0
        ? profile
        : await this.prisma.setarProfile.update({ where: { id }, data });
    return this.buildStatus(updated, await this.deriveProgress(this.prisma, updated.id));
  }

  // ---- sessions ------------------------------------------------------------

  async createSession(userId: string, dto: CreateSetarSessionDto): Promise<SetarStatusDto> {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.setarProfile.findUnique({ where: { userId } });
      if (profile === null) {
        throw ApiError.notFound();
      }
      // Serialize all Setar writes for this profile: session numbering and the
      // derived cycle state must be computed from a stable snapshot.
      await this.lockProfile(tx, profile.id);
      if (profile.archived) {
        throw ApiError.conflict("این پروفایل سه‌تار بایگانی شده است");
      }
      const totalSessions = await tx.setarSession.count({
        where: { setarProfileId: profile.id },
      });
      const occurredAt = this.parseOccurredAt(dto.occurredAt);
      // sessionNo is a never-reused global sequence; @@unique(setarProfileId,
      // sessionNo) is the final database-level guard against double numbering.
      let created: SetarSessionRow;
      try {
        created = await tx.setarSession.create({
          data: {
            setarProfileId: profile.id,
            sessionNo: totalSessions + 1,
            occurredAt,
            ...(dto.description?.trim() ? { description: dto.description.trim() } : {}),
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw ApiError.conflict("این جلسه هم‌زمان ثبت شده است؛ دوباره تلاش کنید");
        }
        throw error;
      }
      const paidCycleCount = await tx.setarTuitionPayment.count({
        where: { setarProfileId: profile.id },
      });
      return this.buildStatus(profile, { totalSessions: created.sessionNo, paidCycleCount });
    });
  }

  // ---- tuition payment (atomic Expense + ledger movement) ------------------

  async pay(userId: string, dto: PaySetarTuitionDto): Promise<SetarStatusDto> {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.setarProfile.findUnique({ where: { userId } });
      if (profile === null) {
        throw ApiError.notFound();
      }
      // Serialize with other Setar writes on this profile so the target cycle is
      // computed from a stable snapshot (the @@unique cycleNo guard stays as the
      // final database-level backstop).
      await this.lockProfile(tx, profile.id);
      if (profile.archived) {
        throw ApiError.conflict("این پروفایل سه‌تار بایگانی شده است");
      }
      if (profile.tuitionAmountToman <= 0n) {
        throw ApiError.internal("مبلغ شهریه سه‌تار نامعتبر است");
      }

      const [totalSessions, paidCycleCount] = await Promise.all([
        tx.setarSession.count({ where: { setarProfileId: profile.id } }),
        tx.setarTuitionPayment.count({ where: { setarProfileId: profile.id } }),
      ]);
      const progress = cycleProgress(totalSessions, paidCycleCount);
      if (!progress.tuitionPayable) {
        throw ApiError.conflict(
          progress.currentCycleNo === 1 && totalSessions === 0
            ? "هنوز جلسه‌ای ثبت نشده است"
            : "هنوز چرخه قابل پرداختی وجود ندارد",
        );
      }

      // Everything below is the server-side source of truth — the client sends no
      // amount and no category.
      const amount = profile.tuitionAmountToman;
      const targetCycleNo = progress.currentCycleNo;

      const category = await tx.category.findFirst({
        where: { name: SETAR_CATEGORY_NAME, type: "EXPENSE" },
        orderBy: { isActive: "desc" },
      });
      if (category === null) {
        throw ApiError.internal(`دسته‌بندی «${SETAR_CATEGORY_NAME}» یافت نشد`);
      }

      const asset = await this.registry.resolve(tx, userId, dto.assetKind, dto.assetId);
      if (asset.currency !== "TOMAN") {
        throw ApiError.validation("assetId", "منبع پرداخت باید حساب بانکی یا صندوق باشد");
      }
      await this.registry.lock(tx, asset, userId);
      const balance = await this.registry.balanceOf(tx, asset);
      if ((balance as bigint) - amount < 0n) {
        throw ApiError.insufficientBalance();
      }

      const now = new Date();
      const range = sessionRangeForCycle(targetCycleNo);
      const generatedDescription = `پرداخت شهریه سه‌تار - دوره ${formatTomanFa(targetCycleNo)} (جلسات ${formatTomanFa(range.start)} تا ${formatTomanFa(range.end)}) - ${formatTomanFa(amount)} تومان`;

      // Exactly one Expense ...
      const transaction = await tx.financialTransaction.create({
        data: {
          userId,
          type: "EXPENSE",
          amountToman: amount,
          categoryId: category.id,
          assetKind: asset.kind,
          assetId: asset.id,
          description: generatedDescription,
          occurredAt: now,
        },
      });
      // ... and exactly one signed ledger leg (same as the ordinary Expense flow).
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

      let payment: SetarTuitionPaymentRow;
      try {
        payment = await tx.setarTuitionPayment.create({
          data: {
            setarProfileId: profile.id,
            cycleNo: targetCycleNo,
            amountToman: amount,
            paidAt: now,
            financialTransactionId: transaction.id,
            ...(dto.description?.trim() ? { description: dto.description.trim() } : {}),
          },
        });
      } catch (error) {
        // @@unique(setarProfileId, cycleNo): a concurrent request already paid
        // this cycle → roll everything back (no duplicate Expense / movement /
        // payment record).
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw ApiError.conflict("این چرخه شهریه همین حالا پرداخت شده است");
        }
        throw error;
      }

      return this.buildStatus(profile, {
        totalSessions,
        paidCycleCount: paidCycleCount + 1,
      });
    });
  }

  // ---- helpers -------------------------------------------------------------

  private emptyStatus(): SetarStatusDto {
    return {
      profile: null,
      totalSessions: 0,
      paidCycleCount: 0,
      currentCycleNo: 1,
      sessionsInCurrentCycle: 0,
      sessionsRemainingUntilTuition: SESSIONS_PER_PAYMENT,
      tuitionPayable: false,
    };
  }

  private async deriveProgress(
    client: Prisma.TransactionClient | PrismaService,
    profileId: string,
  ): Promise<{ totalSessions: number; paidCycleCount: number }> {
    const [totalSessions, paidCycleCount] = await Promise.all([
      client.setarSession.count({ where: { setarProfileId: profileId } }),
      client.setarTuitionPayment.count({ where: { setarProfileId: profileId } }),
    ]);
    return { totalSessions, paidCycleCount };
  }

  private buildStatus(
    profile: SetarProfile,
    counts: { totalSessions: number; paidCycleCount: number },
  ): SetarStatusDto {
    const progress = cycleProgress(counts.totalSessions, counts.paidCycleCount);
    return {
      profile: {
        id: profile.id,
        tuitionAmountToman: Number(profile.tuitionAmountToman),
        archived: profile.archived,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      },
      totalSessions: counts.totalSessions,
      paidCycleCount: counts.paidCycleCount,
      currentCycleNo: progress.currentCycleNo,
      sessionsInCurrentCycle: progress.sessionsInCurrentCycle,
      sessionsRemainingUntilTuition: progress.sessionsRemainingUntilTuition,
      tuitionPayable: progress.tuitionPayable,
    };
  }

  private toSessionDto(s: SetarSessionRow): SetarSessionDto {
    return {
      id: s.id,
      sessionNo: s.sessionNo,
      occurredAt: s.occurredAt.toISOString(),
      description: s.description,
      createdAt: s.createdAt.toISOString(),
    };
  }

  private toPaymentDto(p: SetarTuitionPaymentRow): SetarTuitionPaymentDto {
    const range = sessionRangeForCycle(p.cycleNo);
    return {
      id: p.id,
      cycleNo: p.cycleNo,
      sessionStartNo: range.start,
      sessionEndNo: range.end,
      amountToman: Number(p.amountToman),
      paidAt: p.paidAt.toISOString(),
      description: p.description,
      financialTransactionId: p.financialTransactionId,
      createdAt: p.createdAt.toISOString(),
    };
  }

  private async assertOwned(userId: string, id: string): Promise<SetarProfile> {
    const profile = await this.prisma.setarProfile.findFirst({ where: { id, userId } });
    if (profile === null) {
      throw ApiError.notFound();
    }
    return profile;
  }

  private parseOccurredAt(value: number | undefined): Date {
    if (value === undefined) {
      return new Date();
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw ApiError.validation("occurredAt", "تاریخ جلسه نامعتبر است");
    }
    return date;
  }

  private async lockProfile(tx: Prisma.TransactionClient, profileId: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM "SetarProfile" WHERE id = ${profileId} FOR UPDATE`;
  }
}

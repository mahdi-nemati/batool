import { Injectable } from "@nestjs/common";
import { Prisma } from "@batool/database";
import {
  type DashboardBalanceDto,
  type DashboardExpenseCategoryDto,
  type DashboardInstallmentDto,
  type DashboardMonth,
  type DashboardMonthOption,
  type DashboardSummaryDto,
  type FinancialTransactionDto,
} from "@batool/types";
import { PrismaService } from "../database/prisma.service";
import { DebtsService } from "../debts/debts.service";
import { ApiError } from "../common/errors/api-error";
import { dueDateForOccurrence, occurrenceStatus } from "../installments/due-date";
import { SESSIONS_PER_PAYMENT } from "../setar/cycle";

const TEHRAN = "Asia/Tehran";
const persianParts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
  timeZone: TEHRAN,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const persianMonthLabel = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: TEHRAN,
  year: "numeric",
  month: "long",
});

type MonthParts = { year: number; month: number; day: number; hour: number; minute: number };

function parts(date: Date): MonthParts {
  const values = Object.fromEntries(
    persianParts.formatToParts(date).map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: values.year ?? NaN,
    month: values.month ?? NaN,
    day: values.day ?? NaN,
    hour: values.hour ?? NaN,
    minute: values.minute ?? NaN,
  };
}

function monthKey(year: number, month: number): string {
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}`;
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + month - 1 + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function monthStartUtc(year: number, month: number): Date {
  const estimate = Date.UTC(year + 621, 2, 1);
  const start = estimate - 120 * 86400000;
  const end = estimate + 420 * 86400000;
  // Tehran can be offset by half an hour, so scan in half-hour UTC steps to
  // land exactly on the local midnight used for database boundaries.
  for (let timestamp = start; timestamp <= end; timestamp += 1800000) {
    const current = new Date(timestamp);
    const value = parts(current);
    if (
      value.year === year &&
      value.month === month &&
      value.day === 1 &&
      value.hour === 0 &&
      value.minute === 0
    ) {
      return current;
    }
  }
  throw ApiError.validation("month", "ماه انتخاب‌شده معتبر نیست");
}

function resolveMonth(raw: string | undefined): {
  year: number;
  month: number;
  start: Date;
  end: Date;
} {
  const current = parts(new Date());
  const key = raw ?? monthKey(current.year, current.month);
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (match === null) {
    throw ApiError.validation("month", "ماه باید به شکل YYYY-MM باشد");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 1300 || year > 1500 || month < 1 || month > 12) {
    throw ApiError.validation("month", "ماه انتخاب‌شده معتبر نیست");
  }
  const next = shiftMonth(year, month, 1);
  return {
    year,
    month,
    start: monthStartUtc(year, month),
    end: monthStartUtc(next.year, next.month),
  };
}

function monthView(year: number, month: number): DashboardMonth {
  const next = shiftMonth(year, month, 1);
  const start = monthStartUtc(year, month);
  return {
    key: monthKey(year, month),
    label: persianMonthLabel.format(start),
    start: start.toISOString(),
    end: monthStartUtc(next.year, next.month).toISOString(),
  };
}

function monthOptions(year: number, month: number): DashboardMonthOption[] {
  return Array.from({ length: 13 }, (_, index) => {
    const value = shiftMonth(year, month, index - 6);
    const view = monthView(value.year, value.month);
    return { key: view.key, label: view.label };
  });
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly debts: DebtsService,
  ) {}

  async summary(userId: string, rawMonth?: string): Promise<DashboardSummaryDto> {
    const resolved = resolveMonth(rawMonth);
    const month = monthView(resolved.year, resolved.month);
    const [
      banks,
      funds,
      movements,
      gold,
      usd,
      monthlyRows,
      recentRows,
      debtSummary,
      installments,
      setar,
    ] = await Promise.all([
      this.prisma.bankAccount.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      this.prisma.fund.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      this.prisma.assetMovement.groupBy({
        by: ["assetKind", "assetId"],
        where: { userId },
        _sum: { amountToman: true, amountGram: true, amountUsd: true },
      }),
      this.prisma.assetMovement.aggregate({
        where: { userId, assetKind: "GOLD" },
        _sum: { amountGram: true },
      }),
      this.prisma.assetMovement.aggregate({
        where: { userId, assetKind: "USD" },
        _sum: { amountUsd: true },
      }),
      this.prisma.financialTransaction.groupBy({
        by: ["type", "categoryId"],
        where: { userId, occurredAt: { gte: resolved.start, lt: resolved.end } },
        _sum: { amountToman: true },
      }),
      this.prisma.financialTransaction.findMany({
        where: { userId },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        take: 8,
        include: { category: true, shares: true },
      }),
      this.debts.summary(userId),
      this.prisma.installment.findMany({
        where: { userId, archived: false },
        orderBy: { createdAt: "desc" },
      }),
      this.setarSummary(userId),
    ]);

    const balanceByAsset = new Map(
      movements.map((row) => [`${row.assetKind}:${row.assetId}`, row._sum.amountToman ?? 0n]),
    );
    const toBalance = (
      asset: { id: string; name: string; isActive?: boolean },
      kind: "BANK" | "FUND",
    ): DashboardBalanceDto => ({
      id: asset.id,
      name: asset.name,
      isActive: asset.isActive ?? true,
      balanceToman: Number(balanceByAsset.get(`${kind}:${asset.id}`) ?? 0n),
    });
    const bankBalances = banks.map((bank) => toBalance(bank, "BANK"));
    const fundBalances = funds.map((fund) => toBalance({ ...fund, isActive: true }, "FUND"));
    const totalToman = [...bankBalances, ...fundBalances].reduce(
      (sum, item) => sum + item.balanceToman,
      0,
    );

    const categoryIds = monthlyRows.map((row) => row.categoryId);
    const categories = await this.prisma.category.findMany({ where: { id: { in: categoryIds } } });
    const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
    let incomeToman = 0;
    let expenseToman = 0;
    const expenseCategories: DashboardExpenseCategoryDto[] = [];
    for (const row of monthlyRows) {
      const amount = Number(row._sum.amountToman ?? 0n);
      if (row.type === "INCOME") incomeToman += amount;
      if (row.type === "EXPENSE") {
        expenseToman += amount;
        expenseCategories.push({
          categoryId: row.categoryId,
          name: categoryNames.get(row.categoryId) ?? "دسته‌بندی حذف‌شده",
          amountToman: amount,
          percentage: 0,
        });
      }
    }
    for (const item of expenseCategories) {
      item.percentage =
        expenseToman === 0 ? 0 : Math.round((item.amountToman / expenseToman) * 10000) / 100;
    }
    expenseCategories.sort((a, b) => b.amountToman - a.amountToman);

    const assetNames = new Map([
      ...banks.map((bank) => [`BANK:${bank.id}`, bank.name] as const),
      ...funds.map((fund) => [`FUND:${fund.id}`, fund.name] as const),
    ]);
    const recentTransactions = recentRows.map((row) => this.transactionDto(row, assetNames));
    const installmentObligations = await this.installmentObligations(installments);

    return {
      month,
      monthOptions: monthOptions(resolved.year, resolved.month),
      balances: { banks: bankBalances, funds: fundBalances, totalToman },
      quantities: {
        goldGram: (gold._sum.amountGram ?? 0).toString(),
        usd: (usd._sum.amountUsd ?? 0).toString(),
      },
      monthly: { incomeToman, expenseToman, netCashFlowToman: incomeToman - expenseToman },
      expenseCategories,
      recentTransactions,
      debtSummary,
      obligations: { installments: installmentObligations, setar },
    };
  }

  private async installmentObligations(
    installments: Array<Prisma.InstallmentGetPayload<object>>,
  ): Promise<DashboardInstallmentDto[]> {
    const ids = installments.map((item) => item.id);
    if (ids.length === 0) return [];
    const payments = await this.prisma.installmentPayment.groupBy({
      by: ["installmentId"],
      where: { installmentId: { in: ids } },
      _count: { _all: true },
    });
    const paid = new Map(payments.map((item) => [item.installmentId, item._count._all]));
    return installments.flatMap((installment) => {
      const paidCount = paid.get(installment.id) ?? 0;
      if (paidCount >= installment.totalCount) return [];
      const nextDueDate = dueDateForOccurrence(
        installment.startDate,
        installment.dueDayOfMonth,
        paidCount + 1,
      );
      return [
        {
          id: installment.id,
          name: installment.name,
          amountToman: Number(installment.amountToman),
          nextDueDate: nextDueDate.toISOString(),
          status: occurrenceStatus(nextDueDate),
        },
      ];
    });
  }

  private async setarSummary(userId: string): Promise<DashboardSummaryDto["obligations"]["setar"]> {
    const profile = await this.prisma.setarProfile.findUnique({ where: { userId } });
    if (profile === null || profile.archived) {
      return {
        payable: false,
        amountToman: null,
        currentCycleNo: 1,
        sessionsInCurrentCycle: 0,
        sessionsRemaining: SESSIONS_PER_PAYMENT,
      };
    }
    const [sessions, payments] = await Promise.all([
      this.prisma.setarSession.count({ where: { setarProfileId: profile.id } }),
      this.prisma.setarTuitionPayment.count({ where: { setarProfileId: profile.id } }),
    ]);
    const sessionsInCurrentCycle = Math.min(
      Math.max(sessions - payments * SESSIONS_PER_PAYMENT, 0),
      SESSIONS_PER_PAYMENT,
    );
    return {
      payable: sessionsInCurrentCycle === SESSIONS_PER_PAYMENT,
      amountToman: Number(profile.tuitionAmountToman),
      currentCycleNo: payments + 1,
      sessionsInCurrentCycle,
      sessionsRemaining: SESSIONS_PER_PAYMENT - sessionsInCurrentCycle,
    };
  }

  private transactionDto(
    row: Prisma.FinancialTransactionGetPayload<{ include: { category: true; shares: true } }>,
    assetNames: Map<string, string>,
  ): FinancialTransactionDto {
    const owner = row.shares.find((share) => share.isOwner);
    const isExpense = row.type === "EXPENSE";
    return {
      id: row.id,
      type: row.type,
      amountToman: Number(row.amountToman),
      category: {
        id: row.category.id,
        name: row.category.name,
        type: row.category.type,
        isActive: row.category.isActive,
      },
      asset: {
        kind: row.assetKind,
        id: row.assetId,
        name: assetNames.get(`${row.assetKind}:${row.assetId}`) ?? "دارایی",
      },
      description: row.description,
      occurredAt: row.occurredAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      personalToman: isExpense
        ? Number(owner?.amountToman ?? row.amountToman)
        : Number(row.amountToman),
      participantShares: row.shares
        .filter((share) => !share.isOwner)
        .map((share) => ({
          id: share.id,
          isOwner: false,
          label: share.label,
          amountToman: Number(share.amountToman),
        })),
      isSplit: isExpense && row.shares.some((share) => !share.isOwner),
    };
  }
}

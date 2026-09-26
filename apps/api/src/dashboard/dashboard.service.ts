import { Injectable } from "@nestjs/common";
import { Prisma } from "@batool/database";
import { TransactionType } from "@batool/types";
import type {
  DashboardBalanceDto,
  DashboardCategoryDto,
  DashboardInstallmentDto,
  DashboardMonth,
  DashboardMonthOption,
  DashboardStatisticsDto,
  DashboardSummaryDto,
  FinancialTransactionDto,
} from "@batool/types";
import { PrismaService } from "../database/prisma.service";
import { DebtsService } from "../debts/debts.service";
import { ApiError } from "../common/errors/api-error";
import { dueDateForOccurrence, occurrenceStatus } from "../installments/due-date";
import { SESSIONS_PER_PAYMENT } from "../setar/cycle";

/** Minimal projection used for every income/expense aggregation. */
type CashRow = {
  type: TransactionType;
  categoryId: string;
  amountToman: bigint;
  shares: { isOwner: boolean; amountToman: bigint }[];
};

const cashRowSelect = {
  type: true,
  categoryId: true,
  amountToman: true,
  shares: { select: { isOwner: true, amountToman: true } },
} satisfies Prisma.FinancialTransactionSelect;

const timedCashRowSelect = {
  ...cashRowSelect,
  occurredAt: true,
} satisfies Prisma.FinancialTransactionSelect;

/**
 * The amount that belongs to the OWNER for one transaction row.
 *
 * `amountToman` is the total cash that left the account. On a split expense part
 * of that was paid on behalf of other people, so only the owner's own share
 * counts as their expense (the rest is tracked as a receivable debt). Plain
 * expenses have no share rows, so they contribute their full amount.
 */
function ownerAmount(row: CashRow): bigint {
  if (row.type !== TransactionType.EXPENSE) return row.amountToman;
  const owner = row.shares.find((share) => share.isOwner);
  return owner !== undefined ? owner.amountToman : row.amountToman;
}

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
    const [banks, funds, movements, monthlyRows, recentRows, debtSummary, installments, setar] =
      await Promise.all([
        this.prisma.bankAccount.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
        this.prisma.fund.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
        this.prisma.assetMovement.groupBy({
          by: ["assetKind", "assetId"],
          where: { userId },
          _sum: { amountToman: true, amountGram: true, amountUsd: true },
        }),
        this.prisma.financialTransaction.findMany({
          where: { userId, occurredAt: { gte: resolved.start, lt: resolved.end } },
          select: cashRowSelect,
        }),
        this.prisma.financialTransaction.findMany({
          where: { userId },
          orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
          take: 5,
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
    const goldGram = movements
      .filter((row) => row.assetKind === "GOLD")
      .reduce((sum, row) => sum + Number(row._sum.amountGram ?? 0n), 0)
      .toString();
    const usd = movements
      .filter((row) => row.assetKind === "USD")
      .reduce((sum, row) => sum + Number(row._sum.amountUsd ?? 0n), 0)
      .toString();

    const categoryIds = monthlyRows.map((row) => row.categoryId);
    const categories = await this.prisma.category.findMany({ where: { id: { in: categoryIds } } });
    const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
    const totals = this.cashTotals(monthlyRows);
    const expenseCategories = this.categoryBreakdown(
      monthlyRows,
      TransactionType.EXPENSE,
      categoryNames,
    );
    const incomeToman = totals.incomeToman;
    const expenseToman = totals.expenseToman;

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
      quantities: { goldGram, usd },
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
      const today = new Date();
      const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
      const dueUtc = Date.UTC(
        nextDueDate.getUTCFullYear(),
        nextDueDate.getUTCMonth(),
        nextDueDate.getUTCDate(),
      );
      const remainingDays = Math.ceil((dueUtc - todayUtc) / 86400000);
      if (remainingDays > 5) return [];
      return [
        {
          id: installment.id,
          name: installment.name,
          amountToman: Number(installment.amountToman),
          nextDueDate: nextDueDate.toISOString(),
          status: occurrenceStatus(nextDueDate),
          remainingDays,
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

  async statistics(userId: string, rawMonth?: string): Promise<DashboardStatisticsDto> {
    const resolved = resolveMonth(rawMonth);
    const month = monthView(resolved.year, resolved.month);
    const monthValues = Array.from({ length: 7 }, (_, index) => {
      const value = shiftMonth(resolved.year, resolved.month, index - 6);
      return { ...value, view: monthView(value.year, value.month) };
    });
    const firstMonth = monthValues[0];
    const lastMonth = monthValues[6];
    if (firstMonth === undefined || lastMonth === undefined) {
      throw ApiError.validation("month", "ماه انتخاب‌شده معتبر نیست");
    }

    // One index-range scan over the whole 7-month window; month, type and
    // category buckets are derived in JS. This replaces seven monthly groupBy
    // queries and the previous nested summary() call.
    const windowRows = await this.prisma.financialTransaction.findMany({
      where: {
        userId,
        occurredAt: {
          gte: new Date(firstMonth.view.start),
          lt: new Date(lastMonth.view.end),
        },
      },
      select: timedCashRowSelect,
    });
    const categoryIds = [...new Set(windowRows.map((row) => row.categoryId))];
    const [banks, funds, movements, categories, debtSummary, installments, paymentCounts] =
      await Promise.all([
        this.prisma.bankAccount.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
        this.prisma.fund.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
        this.prisma.assetMovement.groupBy({
          by: ["assetKind", "assetId"],
          where: { userId },
          _sum: { amountToman: true, amountGram: true, amountUsd: true },
        }),
        this.prisma.category.findMany({ where: { id: { in: categoryIds } } }),
        this.debts.summary(userId),
        this.prisma.installment.findMany({ where: { userId, archived: false } }),
        this.prisma.installmentPayment.groupBy({
          by: ["installmentId"],
          where: { installment: { userId } },
          _count: { _all: true },
        }),
      ]);

    const names = new Map(categories.map((category) => [category.id, category.name]));
    // Month bounds are resolved once, then each row is bucketed with a numeric
    // comparison instead of re-parsing ISO strings for every month.
    const bounds: [number, number][] = monthValues.map((value) => [
      new Date(value.view.start).getTime(),
      new Date(value.view.end).getTime(),
    ]);
    const buckets: CashRow[][] = monthValues.map(() => []);
    for (const row of windowRows) {
      const timestamp = row.occurredAt.getTime();
      for (let index = 0; index < bounds.length; index += 1) {
        const bound = bounds[index];
        if (bound === undefined) continue;
        if (timestamp >= bound[0] && timestamp < bound[1]) {
          buckets[index]?.push(row);
          break;
        }
      }
    }
    const current = this.cashTotals(buckets[6] ?? []);
    const previous = this.cashTotals(buckets[5] ?? []);

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

    const paidMap = new Map(paymentCounts.map((row) => [row.installmentId, row._count._all]));
    let upcoming = 0;
    let overdue = 0;
    let remaining = 0;
    for (const installment of installments) {
      const paid = paidMap.get(installment.id) ?? 0;
      remaining += Math.max(installment.totalCount - paid, 0);
      if (paid < installment.totalCount) {
        const status = occurrenceStatus(
          dueDateForOccurrence(installment.startDate, installment.dueDayOfMonth, paid + 1),
        );
        if (status === "OVERDUE") overdue += 1;
        else upcoming += 1;
      }
    }
    return {
      month,
      monthOptions: monthOptions(resolved.year, resolved.month),
      monthly: {
        ...current,
        previousIncomeToman: previous.incomeToman,
        previousExpenseToman: previous.expenseToman,
        previousNetCashFlowToman: previous.netCashFlowToman,
      },
      expenseCategories: this.categoryBreakdown(buckets[6] ?? [], TransactionType.EXPENSE, names),
      incomeCategories: this.categoryBreakdown(buckets[6] ?? [], TransactionType.INCOME, names),
      trend: monthValues.map((value, index) => ({
        month: value.view.key,
        label: value.view.label,
        ...this.cashTotals(buckets[index] ?? []),
      })),
      debtSummary,
      installments: {
        active: installments.length,
        upcoming,
        overdue,
        paid: paymentCounts.reduce((sum, row) => sum + row._count._all, 0),
        remaining,
      },
      assets: {
        banks: bankBalances,
        funds: fundBalances,
        totalToman: [...bankBalances, ...fundBalances].reduce(
          (sum, item) => sum + item.balanceToman,
          0,
        ),
        goldGram: movements
          .filter((row) => row.assetKind === "GOLD")
          .reduce((sum, row) => sum + Number(row._sum.amountGram ?? 0n), 0)
          .toString(),
        usd: movements
          .filter((row) => row.assetKind === "USD")
          .reduce((sum, row) => sum + Number(row._sum.amountUsd ?? 0n), 0)
          .toString(),
      },
      // No Setar session/class metrics here on purpose — a Setar tuition payment
      // is an ordinary Expense, so it is already counted above under its own
      // expense category like any other expense.
    };
  }

  /** Income / expense / net totals, counting only the OWNER's share of expenses. */
  private cashTotals(rows: CashRow[]): {
    incomeToman: number;
    expenseToman: number;
    netCashFlowToman: number;
  } {
    let incomeToman = 0n;
    let expenseToman = 0n;
    for (const row of rows) {
      if (row.type === TransactionType.INCOME) incomeToman += ownerAmount(row);
      else expenseToman += ownerAmount(row);
    }
    const income = Number(incomeToman);
    const expense = Number(expenseToman);
    return { incomeToman: income, expenseToman: expense, netCashFlowToman: income - expense };
  }

  /**
   * One entry per category, with every transaction in that category summed
   * together (two "شهریه سه‌تار" rows become a single 2,500,000 row). Uses the
   * owner's share for expenses so a split bill only charges the payer their part.
   */
  private categoryBreakdown(
    rows: CashRow[],
    type: TransactionType,
    names: Map<string, string>,
  ): DashboardCategoryDto[] {
    const byCategory = new Map<string, bigint>();
    for (const row of rows) {
      if (row.type !== type) continue;
      byCategory.set(row.categoryId, (byCategory.get(row.categoryId) ?? 0n) + ownerAmount(row));
    }
    const values = [...byCategory.entries()].map(([categoryId, amount]) => ({
      categoryId,
      name: names.get(categoryId) ?? "دسته‌بندی حذف‌شده",
      amountToman: Number(amount),
      percentage: 0,
    }));
    const total = values.reduce((sum, value) => sum + value.amountToman, 0);
    for (const value of values) {
      value.percentage = total === 0 ? 0 : Math.round((value.amountToman / total) * 10000) / 100;
    }
    return values.sort((a, b) => b.amountToman - a.amountToman);
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

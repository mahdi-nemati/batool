"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardSummaryDto } from "@batool/types";
import {
  Banknote,
  Coins,
  Eye,
  EyeOff,
  Minus,
  Plus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { ApiClientError } from "@/lib/api/client";
import { getDashboardSummary } from "@/lib/api/dashboard";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/formatting/jalali";
import { formatQuantity, formatToman, formatTomanUnit } from "@/lib/formatting/persian";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { AddTransactionDialog } from "@/components/dashboard/AddTransactionDialog";

const percentFormat = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
const wholeFormat = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });

export function DashboardClient() {
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTotals, setShowTotals] = useState(true);
  const [dialog, setDialog] = useState<"INCOME" | "EXPENSE" | null>(null);

  const load = useCallback(() => {
    setError(null);
    getDashboardSummary()
      .then(setSummary)
      .catch((cause) =>
        setError(cause instanceof ApiClientError ? cause.message : "بارگذاری داشبورد ناموفق بود"),
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (summary === null) {
    return error === null ? (
      <DashboardSkeleton />
    ) : (
      <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-danger">{error}</p>
    );
  }

  const cashFlow = summary.monthly.netCashFlowToman;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">خانه مالی</p>
          <h1 className="text-3xl font-bold">داشبورد</h1>
        </div>
        <Link
          href="/dashboard/statistics"
          className="rounded-lg border border-ring/40 px-3 py-2 text-sm font-bold text-primary hover:bg-primary/10"
        >
          مشاهده آمار و تحلیل
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <PortfolioCard
          className="lg:col-span-2"
          label="مانده حساب‌ها و صندوق‌ها"
          totalToman={summary.balances.totalToman}
          cashFlow={cashFlow}
          show={showTotals}
          onToggle={() => setShowTotals((value) => !value)}
        />
        <div className="flex flex-col gap-4">
          <MiniStat
            icon={Coins}
            label="طلا"
            value={formatQuantity(summary.quantities.goldGram)}
            unit="گرم"
          />
          <MiniStat
            icon={Banknote}
            label="دلار"
            value={formatQuantity(summary.quantities.usd)}
            unit="دلار"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <ThisMonthPanel
          className="lg:col-span-3"
          monthly={summary.monthly}
          expenseCategories={summary.expenseCategories}
        />
        <QuickAddPanel className="lg:col-span-2" onAdd={setDialog} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AssetsPanel
          banks={summary.balances.banks}
          funds={summary.balances.funds}
          totalToman={summary.balances.totalToman}
          goldGram={summary.quantities.goldGram}
          usd={summary.quantities.usd}
          show={showTotals}
        />
        <ObligationsPanel installments={summary.obligations.installments} setar={summary.obligations.setar} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TransactionsPanel transactions={summary.recentTransactions} />
        <div className="flex flex-col gap-4">
          <DebtsPanel debtSummary={summary.debtSummary} />
          <SetarPanel setar={summary.obligations.setar} />
        </div>
      </div>

      <AddTransactionDialog
        type={dialog}
        onClose={() => setDialog(null)}
        onSaved={() => {
          load();
          setDialog(null);
        }}
      />
    </div>
  );
}

function PortfolioCard({
  label,
  totalToman,
  cashFlow,
  show,
  onToggle,
  className,
}: {
  label: string;
  totalToman: number;
  cashFlow: number;
  show: boolean;
  onToggle: () => void;
  className?: string | undefined;
}) {
  const animated = useCountUp(show ? totalToman : 0);
  const positive = cashFlow >= 0;
  const CashIcon = positive ? TrendingUp : TrendingDown;
  return (
    <Card className={cn("flex flex-col justify-between", className)}>
      <div className="flex items-start justify-between gap-3 p-6 pb-4">
        <p className="text-sm text-muted">{label}</p>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={show}
          aria-label={show ? "پنهان کردن مبالغ" : "نمایش مبالغ"}
          className="rounded-lg border border-line p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      <div className="p-6 pt-0">
        <div className="flex flex-wrap items-end gap-x-2">
          <span dir="ltr" className="text-4xl font-bold leading-none tabular-nums">
            {show ? wholeFormat.format(animated) : "••••••••"}
          </span>
          <span className="mb-0.5 text-sm text-muted">تومان</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <CashIcon className={cn("size-4", positive ? "text-accent-dark" : "text-danger")} />
          <span className="text-muted">جریان نقدی این ماه</span>
          <b className={cn(positive ? "text-accent-dark" : "text-danger")}>
            {show ? `${positive ? "+" : "−"}${formatToman(cashFlow)}` : "••••"}
          </b>
        </div>
      </div>
    </Card>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  unit,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  unit: string;
  className?: string | undefined;
}) {
  return (
    <Card className={cn("flex flex-1 items-center gap-3 p-6", className)}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-0.5 text-lg font-bold">
          {value} <span className="text-xs font-normal text-muted">{unit}</span>
        </p>
      </div>
    </Card>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <Card className={className}>
      <div className="p-6 pb-4">
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <div className="p-6 pt-0">{children}</div>
    </Card>
  );
}

function ThisMonthPanel({
  monthly,
  expenseCategories,
  className,
}: {
  monthly: DashboardSummaryDto["monthly"];
  expenseCategories: DashboardSummaryDto["expenseCategories"];
  className?: string | undefined;
}) {
  const net = monthly.netCashFlowToman;
  return (
    <Panel className={className} title="خلاصه این ماه">
      <div className="grid grid-cols-3 gap-2">
        <Metric
          label="درآمد"
          value={formatTomanUnit(monthly.incomeToman)}
          tone="positive"
        />
        <Metric label="هزینه" value={formatTomanUnit(monthly.expenseToman)} tone="negative" />
        <Metric
          label="خالص"
          value={formatTomanUnit(net)}
          tone={net >= 0 ? "positive" : "negative"}
        />
      </div>
      {expenseCategories.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs text-muted">بیشترین هزینه‌های این ماه</p>
          <ul className="flex flex-col gap-1.5">
            {expenseCategories.slice(0, 4).map((category) => (
              <li
                key={category.categoryId}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-secondary" dir="ltr">
                    <span
                      className="block h-full rounded-full bg-destructive/70"
                      style={{ width: `${Math.min(100, category.percentage)}%` }}
                    />
                  </span>
                  <span className="truncate">{category.name}</span>
                </span>
                <b className="shrink-0">{formatTomanUnit(category.amountToman)}</b>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative";
}) {
  return (
    <div className="rounded-xl border border-line bg-paper p-3">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm font-bold",
          tone === "positive" ? "text-accent-dark" : "text-danger",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function QuickAddPanel({
  onAdd,
  className,
}: {
  onAdd: (type: "INCOME" | "EXPENSE") => void;
  className?: string | undefined;
}) {
  return (
    <Panel className={className} title="ثبت سریع">
      <div className="flex flex-col gap-2">
        <Button variant="default" size="lg" className="w-full" onClick={() => onAdd("INCOME")}>
          <Plus /> ثبت درآمد
        </Button>
        <Button variant="destructive" size="lg" className="w-full" onClick={() => onAdd("EXPENSE")}>
          <Minus /> ثبت هزینه
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted">
        ثبت سریع بدون خروج از این صفحه؛ برای جزئیات بیشتر صفحه ثبت‌ها را ببینید.
      </p>
    </Panel>
  );
}

function AssetsPanel({
  banks,
  funds,
  totalToman,
  goldGram,
  usd,
  show,
  className,
}: {
  banks: DashboardSummaryDto["balances"]["banks"];
  funds: DashboardSummaryDto["balances"]["funds"];
  totalToman: number;
  goldGram: string;
  usd: string;
  show: boolean;
  className?: string | undefined;
}) {
  const rows: Array<{ id: string; name: string; kind: string; value: number }> = [
    ...banks.map((bank) => ({ id: bank.id, name: bank.name, kind: "بانک", value: bank.balanceToman })),
    ...funds.map((fund) => ({ id: fund.id, name: fund.name, kind: "صندوق", value: fund.balanceToman })),
  ];
  return (
    <Panel className={className} title="خلاصه دارایی‌ها">
      {rows.length === 0 ? (
        <p className="text-sm text-muted">حساب و صندوقی ثبت نشده است.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted">
              <th className="pb-1 text-start font-medium">نام</th>
              <th className="pb-1 text-end font-medium">ارزش</th>
              <th className="pb-1 text-end font-medium">سهم</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const share = totalToman > 0 ? (row.value / totalToman) * 100 : 0;
              return (
                <tr key={row.id} className="border-t border-line">
                  <td className="py-2.5">
                    <span className="font-bold">{row.name}</span>
                    <Badge variant="secondary" className="ms-2">
                      {row.kind}
                    </Badge>
                  </td>
                  <td className="py-2.5 text-end tabular-nums">
                    {show ? formatTomanUnit(row.value) : "••••"}
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary" dir="ltr">
                        <span
                          className="block h-full rounded-full bg-primary"
                          style={{ width: `${share}%` }}
                        />
                      </span>
                      <span className="text-xs text-muted">{percentFormat.format(share)}٪</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-line pt-3 text-sm text-muted">
        <span>
          طلا: <b className="text-foreground">{formatQuantity(goldGram)} گرم</b>
        </span>
        <span>
          دلار: <b className="text-foreground">{formatQuantity(usd)} دلار</b>
        </span>
      </div>
      <p className="mt-2 text-xs text-muted">طلا و دلار بدون ارزش‌گذاری تومانی نمایش داده می‌شوند.</p>
    </Panel>
  );
}

function ObligationsPanel({
  installments,
  setar,
  className,
}: {
  installments: DashboardSummaryDto["obligations"]["installments"];
  setar: DashboardSummaryDto["obligations"]["setar"];
  className?: string | undefined;
}) {
  const empty = installments.length === 0 && !setar.payable;
  return (
    <Panel className={className} title="تعهدات نزدیک">
      {empty ? (
        <p className="text-sm text-muted">تعهد پرداخت‌نشده‌ای در پنج روز آینده نیست.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {installments.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2 text-sm"
            >
              <span>
                <b>{item.name}</b>
                <br />
                <span className="text-muted">
                  {formatJalaliDate(item.nextDueDate)} · {dueLabel(item.remainingDays)}
                </span>
              </span>
              <b>{formatTomanUnit(item.amountToman)}</b>
            </div>
          ))}
          {setar.payable ? (
            <div className="flex justify-between gap-3 rounded-lg bg-paper px-3 py-2 text-sm">
              <b>شهریه سه‌تار</b>
              <b>{formatTomanUnit(setar.amountToman ?? 0)}</b>
            </div>
          ) : null}
        </div>
      )}
    </Panel>
  );
}

function TransactionsPanel({
  transactions,
  className,
}: {
  transactions: DashboardSummaryDto["recentTransactions"];
  className?: string | undefined;
}) {
  return (
    <Panel className={className} title="تراکنش‌های اخیر">
      {transactions.length === 0 ? (
        <p className="text-sm text-muted">تراکنشی ثبت نشده است.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {transactions.map((transaction) => {
            const income = transaction.type === "INCOME";
            return (
              <li
                key={transaction.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Badge variant={income ? "default" : "destructive"}>
                    {income ? "درآمد" : "هزینه"}
                  </Badge>
                  <span className="min-w-0">
                    <b>{transaction.category.name}</b>
                    <span className="block truncate text-muted">
                      {transaction.description ?? transaction.asset.name} ·{" "}
                      {formatJalaliDateTime(transaction.occurredAt)}
                    </span>
                  </span>
                </span>
                <b className={income ? "text-accent-dark" : "text-danger"}>
                  {income ? "+" : "−"}
                  {formatTomanUnit(transaction.amountToman)}
                </b>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function DebtsPanel({
  debtSummary,
  className,
}: {
  debtSummary: DashboardSummaryDto["debtSummary"];
  className?: string | undefined;
}) {
  return (
    <Panel className={className} title="بدهی‌ها">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted">طلب از دیگران</p>
          <p className="mt-1 font-bold">{formatTomanUnit(debtSummary.totalReceivableToman)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">بدهی به دیگران</p>
          <p className="mt-1 font-bold">{formatTomanUnit(debtSummary.totalPayableToman)}</p>
        </div>
      </div>
      <Link href="/dashboard/counterparties" className="mt-4 inline-block text-sm font-bold text-primary">
        جزئیات بدهی‌ها ←
      </Link>
    </Panel>
  );
}

function SetarPanel({
  setar,
  className,
}: {
  setar: DashboardSummaryDto["obligations"]["setar"];
  className?: string | undefined;
}) {
  return (
    <Panel className={className} title="سه‌تار">
      <p className="text-sm">
        <b>{setar.sessionsInCurrentCycle} از ۴</b>
        <span className="text-muted"> جلسه چرخه جاری</span>
        <span className="text-muted"> · چرخه {setar.currentCycleNo}</span>
      </p>
    </Panel>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-60" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-40 rounded-2xl lg:col-span-2" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-56 rounded-2xl lg:col-span-3" />
        <Skeleton className="h-56 rounded-2xl lg:col-span-2" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-60 rounded-2xl" />
        <Skeleton className="h-60 rounded-2xl" />
      </div>
    </div>
  );
}

function dueLabel(days: number): string {
  if (days < 0) return `${formatQuantity(Math.abs(days))} روز معوق`;
  if (days === 0) return "امروز";
  return `${formatQuantity(days)} روز دیگر`;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useCountUp(target: number): number {
  const [value, setValue] = useState(target);
  const reduced = usePrefersReducedMotion();
  const fromRef = useRef(0);
  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    const from = fromRef.current;
    fromRef.current = target;
    if (from === target) return;
    let frame = 0;
    const start = performance.now();
    const duration = 800;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduced]);
  return value;
}
"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardSummaryDto } from "@batool/types";
import { Banknote, CalendarClock, Coins, Eye, EyeOff, Minus, Plus } from "lucide-react";
import { ApiClientError } from "@/lib/api/client";
import { getDashboardSummary } from "@/lib/api/dashboard";
import { formatJalaliDate } from "@/lib/formatting/jalali";
import { formatQuantity, formatTomanUnit } from "@/lib/formatting/persian";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { AddTransactionDialog } from "@/components/dashboard/AddTransactionDialog";

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

      <section aria-label="موقعیت مالی" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">موقعیت مالی</h2>
          <button
            type="button"
            onClick={() => setShowTotals((value) => !value)}
            aria-pressed={showTotals}
            aria-label={showTotals ? "پنهان کردن مبالغ" : "نمایش مبالغ"}
            className="rounded-lg border border-line p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            {showTotals ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <BalanceCard
            label="حساب‌های بانکی"
            items={summary.balances.banks}
            show={showTotals}
            emptyNote="حسابی ثبت نشده است."
            emptyAction={
              <Link href="/dashboard/assets" className="text-sm font-bold text-primary">
                ساخت حساب
              </Link>
            }
          />
          <BalanceCard
            label="صندوق‌ها"
            items={summary.balances.funds}
            show={showTotals}
            emptyNote="صندوقی ثبت نشده است."
            emptyAction={
              <Link href="/dashboard/assets" className="text-sm font-bold text-primary">
                ساخت صندوق
              </Link>
            }
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
      </section>

      <section aria-label="اقدامات سریع و خلاصه ماه" className="grid gap-4 lg:grid-cols-3">
        <QuickActionsPanel onAdd={setDialog} />
        <ThisMonthPanel
          className="lg:col-span-2"
          monthly={summary.monthly}
          monthLabel={summary.month.label}
        />
      </section>

      <UpcomingInstallmentsPanel installments={summary.obligations.installments} />

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

function BalanceCard({
  label,
  items,
  show,
  emptyNote,
  emptyAction,
  className,
}: {
  label: string;
  items: DashboardSummaryDto["balances"]["banks"];
  show: boolean;
  emptyNote: string;
  emptyAction?: React.ReactNode;
  className?: string | undefined;
}) {
  const total = items.reduce((sum, item) => sum + item.balanceToman, 0);
  const animated = useCountUp(show ? total : 0);
  return (
    <Card className={cn("flex flex-col", className)}>
      <div className="p-6 pb-4">
        <p className="text-sm text-muted">{label}</p>
        <div className="mt-2 flex flex-wrap items-end gap-x-2">
          <span dir="ltr" className="text-3xl font-bold leading-none tabular-nums">
            {show ? wholeFormat.format(animated) : "••••••••"}
          </span>
          <span className="mb-0.5 text-sm text-muted">تومان</span>
        </div>
      </div>
      <div className="mt-auto p-6 pt-0">
        {items.length > 0 ? (
          <ul className="flex flex-col divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className={cn("truncate", !item.isActive && "text-muted")}>
                  {item.name}
                  {!item.isActive && (
                    <span className="ms-1 text-xs text-muted">(غیرفعال)</span>
                  )}
                </span>
                <b
                  className={cn(
                    "shrink-0 tabular-nums",
                    !item.isActive && "font-normal text-muted",
                  )}
                >
                  {show ? formatTomanUnit(item.balanceToman) : "••••"}
                </b>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-t border-line pt-3">
            <p className="text-sm text-muted">{emptyNote}</p>
            {emptyAction && <div className="mt-2">{emptyAction}</div>}
          </div>
        )}
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
  monthLabel,
  className,
}: {
  monthly: DashboardSummaryDto["monthly"];
  monthLabel: string;
  className?: string | undefined;
}) {
  const net = monthly.netCashFlowToman;
  return (
    <Panel className={className} title={`خلاصه ${monthLabel}`}>
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

function QuickActionsPanel({
  onAdd,
  className,
}: {
  onAdd: (type: "INCOME" | "EXPENSE") => void;
  className?: string | undefined;
}) {
  return (
    <Panel className={className} title="اقدامات سریع">
      <div className="flex flex-col gap-2">
        <Button variant="destructive" size="lg" className="w-full" onClick={() => onAdd("EXPENSE")}>
          <Minus /> ثبت هزینه
        </Button>
        <Button variant="default" size="lg" className="w-full" onClick={() => onAdd("INCOME")}>
          <Plus /> ثبت درآمد
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted">
        بدون خروج از صفحه؛ جزئیات بیشتر در صفحه تراکنش‌ها.
      </p>
    </Panel>
  );
}

function UpcomingInstallmentsPanel({
  installments,
  className,
}: {
  installments: DashboardSummaryDto["obligations"]["installments"];
  className?: string | undefined;
}) {
  return (
    <Panel className={className} title="پرداخت‌های نزدیک">
      {installments.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="پرداخت نزدیکی در پیش نیست"
          description="هیچ قسطی در پنج روز آینده سررسید ندارد. بقیه پرداخت‌ها را در صفحه اقساط ببینید."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {installments.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2 text-sm"
            >
              <span className="min-w-0">
                <b>{item.name}</b>
                <span className="block truncate text-muted">
                  {formatJalaliDate(item.nextDueDate)} · {dueLabel(item.remainingDays)}
                </span>
              </span>
              <b className="shrink-0">{formatTomanUnit(item.amountToman)}</b>
            </div>
          ))}
          <Link
            href="/dashboard/installments"
            className="mt-2 inline-block text-sm font-bold text-primary"
          >
            همه اقساط ←
          </Link>
        </div>
      )}
    </Panel>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-60 rounded-xl" />
        <Skeleton className="h-60 rounded-xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl lg:col-span-2" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
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
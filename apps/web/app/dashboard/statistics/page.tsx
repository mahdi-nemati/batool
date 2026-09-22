"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, Scale, Landmark } from "lucide-react";
import type { DashboardStatisticsDto } from "@batool/types";
import { ApiClientError } from "@/lib/api/client";
import { getDashboardStatistics } from "@/lib/api/dashboard";
import { formatQuantity, formatTomanUnit } from "@/lib/formatting/persian";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

const decimal = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 });

export default function StatisticsPage() {
  const [data, setData] = useState<DashboardStatisticsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getDashboardStatistics()
      .then(setData)
      .catch((cause) =>
        setError(cause instanceof ApiClientError ? cause.message : "خطا در بارگذاری آمار"),
      );
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-sm font-bold text-primary hover:underline">
            ← داشبورد
          </Link>
          <h1 className="mt-2 text-3xl font-bold">آمار و تحلیل</h1>
          <p className="text-sm text-muted">گزارش مشتق‌شده از دفتر مالی</p>
        </div>
        {data !== null ? (
          <Select
            className="w-44"
            options={data.monthOptions.map((option) => ({ value: option.key, label: option.label }))}
            value={data.month.key}
            onChange={(e) => getDashboardStatistics(e.target.value).then(setData)}
          />
        ) : null}
      </header>

      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {data === null ? (
        !error ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : null
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric
              label="درآمد"
              value={formatTomanUnit(data.monthly.incomeToman)}
              icon={TrendingUp}
              tone="positive"
            />
            <Metric
              label="هزینه"
              value={formatTomanUnit(data.monthly.expenseToman)}
              icon={TrendingDown}
              tone="negative"
            />
            <Metric
              label="خالص"
              value={formatTomanUnit(data.monthly.netCashFlowToman)}
              icon={Scale}
              tone="neutral"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <BreakdownPanel title="هزینه بر اساس دسته‌بندی" rows={data.expenseCategories} tone="negative" />
            <BreakdownPanel title="درآمد بر اساس دسته‌بندی" rows={data.incomeCategories} tone="positive" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" aria-hidden />
                روند هفت ماه اخیر
              </CardTitle>
              <CardDescription>درآمد، هزینه و خالص به ازای هر ماه</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {data.trend.map((row) => (
                  <div
                    key={row.month}
                    className="grid grid-cols-[5rem_1fr_1fr_1fr] items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <b>{row.label}</b>
                    <span className="text-accent-dark tabular-nums">
                      د: {formatTomanUnit(row.incomeToman)}
                    </span>
                    <span className="text-danger tabular-nums">
                      ه: {formatTomanUnit(row.expenseToman)}
                    </span>
                    <b className="tabular-nums">خ: {formatTomanUnit(row.netCashFlowToman)}</b>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">بدهی</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5 text-sm">
                <p className="flex justify-between">
                  <span className="text-muted">طلب:</span>
                  <b className="tabular-nums text-accent-dark">{formatTomanUnit(data.debtSummary.totalReceivableToman)}</b>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted">بدهی:</span>
                  <b className="tabular-nums text-danger">{formatTomanUnit(data.debtSummary.totalPayableToman)}</b>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted">طرف‌حساب‌های باز:</span>
                  <b className="tabular-nums">{decimal.format(data.debtSummary.counterparties.length)}</b>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">اقساط</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5 text-sm">
                <p className="flex justify-between">
                  <span className="text-muted">فعال:</span>
                  <b className="tabular-nums">{decimal.format(data.installments.active)}</b>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted">پیش‌رو / معوق:</span>
                  <b className="tabular-nums">
                    {decimal.format(data.installments.upcoming)} /{" "}
                    {decimal.format(data.installments.overdue)}
                  </b>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted">پرداخت‌شده:</span>
                  <b className="tabular-nums">{decimal.format(data.installments.paid)}</b>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">دارایی و سه‌تار</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5 text-sm">
                <p className="flex justify-between">
                  <span className="text-muted">تومان:</span>
                  <b className="tabular-nums">{formatTomanUnit(data.assets.totalToman)}</b>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted">طلا:</span>
                  <b className="tabular-nums">{formatQuantity(data.assets.goldGram)} گرم</b>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted">دلار:</span>
                  <b className="tabular-nums">{formatQuantity(data.assets.usd)} دلار</b>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted">سه‌تار:</span>
                  <b className="tabular-nums">
                    {decimal.format(data.setar.sessionsInCurrentCycle)} از ۴ جلسه
                  </b>
                </p>
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-muted">
            طلا و دلار فقط به مقدار native نمایش داده می‌شوند و ارزش‌گذاری تومانی ندارند.
          </p>
        </>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "positive" | "negative" | "neutral";
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{label}</p>
        <Icon
          className={cn(
            "size-4",
            tone === "positive" ? "text-accent-dark" : tone === "negative" ? "text-danger" : "text-muted",
          )}
          aria-hidden
        />
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}

function BreakdownPanel({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: DashboardStatisticsDto["expenseCategories"];
  tone: "positive" | "negative";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState icon={Landmark} title="داده‌ای ثبت نشده است" description="هنوز ردیفی برای این ماه ثبت نشده." />
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((row) => (
              <div key={row.categoryId}>
                <div className="flex justify-between text-sm">
                  <span>{row.name}</span>
                  <span className="tabular-nums">
                    {formatTomanUnit(row.amountToman)} · {decimal.format(row.percentage)}٪
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-secondary">
                  <div
                    className={cn("h-full rounded-full", tone === "positive" ? "bg-accent" : "bg-danger/70")}
                    style={{ width: `${Math.min(row.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
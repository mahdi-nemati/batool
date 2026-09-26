"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, Scale } from "lucide-react";
import type { DashboardCategoryDto, DashboardStatisticsDto } from "@batool/types";
import { ApiClientError } from "@/lib/api/client";
import { getDashboardStatistics } from "@/lib/api/dashboard";
import { formatQuantity, formatTomanUnit } from "@/lib/formatting/persian";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Chart, type ChartType } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { cn } from "@/lib/cn";

const decimal = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 });

export default function StatisticsPage() {
  const [data, setData] = useState<DashboardStatisticsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<ChartType>("line");
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
            options={data.monthOptions.map((option) => ({
              value: option.key,
              label: option.label,
            }))}
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
            <BreakdownPanel title="هزینه بر اساس دسته‌بندی" rows={data.expenseCategories} />
            <BreakdownPanel title="درآمد بر اساس دسته‌بندی" rows={data.incomeCategories} />
          </div>

          <section aria-labelledby="trend-heading" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="trend-heading" className="flex items-center gap-2 text-lg font-semibold">
                  <BarChart3 className="size-4 text-primary" aria-hidden />
                  روند هفت ماه اخیر
                </h2>
                <p className="text-sm text-muted">درآمد و هزینه به ازای هر ماه</p>
              </div>
              <div role="group" aria-label="مدل نمودار" className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={chartType === "line" ? "default" : "outline"}
                  aria-pressed={chartType === "line"}
                  onClick={() => setChartType("line")}
                >
                  خطی
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={chartType === "bar" ? "default" : "outline"}
                  aria-pressed={chartType === "bar"}
                  onClick={() => setChartType("bar")}
                >
                  ستونی
                </Button>
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>درآمد ماهانه</CardTitle>
                  <CardDescription>روند درآمد هفت ماه اخیر</CardDescription>
                </CardHeader>
                <CardContent>
                  <Chart
                    data={data.trend}
                    type={chartType}
                    series={[{ key: "incomeToman", label: "درآمد", color: "income" }]}
                    label="نمودار درآمد ماهانه هفت ماه اخیر"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>هزینه ماهانه</CardTitle>
                  <CardDescription>روند هزینه هفت ماه اخیر</CardDescription>
                </CardHeader>
                <CardContent>
                  <Chart
                    data={data.trend}
                    type={chartType}
                    series={[{ key: "expenseToman", label: "هزینه", color: "expense" }]}
                    label="نمودار هزینه ماهانه هفت ماه اخیر"
                  />
                </CardContent>
              </Card>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">بدهی</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5 text-sm">
                <p className="flex justify-between">
                  <span className="text-muted">طلب:</span>
                  <b className="tabular-nums text-accent-dark">
                    {formatTomanUnit(data.debtSummary.totalReceivableToman)}
                  </b>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted">بدهی:</span>
                  <b className="tabular-nums text-danger">
                    {formatTomanUnit(data.debtSummary.totalPayableToman)}
                  </b>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted">طرف‌حساب‌های باز:</span>
                  <b className="tabular-nums">
                    {decimal.format(data.debtSummary.counterparties.length)}
                  </b>
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
                <CardTitle className="text-base">دارایی</CardTitle>
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
            tone === "positive"
              ? "text-accent-dark"
              : tone === "negative"
                ? "text-danger"
                : "text-muted",
          )}
          aria-hidden
        />
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}

function BreakdownPanel({ title, rows }: { title: string; rows: DashboardCategoryDto[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          data={rows}
          searchKeys={["name"]}
          pageSize={5}
          columns={[
            { key: "name", header: "دسته‌بندی", sortable: true },
            {
              key: "amountToman",
              header: "مبلغ",
              sortable: true,
              numeric: true,
              cell: (value) => formatTomanUnit(Number(value)),
            },
            {
              key: "percentage",
              header: "سهم",
              sortable: true,
              numeric: true,
              cell: (value) => `${decimal.format(Number(value))}٪`,
            },
          ]}
          rowKey={(row, index) => `${row.categoryId}-${row.name}-${index}`}
          label={title}
          emptyTitle="داده‌ای ثبت نشده است"
          emptyDescription="هنوز ردیفی برای این ماه ثبت نشده."
        />
      </CardContent>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DashboardStatisticsDto } from "@batool/types";
import { ApiClientError } from "@/lib/api/client";
import { getDashboardStatistics } from "@/lib/api/dashboard";
import { formatQuantity, formatTomanUnit } from "@/lib/formatting/persian";

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
  if (data === null)
    return error ? (
      <p className="text-danger">{error}</p>
    ) : (
      <p className="text-muted">در حال بارگذاری آمار…</p>
    );
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-sm text-accent-dark">
            ← داشبورد
          </Link>
          <h1 className="mt-2 text-3xl font-bold">آمار و تحلیل</h1>
          <p className="text-sm text-muted">گزارش مشتق‌شده از دفتر مالی</p>
        </div>
        <select
          value={data.month.key}
          onChange={(e) => getDashboardStatistics(e.target.value).then(setData)}
          className="rounded-lg border border-line bg-white px-3 py-2"
        >
          {data.monthOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="درآمد" value={formatTomanUnit(data.monthly.incomeToman)} />
        <Metric label="هزینه" value={formatTomanUnit(data.monthly.expenseToman)} />
        <Metric label="خالص" value={formatTomanUnit(data.monthly.netCashFlowToman)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="هزینه بر اساس دسته‌بندی">
          <Breakdown rows={data.expenseCategories} />
        </Panel>
        <Panel title="درآمد بر اساس دسته‌بندی">
          <Breakdown rows={data.incomeCategories} />
        </Panel>
      </div>
      <Panel title="روند هفت ماه اخیر">
        <div className="flex flex-col gap-2">
          {data.trend.map((row) => (
            <div key={row.month} className="grid grid-cols-[5rem_1fr_1fr_1fr] gap-2 text-sm">
              <span>{row.label}</span>
              <span className="text-accent-dark">د: {formatTomanUnit(row.incomeToman)}</span>
              <span className="text-danger">ه: {formatTomanUnit(row.expenseToman)}</span>
              <b>خ: {formatTomanUnit(row.netCashFlowToman)}</b>
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="بدهی">
          <p>
            طلب: <b>{formatTomanUnit(data.debtSummary.totalReceivableToman)}</b>
          </p>
          <p>
            بدهی: <b>{formatTomanUnit(data.debtSummary.totalPayableToman)}</b>
          </p>
          <p>
            طرف‌حساب‌های باز: <b>{decimal.format(data.debtSummary.counterparties.length)}</b>
          </p>
        </Panel>
        <Panel title="اقساط">
          <p>
            فعال: <b>{decimal.format(data.installments.active)}</b>
          </p>
          <p>
            پیش‌رو / معوق:{" "}
            <b>
              {decimal.format(data.installments.upcoming)} /{" "}
              {decimal.format(data.installments.overdue)}
            </b>
          </p>
          <p>
            پرداخت‌شده: <b>{decimal.format(data.installments.paid)}</b>
          </p>
        </Panel>
        <Panel title="دارایی و سه‌تار">
          <p>
            تومان: <b>{formatTomanUnit(data.assets.totalToman)}</b>
          </p>
          <p>
            طلا: <b>{formatQuantity(data.assets.goldGram)} گرم</b>
          </p>
          <p>
            دلار: <b>{formatQuantity(data.assets.usd)} دلار</b>
          </p>
          <p>
            سه‌تار: <b>{decimal.format(data.setar.sessionsInCurrentCycle)} از ۴ جلسه</b>
          </p>
        </Panel>
      </div>
      <p className="text-xs text-muted">
        طلا و دلار فقط به مقدار native نمایش داده می‌شوند و ارزش‌گذاری تومانی ندارند.
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}
function Breakdown({ rows }: { rows: DashboardStatisticsDto["expenseCategories"] }) {
  return rows.length === 0 ? (
    <p className="text-sm text-muted">داده‌ای ثبت نشده است.</p>
  ) : (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.categoryId}>
          <div className="flex justify-between text-sm">
            <span>{row.name}</span>
            <span>
              {formatTomanUnit(row.amountToman)} · {decimal.format(row.percentage)}٪
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-paper">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.min(row.percentage, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

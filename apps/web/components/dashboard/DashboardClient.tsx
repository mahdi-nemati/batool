"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DashboardSummaryDto } from "@batool/types";
import { ApiClientError } from "@/lib/api/client";
import { getDashboardSummary } from "@/lib/api/dashboard";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/formatting/jalali";
import { formatQuantity, formatTomanUnit } from "@/lib/formatting/persian";

const actions = [
  ["ثبت درآمد", "/dashboard/transactions"],
  ["ثبت هزینه", "/dashboard/transactions"],
  ["انتقال", "/dashboard/assets"],
  ["افزودن / پرداخت قسط", "/dashboard/installments"],
  ["افزودن بدهی / طلب", "/dashboard/counterparties"],
  ["خرید / فروش طلا", "/dashboard/assets/gold"],
  ["خرید / فروش دلار", "/dashboard/assets/usd"],
  ["ثبت جلسه سه‌تار", "/dashboard/setar"],
] as const;

export function DashboardClient() {
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .catch((cause) =>
        setError(cause instanceof ApiClientError ? cause.message : "بارگذاری داشبورد ناموفق بود"),
      );
  }, []);

  if (summary === null) {
    return error === null ? (
      <p className="text-muted">در حال بارگذاری داشبورد…</p>
    ) : (
      <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-danger">
        {error}
      </p>
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
          href={`/dashboard/statistics?month=${summary.month.key}`}
          className="rounded-lg border border-accent px-3 py-2 text-sm font-bold text-accent-dark hover:bg-accent/10"
        >
          مشاهده آمار و تحلیل
        </Link>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-bold">دسترسی سریع</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {actions.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="rounded-xl border border-line bg-panel px-3 py-3 text-center text-sm font-bold transition-colors hover:border-accent hover:text-accent-dark"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="خلاصه دارایی‌ها">
          <div className="grid gap-2 sm:grid-cols-2">
            {[...summary.balances.banks, ...summary.balances.funds].map((asset) => (
              <div key={asset.id} className="flex justify-between gap-2 text-sm">
                <span>{asset.name}</span>
                <b>{formatTomanUnit(asset.balanceToman)}</b>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
            <span>
              طلا: <b>{formatQuantity(summary.quantities.goldGram)} گرم</b>
            </span>
            <span>
              دلار: <b>{formatQuantity(summary.quantities.usd)} دلار</b>
            </span>
          </div>
        </Section>

        <Section title="تعهدات نزدیک">
          {summary.obligations.installments.length === 0 && !summary.obligations.setar.payable ? (
            <p className="text-sm text-muted">تعهد پرداخت‌نشده‌ای در پنج روز آینده نیست.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {summary.obligations.installments.map((item) => (
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
              {summary.obligations.setar.payable ? (
                <div className="flex justify-between rounded-lg bg-paper px-3 py-2 text-sm">
                  <b>شهریه سه‌تار</b>
                  <b>{formatTomanUnit(summary.obligations.setar.amountToman ?? 0)}</b>
                </div>
              ) : null}
            </div>
          )}
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="تراکنش‌های اخیر">
          {summary.recentTransactions.length === 0 ? (
            <p className="text-sm text-muted">تراکنشی ثبت نشده است.</p>
          ) : (
            <div className="flex flex-col divide-y divide-line">
              {summary.recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex justify-between gap-3 py-3 text-sm">
                  <span>
                    <b>{transaction.category.name}</b>
                    <br />
                    <span className="text-muted">
                      {transaction.description ?? transaction.asset.name} ·{" "}
                      {formatJalaliDateTime(transaction.occurredAt)}
                    </span>
                  </span>
                  <b
                    className={transaction.type === "EXPENSE" ? "text-danger" : "text-accent-dark"}
                  >
                    {transaction.type === "EXPENSE" ? "−" : "+"}
                    {formatTomanUnit(transaction.amountToman)}
                  </b>
                </div>
              ))}
            </div>
          )}
        </Section>
        <Section title="بدهی‌ها و سه‌تار">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat
              label="طلب از دیگران"
              value={formatTomanUnit(summary.debtSummary.totalReceivableToman)}
            />
            <Stat
              label="بدهی به دیگران"
              value={formatTomanUnit(summary.debtSummary.totalPayableToman)}
            />
          </div>
          <Link
            href="/dashboard/counterparties"
            className="mt-4 inline-block text-sm font-bold text-accent-dark"
          >
            جزئیات بدهی‌ها ←
          </Link>
          <div className="mt-4 border-t border-line pt-3 text-sm">
            <b>سه‌تار:</b> {summary.obligations.setar.sessionsInCurrentCycle} از ۴ جلسه چرخه جاری ·
            چرخه {summary.obligations.setar.currentCycleNo}
          </div>
        </Section>
      </div>
    </div>
  );
}

function dueLabel(days: number): string {
  if (days < 0) return `${formatQuantity(Math.abs(days))} روز معوق`;
  if (days === 0) return "امروز";
  return `${formatQuantity(days)} روز دیگر`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}

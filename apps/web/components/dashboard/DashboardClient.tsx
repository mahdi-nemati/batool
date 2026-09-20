"use client";

import { useEffect, useState } from "react";
import type { DashboardSummaryDto } from "@batool/types";
import { getDashboardSummary } from "@/lib/api/dashboard";
import { ApiClientError } from "@/lib/api/client";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/formatting/jalali";
import { formatQuantity, formatTomanUnit } from "@/lib/formatting/persian";

const decimal = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 });

function amount(value: number): string {
  return formatTomanUnit(value);
}

function statusLabel(status: "UPCOMING" | "DUE" | "OVERDUE"): string {
  return { UPCOMING: "پیش‌رو", DUE: "سررسید امروز", OVERDUE: "معوق" }[status];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children = "موردی برای نمایش نیست" }: { children?: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

export function DashboardClient() {
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(month?: string) {
    setLoading(true);
    setError(null);
    try {
      setSummary(await getDashboardSummary(month));
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "بارگذاری داشبورد ناموفق بود");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading && summary === null) return <p className="text-muted">در حال بارگذاری داشبورد…</p>;
  if (summary === null) {
    return (
      <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-danger">
        {error}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted">نمای کلی مالی</p>
          <h1 className="text-3xl font-bold">داشبورد</h1>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <span>ماه گزارش</span>
          <select
            value={summary.month.key}
            onChange={(event) => void load(event.target.value)}
            className="rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-accent"
          >
            {summary.monthOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric title="موجودی تومان" value={amount(summary.balances.totalToman)} />
        <Metric title="طلا" value={`${formatQuantity(summary.quantities.goldGram)} گرم`} />
        <Metric title="دلار" value={`${formatQuantity(summary.quantities.usd)} دلار`} />
        <Metric
          title={`خالص ${summary.month.label}`}
          value={amount(summary.monthly.netCashFlowToman)}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="حساب‌ها و صندوق‌ها">
          <div className="grid gap-3 sm:grid-cols-2">
            <BalanceGroup title="حساب‌های بانکی" rows={summary.balances.banks} />
            <BalanceGroup title="صندوق‌ها" rows={summary.balances.funds} />
          </div>
        </Section>
        <Section title={`عملکرد مالی ${summary.month.label}`}>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat
              label="درآمد"
              value={amount(summary.monthly.incomeToman)}
              tone="text-accent-dark"
            />
            <Stat label="هزینه" value={amount(summary.monthly.expenseToman)} tone="text-danger" />
            <Stat label="خالص" value={amount(summary.monthly.netCashFlowToman)} tone="text-ink" />
          </div>
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="هزینه بر اساس دسته‌بندی">
          {summary.expenseCategories.length === 0 ? (
            <Empty />
          ) : (
            <div className="flex flex-col gap-3">
              {summary.expenseCategories.map((category) => (
                <div key={category.categoryId}>
                  <div className="mb-1 flex justify-between gap-3 text-sm">
                    <span>{category.name}</span>
                    <span className="text-muted">
                      {amount(category.amountToman)} · {decimal.format(category.percentage)}٪
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-paper">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.min(category.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
        <Section title="خلاصه بدهی">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat
              label="طلب از دیگران"
              value={amount(summary.debtSummary.totalReceivableToman)}
              tone="text-accent-dark"
            />
            <Stat
              label="بدهی به دیگران"
              value={amount(summary.debtSummary.totalPayableToman)}
              tone="text-danger"
            />
            <Stat label="خالص" value={amount(summary.debtSummary.netToman)} tone="text-ink" />
          </div>
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="تعهدات پیش‌رو">
          <div className="flex flex-col gap-3">
            {summary.obligations.installments.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2 text-sm"
              >
                <span>
                  <b>{item.name}</b>
                  <br />
                  <span className="text-muted">
                    {formatJalaliDate(item.nextDueDate)} · {statusLabel(item.status)}
                  </span>
                </span>
                <span className="font-bold">{amount(item.amountToman)}</span>
              </div>
            ))}
            {summary.obligations.setar.payable ? (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2 text-sm">
                <span>
                  <b>شهریه سه‌تار</b>
                  <br />
                  <span className="text-muted">
                    دوره {decimal.format(summary.obligations.setar.currentCycleNo)} آماده پرداخت
                  </span>
                </span>
                <span className="font-bold">
                  {amount(summary.obligations.setar.amountToman ?? 0)}
                </span>
              </div>
            ) : null}
            {summary.obligations.installments.length === 0 && !summary.obligations.setar.payable ? (
              <Empty>تعهد پرداخت‌نشده‌ای ثبت نشده است</Empty>
            ) : null}
          </div>
        </Section>
        <Section title="تراکنش‌های اخیر">
          {summary.recentTransactions.length === 0 ? (
            <Empty />
          ) : (
            <div className="flex flex-col divide-y divide-line">
              {summary.recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0"
                >
                  <span>
                    <b>{transaction.category.name}</b>
                    <br />
                    <span className="text-muted">
                      {transaction.description ?? transaction.asset.name} ·{" "}
                      {formatJalaliDateTime(transaction.occurredAt)}
                    </span>
                  </span>
                  <span
                    className={
                      transaction.type === "EXPENSE"
                        ? "font-bold text-danger"
                        : "font-bold text-accent-dark"
                    }
                  >
                    {transaction.type === "EXPENSE" ? "−" : "+"}
                    {amount(transaction.amountToman)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4 shadow-sm">
      <p className="text-sm text-muted">{title}</p>
      <p className="mt-2 text-xl font-bold text-ink">{value}</p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-sm font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function BalanceGroup({
  title,
  rows,
}: {
  title: string;
  rows: DashboardSummaryDto["balances"]["banks"];
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold text-muted">{title}</h3>
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.id} className="flex justify-between gap-2 text-sm">
              <span>{row.name}</span>
              <span className="font-bold">{amount(row.balanceToman)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

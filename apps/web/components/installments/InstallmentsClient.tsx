"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AssetKind, BankAccountDto, FundDto, InstallmentDto } from "@batool/types";
import { ApiClientError } from "@/lib/api/client";
import { listBankAccounts, listFunds } from "@/lib/api/finance";
import {
  createInstallment,
  getInstallment,
  listInstallments,
  payInstallment,
  updateInstallment,
} from "@/lib/api/installments";
import { formatTomanUnit } from "@/lib/formatting/persian";
import { formatJalaliDate } from "@/lib/formatting/jalali";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-accent";
const labelClass = "mb-1 block text-sm text-muted";

interface AssetOpt {
  value: string;
  label: string;
}

function statusLabel(s: InstallmentDto["status"]): { text: string; cls: string } {
  switch (s) {
    case "UPCOMING":
      return { text: "نزدیک", cls: "bg-paper text-muted" };
    case "DUE":
      return { text: "سررسید امروز", cls: "bg-accent text-white" };
    case "OVERDUE":
      return { text: "معوق", cls: "bg-danger text-white" };
    case "COMPLETED":
      return { text: "تکمیل‌شده", cls: "bg-accent/10 text-accent-dark" };
    case "ARCHIVED":
      return { text: "بایگانی‌شده", cls: "bg-paper text-muted" };
  }
}

export function InstallmentsClient() {
  const [items, setItems] = useState<InstallmentDto[]>([]);
  const [accounts, setAccounts] = useState<BankAccountDto[]>([]);
  const [funds, setFunds] = useState<FundDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const [inst, acc, fun] = await Promise.all([
      listInstallments(),
      listBankAccounts(),
      listFunds(),
    ]);
    setItems(inst);
    setAccounts(acc);
    setFunds(fun);
  }

  useEffect(() => {
    reload()
      .catch((e) => setError(e instanceof ApiClientError ? e.message : "خطا در بارگذاری"))
      .finally(() => setLoading(false));
  }, []);

  const assetOptions: AssetOpt[] = useMemo(
    () => [
      ...accounts.map((a) => ({ value: `BANK|${a.id}`, label: `حساب: ${a.name}` })),
      ...funds.map((f) => ({ value: `FUND|${f.id}`, label: `صندوق: ${f.name}` })),
    ],
    [accounts, funds],
  );

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">اقساط</h1>
      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <CreateForm onDone={reload} onError={setError} />

      {loading ? (
        <p className="text-muted">در حال بارگذاری…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-4 text-muted">
          هنوز اقساطی ثبت نشده است.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((it) => (
            <InstallmentCard
              key={it.id}
              item={it}
              assetOptions={assetOptions}
              onChanged={reload}
              onError={setError}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CreateForm({
  onDone,
  onError,
}: {
  onDone: () => Promise<void>;
  onError: (e: string) => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [count, setCount] = useState("12");
  const [day, setDay] = useState("1");
  const [start, setStart] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    onError("");
    setBusy(true);
    try {
      const startDate = start ? new Date(`${start}T00:00:00Z`).getTime() : Date.now();
      await createInstallment({
        name,
        amountToman: Number(amount),
        totalCount: Number(count),
        dueDayOfMonth: Number(day),
        startDate,
      });
      setName("");
      setAmount("");
      await onDone();
    } catch (err) {
      onError(err instanceof ApiClientError ? err.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-2xl border border-line bg-panel p-5 sm:grid-cols-2 lg:grid-cols-5"
    >
      <div>
        <label className={labelClass}>نام</label>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          required
        />
      </div>
      <div>
        <label className={labelClass}>مبلغ هر قسط (تومان)</label>
        <input
          className={inputClass}
          dir="ltr"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
          required
        />
      </div>
      <div>
        <label className={labelClass}>تعداد اقساط</label>
        <input
          className={inputClass}
          dir="ltr"
          inputMode="numeric"
          value={count}
          onChange={(e) => setCount(e.target.value.replace(/[^\d]/g, ""))}
          required
        />
      </div>
      <div>
        <label className={labelClass}>روز سررسید (۱-۳۱)</label>
        <input
          className={inputClass}
          dir="ltr"
          inputMode="numeric"
          value={day}
          onChange={(e) => setDay(e.target.value.replace(/[^\d]/g, ""))}
          required
        />
      </div>
      <div>
        <label className={labelClass}>تاریخ شروع (اختیاری)</label>
        <input
          className={inputClass}
          type="date"
          dir="ltr"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </div>
      <button
        disabled={busy}
        className="self-end rounded-lg bg-accent px-4 py-2 font-bold text-white disabled:opacity-60 sm:col-span-2 lg:col-span-1"
      >
        {busy ? "…" : "ایجاد اقساط"}
      </button>
    </form>
  );
}

function InstallmentCard({
  item,
  assetOptions,
  onChanged,
  onError,
}: {
  item: InstallmentDto;
  assetOptions: AssetOpt[];
  onChanged: () => Promise<void>;
  onError: (e: string) => void;
}) {
  const st = statusLabel(item.status);
  const payable = !item.archived && item.status !== "COMPLETED";

  const [asset, setAsset] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [payments, setPayments] = useState<
    { id: string; occurrenceNo: number; amountToman: number; dueDate: string; paidAt: string }[]
  >([]);

  async function toggleHistory() {
    const next = !open;
    setOpen(next);
    if (next) {
      try {
        const d = await getInstallment(item.id);
        setPayments(d.payments);
      } catch (e) {
        onError(e instanceof ApiClientError ? e.message : "خطا");
      }
    }
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!asset) return;
    setBusy(true);
    onError("");
    try {
      const idx = asset.indexOf("|");
      await payInstallment(item.id, {
        assetKind: asset.slice(0, idx) as AssetKind,
        assetId: asset.slice(idx + 1),
      });
      setAsset("");
      await onChanged();
    } catch (err) {
      onError(err instanceof ApiClientError ? err.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    onError("");
    try {
      await updateInstallment(item.id, { archived: !item.archived });
      await onChanged();
    } catch (err) {
      onError(err instanceof ApiClientError ? err.message : "خطا");
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{item.name}</h3>
          <p className="text-sm text-muted">
            مبلغ هر قسط:{" "}
            <span className="font-bold text-ink">{formatTomanUnit(item.amountToman)}</span> • روز
            سررسید: {item.dueDayOfMonth} •
            {item.nextDueDate ? ` قسط بعدی: ${formatJalaliDate(item.nextDueDate)}` : ""}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${st.cls}`}>
          {st.text}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted">پیشرفت:</span>
        <span className="font-bold text-ink">
          {item.paidCount} / {item.totalCount}
        </span>
        <span className="text-muted">باقی‌مانده: {item.remainingCount}</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper">
          <div
            className="h-full bg-accent"
            style={{ width: `${Math.min(100, (item.paidCount / item.totalCount) * 100)}%` }}
          />
        </div>
      </div>

      {payable ? (
        <form onSubmit={pay} className="flex flex-wrap items-center gap-2">
          <select
            className={`${inputClass} max-w-xs`}
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            required
          >
            <option value="">حساب / صندوق…</option>
            {assetOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="text-sm text-muted">
            مبلغ پرداختی: <b className="text-ink">{formatTomanUnit(item.amountToman)}</b>
          </span>
          <button
            disabled={busy}
            className="rounded-lg bg-accent px-4 py-2 font-bold text-white disabled:opacity-60"
          >
            {busy ? "…" : "پرداخت قسط"}
          </button>
        </form>
      ) : null}

      <div className="flex items-center gap-3 text-sm">
        <button type="button" onClick={toggleHistory} className="text-accent-dark">
          {open ? "بستن تاریخچه" : `تاریخچه پرداخت‌ها (${item.paidCount})`}
        </button>
        <button type="button" onClick={archive} className="text-muted">
          {item.archived ? "بازگردانی" : "بایگانی"}
        </button>
      </div>

      {open ? (
        <ul className="flex flex-col gap-1 border-t border-line pt-2 text-sm">
          {payments.length === 0 ? (
            <li className="text-muted">پرداختی ثبت نشده است.</li>
          ) : (
            payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span>
                  قسط {p.occurrenceNo} • {formatTomanUnit(p.amountToman)}
                </span>
                <span className="text-muted">
                  سررسید {formatJalaliDate(p.dueDate)} • پرداخت {formatJalaliDate(p.paidAt)}
                </span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </li>
  );
}

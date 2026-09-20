"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AssetKind,
  BankAccountDto,
  CategoryDto,
  CounterpartyDto,
  FinancialTransactionDto,
  FundDto,
} from "@batool/types";
import { listBankAccounts, listFunds } from "@/lib/api/finance";
import { listActiveCategories } from "@/lib/api/categories";
import { listCounterparties } from "@/lib/api/debts";
import {
  createExpense,
  createIncome,
  listTransactions,
  type TransactionFilters,
} from "@/lib/api/transactions";
import { ApiClientError } from "@/lib/api/client";
import { formatTomanUnit } from "@/lib/formatting/persian";
import { formatJalaliDate } from "@/lib/formatting/jalali";
import { MoneyInput } from "@/components/ui/MoneyInput";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-accent";
const labelClass = "mb-1 block text-sm text-muted";

interface Data {
  accounts: BankAccountDto[];
  funds: FundDto[];
  incomeCats: CategoryDto[];
  expenseCats: CategoryDto[];
  counterparties: CounterpartyDto[];
}

function toEndPoints(d: Data) {
  return [
    ...d.accounts.map((a) => ({ value: `BANK|${a.id}`, label: `حساب: ${a.name}` })),
    ...d.funds.map((f) => ({ value: `FUND|${f.id}`, label: `صندوق: ${f.name}` })),
  ];
}

function parseAsset(value: string): { kind: AssetKind; id: string } {
  const idx = value.indexOf("|");
  return { kind: value.slice(0, idx) as AssetKind, id: value.slice(idx + 1) };
}

export function TransactionsClient() {
  const [data, setData] = useState<Data | null>(null);
  const [rows, setRows] = useState<FinancialTransactionDto[]>([]);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll(f: TransactionFilters) {
    const [accounts, funds, incomeCats, expenseCats, counterparties, txs] = await Promise.all([
      listBankAccounts(),
      listFunds(),
      listActiveCategories("INCOME"),
      listActiveCategories("EXPENSE"),
      listCounterparties(),
      listTransactions(f),
    ]);
    setData({
      accounts,
      funds,
      incomeCats,
      expenseCats,
      counterparties: counterparties.filter((c) => !c.archived),
    });
    setRows(txs);
  }

  useEffect(() => {
    loadAll(filters)
      .catch((e) => setError(e instanceof ApiClientError ? e.message : "خطا در بارگذاری"))
      .finally(() => setLoading(false));
  }, []);

  async function applyFilters(next: TransactionFilters) {
    setFilters(next);
    setLoading(true);
    setError(null);
    try {
      await loadAll(next);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "خطا");
    } finally {
      setLoading(false);
    }
  }

  async function reload() {
    await loadAll(filters);
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">تراکنش‌ها</h1>

      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        {data !== null ? (
          <>
            <IncomeForm data={data} onDone={reload} onError={setError} />
            <ExpenseForm data={data} onDone={reload} onError={setError} />
          </>
        ) : (
          <p className="text-muted">در حال بارگذاری…</p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">تاریخچه</h2>
        {data !== null ? <Filters data={data} onApply={applyFilters} /> : null}
        {loading ? (
          <p className="text-muted">در حال بارگذاری…</p>
        ) : rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-4 text-muted">
            تراکنشی یافت نشد.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((t) => (
              <TransactionRow key={t.id} t={t} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TransactionRow({ t }: { t: FinancialTransactionDto }) {
  const isIncome = t.type === "INCOME";
  return (
    <li className="flex flex-col gap-1 rounded-xl border border-line bg-panel px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <span className="text-ink">{t.description ?? t.category.name}</span>
        <span className={`shrink-0 font-bold ${isIncome ? "text-accent-dark" : "text-danger"}`}>
          {isIncome ? "+" : "−"}
          {formatTomanUnit(t.amountToman)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 text-sm text-muted">
        <span>
          {t.category.name} • {t.asset.name}
          {t.isSplit ? " • تقسیم‌شده" : ""}
        </span>
        <span>{formatJalaliDate(t.occurredAt)}</span>
      </div>
      {t.isSplit ? (
        <div className="text-xs text-muted">
          <span>سهم شما: {formatTomanUnit(t.personalToman)}</span>
          {"  "}
          {t.participantShares.map((s) => (
            <span key={s.id} className="ml-2">
              {s.label}: {formatTomanUnit(s.amountToman)}
            </span>
          ))}
        </div>
      ) : null}
    </li>
  );
}

function IncomeForm({
  data,
  onDone,
  onError,
}: {
  data: Data;
  onDone: () => void;
  onError: (e: string) => void;
}) {
  const [cat, setCat] = useState("");
  const [asset, setAsset] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const endpoints = useMemo(
    () => data.accounts.map((a) => ({ value: `BANK|${a.id}`, label: `حساب: ${a.name}` })),
    [data.accounts],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cat || !asset || !amount) return;
    setBusy(true);
    onError("");
    try {
      const a = parseAsset(asset);
      await createIncome({
        amountToman: amount,
        categoryId: cat,
        assetKind: a.kind,
        assetId: a.id,
        ...(desc ? { description: desc } : {}),
      });
      setAmount("");
      setDesc("");
      setCat("");
      setAsset("");
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
      className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5"
    >
      <h3 className="font-bold text-accent-dark">ثبت درآمد</h3>
      <div>
        <label className={labelClass}>دسته‌بندی</label>
        <select
          className={inputClass}
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          required
        >
          <option value="">انتخاب…</option>
          {data.incomeCats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>حساب / صندوق</label>
        <select
          className={inputClass}
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
          required
        >
          <option value="">انتخاب…</option>
          {endpoints.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>مبلغ (تومان)</label>
        <MoneyInput value={amount} onChange={setAmount} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>توضیح (اختیاری)</label>
        <input
          className={inputClass}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          maxLength={200}
        />
      </div>
      <button
        className="self-start rounded-lg bg-accent px-4 py-2 font-bold text-white disabled:opacity-60"
        disabled={busy}
      >
        {busy ? "…" : "ثبت درآمد"}
      </button>
    </form>
  );
}

interface PShare {
  label: string;
  amount: string;
  party: string; // optional resolved counterparty id ("" = none)
}

function ExpenseForm({
  data,
  onDone,
  onError,
}: {
  data: Data;
  onDone: () => void;
  onError: (e: string) => void;
}) {
  const [cat, setCat] = useState("");
  const [asset, setAsset] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [split, setSplit] = useState(false);
  const [shares, setShares] = useState<PShare[]>([{ label: "", amount: "", party: "" }]);
  const [busy, setBusy] = useState(false);
  const endpoints = useMemo(
    () => data.accounts.map((a) => ({ value: `BANK|${a.id}`, label: `حساب: ${a.name}` })),
    [data.accounts],
  );

  const total = Number(amount) || 0;
  const participantsSum = split ? shares.reduce((s, x) => s + (Number(x.amount) || 0), 0) : 0;
  const ownerShare = total - participantsSum;
  const shareError = split && (participantsSum <= 0 || ownerShare <= 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cat || !asset || !amount) return;
    setBusy(true);
    onError("");
    try {
      const a = parseAsset(asset);
      const payloadShares = split
        ? shares
            .filter((s) => s.label.trim() && Number(s.amount) > 0)
            .map((s) => ({
              label: s.label.trim(),
              amountToman: s.amount,
              ...(s.party ? { counterpartyId: s.party } : {}),
            }))
        : undefined;
      await createExpense({
        amountToman: amount,
        categoryId: cat,
        assetKind: a.kind,
        assetId: a.id,
        ...(desc ? { description: desc } : {}),
        ...(payloadShares && payloadShares.length > 0 ? { shares: payloadShares } : {}),
      });
      setAmount("");
      setDesc("");
      setCat("");
      setAsset("");
      setSplit(false);
      setShares([{ label: "", amount: "", party: "" }]);
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
      className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5"
    >
      <h3 className="font-bold text-danger">ثبت هزینه</h3>
      <div>
        <label className={labelClass}>دسته‌بندی</label>
        <select
          className={inputClass}
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          required
        >
          <option value="">انتخاب…</option>
          {data.expenseCats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>حساب / صندوق</label>
        <select
          className={inputClass}
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
          required
        >
          <option value="">انتخاب…</option>
          {endpoints.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>مبلغ کل (تومان)</label>
        <MoneyInput value={amount} onChange={setAmount} required className={inputClass} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={split} onChange={(e) => setSplit(e.target.checked)} />
        هزینه مشترک (تقسیم بین چند نفر)
      </label>
      {split ? (
        <div className="flex flex-col gap-2 rounded-lg border border-line p-3">
          {shares.map((s, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 border-b border-line pb-2 last:border-0 last:pb-0"
            >
              <div className="flex items-center gap-2">
                <input
                  className={inputClass}
                  placeholder="نام شرکت‌کننده"
                  value={s.label}
                  onChange={(e) =>
                    setShares(shares.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                  }
                />
                <MoneyInput
                  className={`${inputClass} max-w-32`}
                  placeholder="سهم"
                  value={s.amount}
                  onChange={(value) =>
                    setShares(shares.map((x, j) => (j === i ? { ...x, amount: value } : x)))
                  }
                />
                <button
                  type="button"
                  className="text-muted px-2"
                  onClick={() => setShares(shares.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </div>
              <select
                className={inputClass}
                value={s.party}
                onChange={(e) =>
                  setShares(shares.map((x, j) => (j === i ? { ...x, party: e.target.value } : x)))
                }
              >
                <option value="">بدون طرف حساب (تعیین بعدی)</option>
                {data.counterparties.map((c) => (
                  <option key={c.id} value={c.id}>
                    طرف حساب: {c.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-sm text-accent-dark"
              onClick={() => setShares([...shares, { label: "", amount: "", party: "" }])}
            >
              + افزودن شرکت‌کننده
            </button>
            <span className="text-xs text-muted">
              سهم شما: {formatTomanUnit(ownerShare > 0 ? ownerShare : 0)}
            </span>
          </div>
          {shareError ? (
            <span className="text-xs text-danger">
              سهم‌ها باید مثبت باشند و مجموع آن‌ها کمتر از مبلغ کل.
            </span>
          ) : null}
        </div>
      ) : null}

      <div>
        <label className={labelClass}>توضیح (اختیاری)</label>
        <input
          className={inputClass}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          maxLength={200}
        />
      </div>
      <button
        className="self-start rounded-lg bg-accent px-4 py-2 font-bold text-white disabled:opacity-60"
        disabled={busy || shareError}
      >
        {busy ? "…" : "ثبت هزینه"}
      </button>
    </form>
  );
}

function Filters({ data, onApply }: { data: Data; onApply: (f: TransactionFilters) => void }) {
  const [type, setType] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [asset, setAsset] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const allCats = [...data.incomeCats, ...data.expenseCats];
  const endpoints = toEndPoints(data);

  function apply() {
    const a = asset ? parseAsset(asset) : null;
    onApply({
      ...(type ? { type: type as TransactionFilters["type"] } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(a ? { assetKind: a.kind, assetId: a.id } : {}),
      ...(from ? { from: `${from}T00:00:00.000Z` } : {}),
      ...(to ? { to: `${to}T23:59:59.999Z` } : {}),
    });
  }

  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-panel p-4 sm:grid-cols-3 lg:grid-cols-6">
      <select
        className={inputClass}
        value={type}
        onChange={(e) => setType(e.target.value)}
        aria-label="نوع"
      >
        <option value="">همه انواع</option>
        <option value="INCOME">درآمد</option>
        <option value="EXPENSE">هزینه</option>
      </select>
      <select
        className={inputClass}
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        aria-label="دسته‌بندی"
      >
        <option value="">همه دسته‌ها</option>
        {allCats.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        className={inputClass}
        value={asset}
        onChange={(e) => setAsset(e.target.value)}
        aria-label="منبع"
      >
        <option value="">همه منابع</option>
        {endpoints.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <input
        className={inputClass}
        type="date"
        dir="ltr"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        aria-label="از تاریخ"
      />
      <input
        className={inputClass}
        type="date"
        dir="ltr"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        aria-label="تا تاریخ"
      />
      <button
        type="button"
        onClick={apply}
        className="rounded-lg bg-accent px-3 py-2 font-bold text-white"
      >
        اعمال فیلتر
      </button>
    </div>
  );
}

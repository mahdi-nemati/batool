"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Receipt } from "lucide-react";
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
import { formatJalaliDateTime } from "@/lib/formatting/jalali";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { JalaliDateInput } from "@/components/ui/JalaliDateInput";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { MoneyInput } from "@/components/ui/MoneyInput";

const moneyInputClass =
  "h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground placeholder:text-muted-foreground/70";

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
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">دفتر تراکنش‌ها</p>
          <h1 className="text-3xl font-bold">تراکنش‌ها</h1>
          <p className="mt-1 text-sm text-muted">ثبت درآمد و هزینه و بررسی تاریخچه</p>
        </div>
      </header>

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
          <p className="text-sm text-muted">در حال بارگذاری…</p>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>تاریخچه تراکنش‌ها</CardTitle>
          <CardDescription>فیلتر بر اساس نوع، دسته‌بندی، منبع یا تاریخ</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {data !== null ? <Filters data={data} onApply={applyFilters} /> : null}
          {loading ? (
            <p className="text-sm text-muted">در حال بارگذاری…</p>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="تراکنشی یافت نشد"
              description="با ثبت درآمد یا هزینه اولین تراکنش خود را ثبت کنید."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {rows.map((t) => (
                <TransactionRow key={t.id} t={t} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TransactionRow({ t }: { t: FinancialTransactionDto }) {
  const isIncome = t.type === "INCOME";
  return (
    <li className="flex flex-col gap-2 py-3 text-sm">
      <div className="flex items-center justify-between gap-4">
        <span className="min-w-0">
          <b className="block truncate">{t.description ?? t.category.name}</b>
          <span className="block truncate text-xs text-muted">
            {t.category.name} · {t.asset.name}
            {t.isSplit ? " · تقسیم‌شده" : ""}
          </span>
        </span>
        <b className={`shrink-0 tabular-nums ${isIncome ? "text-accent-dark" : "text-danger"}`}>
          {isIncome ? "+" : "−"}
          {formatTomanUnit(t.amountToman)}
        </b>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>{formatJalaliDateTime(t.occurredAt)}</span>
        {t.isSplit ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">تقسیم‌شده</Badge>
            <span>سهم شما: {formatTomanUnit(t.personalToman)}</span>
            {t.participantShares.map((s) => (
              <span key={s.id}>
                {s.label}: {formatTomanUnit(s.amountToman)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
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
    <Card>
      <CardHeader>
        <CardTitle>ثبت درآمد</CardTitle>
        <CardDescription>افزایش موجودی یک حساب یا صندوق.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="txn-i-cat">دسته‌بندی</Label>
            <Select
              id="txn-i-cat"
              required
              placeholder="انتخاب…"
              options={data.incomeCats.map((c) => ({ value: c.id, label: c.name }))}
              value={cat}
              onChange={(e) => setCat(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txn-i-asset">حساب / صندوق</Label>
            <Select
              id="txn-i-asset"
              required
              placeholder="انتخاب…"
              options={endpoints}
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txn-i-amount">مبلغ (تومان)</Label>
            <MoneyInput
              id="txn-i-amount"
              value={amount}
              onChange={setAmount}
              required
              className={moneyInputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txn-i-desc">توضیح (اختیاری)</Label>
            <Input
              id="txn-i-desc"
              maxLength={200}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="مثلاً حقوق شهریور"
            />
          </div>
          <Button type="submit" variant="default" disabled={busy} className="self-start gap-1.5">
            <Plus className="size-4" aria-hidden />
            {busy ? "در حال ثبت…" : "ثبت درآمد"}
          </Button>
        </form>
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader>
        <CardTitle>ثبت هزینه</CardTitle>
        <CardDescription>یک پرداخت یا هزینه مشترک تقسیم‌شده.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="txn-e-cat">دسته‌بندی</Label>
            <Select
              id="txn-e-cat"
              required
              placeholder="انتخاب…"
              options={data.expenseCats.map((c) => ({ value: c.id, label: c.name }))}
              value={cat}
              onChange={(e) => setCat(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txn-e-asset">حساب / صندوق</Label>
            <Select
              id="txn-e-asset"
              required
              placeholder="انتخاب…"
              options={endpoints}
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txn-e-amount">مبلغ کل (تومان)</Label>
            <MoneyInput
              id="txn-e-amount"
              value={amount}
              onChange={setAmount}
              required
              className={moneyInputClass}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={split}
              onChange={(e) => setSplit(e.target.checked)}
              className="size-4 accent-primary"
            />
            هزینه مشترک (تقسیم بین چند نفر)
          </label>
          {split ? (
            <div className="flex flex-col gap-3 rounded-lg border border-input bg-background/40 p-3">
              {shares.map((s, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 border-b border-input pb-3 last:border-0 last:pb-0"
                >
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <Input
                      placeholder="نام شرکت‌کننده"
                      value={s.label}
                      onChange={(e) =>
                        setShares(shares.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                      }
                    />
                    <MoneyInput
                      className={`${moneyInputClass} max-w-32`}
                      placeholder="سهم"
                      value={s.amount}
                      onChange={(value) =>
                        setShares(shares.map((x, j) => (j === i ? { ...x, amount: value } : x)))
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <Select
                        value={s.party}
                        options={[
                          { value: "", label: "بدون طرف حساب (تعیین بعدی)" },
                          ...data.counterparties.map((c) => ({
                            value: c.id,
                            label: `طرف حساب: ${c.name}`,
                          })),
                        ]}
                        onChange={(e) =>
                          setShares(shares.map((x, j) => (j === i ? { ...x, party: e.target.value } : x)))
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShares(shares.filter((_, j) => j !== i))}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShares([...shares, { label: "", amount: "", party: "" }])}
                >
                  + افزودن شرکت‌کننده
                </Button>
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

          <div className="space-y-1.5">
            <Label htmlFor="txn-e-desc">توضیح (اختیاری)</Label>
            <Input
              id="txn-e-desc"
              maxLength={200}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="مثلاً خرید هفتگی"
            />
          </div>
          <Button
            type="submit"
            variant="destructive"
            disabled={busy || shareError}
            className="self-start gap-1.5"
          >
            <Minus className="size-4" aria-hidden />
            {busy ? "در حال ثبت…" : "ثبت هزینه"}
          </Button>
        </form>
      </CardContent>
    </Card>
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
    <div className="flex flex-col gap-2 rounded-lg border border-input bg-background/40 p-3 md:grid md:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]">
      <Select
        value={type}
        onChange={(e) => setType(e.target.value)}
        aria-label="نوع"
        options={[
          { value: "", label: "همه انواع" },
          { value: "INCOME", label: "درآمد" },
          { value: "EXPENSE", label: "هزینه" },
        ]}
      />
      <Select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        aria-label="دسته‌بندی"
        options={[
          { value: "", label: "همه دسته‌ها" },
          ...allCats.map((c) => ({ value: c.id, label: c.name })),
        ]}
      />
      <Select
        value={asset}
        onChange={(e) => setAsset(e.target.value)}
        aria-label="منبع"
        options={[
          { value: "", label: "همه منابع" },
          ...endpoints,
        ]}
      />
       <JalaliDateInput id="transactions-from" ariaLabel="از تاریخ" value={from} onChange={setFrom} className={moneyInputClass} />
       <JalaliDateInput id="transactions-to" ariaLabel="تا تاریخ" value={to} onChange={setTo} className={moneyInputClass} />
      <Button type="button" onClick={apply} variant="default">
        اعمال فیلتر
      </Button>
    </div>
  );
}

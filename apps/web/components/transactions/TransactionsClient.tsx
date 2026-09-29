"use client";

import { useCallback, useEffect, useState } from "react";
import { FilterX, Minus, Plus, Receipt, Users } from "lucide-react";
import type {
  BankAccountDto,
  CategoryDto,
  CounterpartyDto,
  FinancialTransactionDto,
  PaginatedResponse,
} from "@batool/types";
import { listBankAccounts } from "@/lib/api/finance";
import { listActiveCategories } from "@/lib/api/categories";
import { listAllCounterparties } from "@/lib/api/debts";
import {
  listTransactions,
  type ListTransactionsInput,
  type TransactionFilters,
} from "@/lib/api/transactions";
import { formatTomanUnit } from "@/lib/formatting/persian";
import { formatJalaliDateTime } from "@/lib/formatting/jalali";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { JalaliDateInput } from "@/components/ui/JalaliDateInput";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { AddTransactionDialog } from "@/components/dashboard/AddTransactionDialog";

const moneyInputClass =
  "h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground placeholder:text-muted-foreground/70";

interface Data {
  accounts: BankAccountDto[];
  incomeCats: CategoryDto[];
  expenseCats: CategoryDto[];
  counterparties: CounterpartyDto[];
}

const emptyPage: PaginatedResponse<FinancialTransactionDto> = {
  data: [],
  meta: { page: 1, pageSize: 20, total: 0 },
};

function bankEndpoints(accounts: BankAccountDto[]) {
  return accounts.map((a) => ({ value: a.id, label: `حساب: ${a.name}` }));
}

export function TransactionsClient() {
  const [data, setData] = useState<Data | null>(null);
  const [page, setPage] = useState(emptyPage);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [dialog, setDialog] = useState<{ type: "INCOME" | "EXPENSE"; split: boolean } | null>(null);
  const noCounterparties =
    data !== null && data.counterparties.filter((c) => !c.archived).length === 0;

  // Reference data (accounts, categories, counterparties) is stable; only the
  // transaction rows are re-fetched when filters or the page change.
  useEffect(() => {
    Promise.all([
      listBankAccounts(),
      listActiveCategories("INCOME"),
      listActiveCategories("EXPENSE"),
      listAllCounterparties(),
    ])
      .then(([accounts, incomeCats, expenseCats, counterparties]) => {
        setData({
          accounts,
          incomeCats,
          expenseCats,
          counterparties: counterparties.filter((c) => !c.archived),
        });
      })
      // The API client already reports the failure through the notification
      // channel; swallowing it here keeps the console free of unhandled
      // rejections and leaves the forms in their empty state.
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const load = useCallback(async (f: TransactionFilters, p: number) => {
    // A failure is already toasted by the API client, so the previous page stays
    // on screen instead of the rejection escaping into an unhandled promise.
    const next = await listTransactions({ ...f, page: p } as ListTransactionsInput).catch(
      () => null,
    );
    if (next !== null) setPage(next);
  }, []);

  useEffect(() => {
    void load(filters, currentPage);
  }, [filters, currentPage, load]);

  // Any new transaction can change both the filters' result and the sort order,
  // so go back to the first page after creating one.
  const reload = useCallback(async () => {
    setCurrentPage(1);
    await load(filters, 1);
  }, [filters, load]);

  function applyFilters(next: TransactionFilters) {
    setCurrentPage(1);
    setFilters(next);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">دفتر تراکنش‌ها</p>
          <h1 className="text-3xl font-bold">تراکنش‌ها</h1>
          <p className="text-sm text-muted">ثبت درآمد و هزینه و بررسی تاریخچه</p>
        </div>
        {/* Creation forms open in modals, the same pattern as the Assets page. */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setDialog({ type: "INCOME", split: false })}>
            <Plus aria-hidden /> ثبت درآمد
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDialog({ type: "EXPENSE", split: false })}
          >
            <Minus aria-hidden /> ثبت هزینه
          </Button>
          <Button
            variant="outline"
            onClick={() => setDialog({ type: "EXPENSE", split: true })}
            disabled={noCounterparties}
            title={
              noCounterparties
                ? "برای هزینه مشترک ابتدا یک طرف حساب بسازید."
                : "تقسیم هزینه بین طرف حساب‌های شما"
            }
          >
            <Users aria-hidden /> هزینه مشترک
          </Button>
        </div>
      </header>

      {noCounterparties ? (
        <p className="rounded-lg border border-input bg-background/40 px-3 py-2 text-xs text-muted">
          برای ثبت هزینه مشترک، ابتدا از بخش «طرف حساب‌ها» یک طرف حساب بسازید؛ شرکت‌کننده هزینه
          مشترک فقط از طرف حساب‌های شما انتخاب می‌شود.
        </p>
      ) : null}

      <AddTransactionDialog
        type={dialog?.type ?? null}
        defaultSplit={dialog?.split ?? false}
        onClose={() => setDialog(null)}
        onSaved={() => {
          setDialog(null);
          void reload();
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>تاریخچه تراکنش‌ها</CardTitle>
          <CardDescription>فیلتر بر اساس نوع، دسته‌بندی، منبع یا تاریخ</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {data !== null ? <Filters data={data} onApply={applyFilters} /> : null}
          {loading && data === null ? (
            <p className="text-sm text-muted">در حال بارگذاری…</p>
          ) : page.data.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="تراکنشی یافت نشد"
              description="با ثبت درآمد یا هزینه اولین تراکنش خود را ثبت کنید."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {page.data.map((t) => (
                <TransactionRow key={t.id} t={t} />
              ))}
            </ul>
          )}
          {page.meta.total > 0 ? (
            <Pagination
              meta={page.meta}
              onPageChange={setCurrentPage}
              label="صفحه‌بندی تراکنش‌ها"
            />
          ) : null}
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
          <b className="block truncate">
            {t.description !== null && t.description.trim().length > 0
              ? t.description
              : t.category.name}
          </b>
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
                {s.label !== null && s.label.trim().length > 0 ? s.label : "شرکت‌کننده"}:{" "}
                {formatTomanUnit(s.amountToman)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}

const emptyFilters: TransactionFilters = {};

function Filters({ data, onApply }: { data: Data; onApply: (f: TransactionFilters) => void }) {
  const [type, setType] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [account, setAccount] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const allCats = [...data.incomeCats, ...data.expenseCats];
  const endpoints = bankEndpoints(data.accounts);

  function current(): TransactionFilters {
    return {
      ...(type ? { type: type as TransactionFilters["type"] } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(account ? { assetKind: "BANK" as const, assetId: account } : {}),
      ...(from ? { from: `${from}T00:00:00.000Z` } : {}),
      ...(to ? { to: `${to}T23:59:59.999Z` } : {}),
    };
  }

  function apply() {
    onApply(current());
  }

  function clear() {
    setType("");
    setCategoryId("");
    setAccount("");
    setFrom("");
    setTo("");
    onApply(emptyFilters);
  }

  const hasFilters = Object.keys(current()).length > 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-input bg-background/40 p-3">
      <div className="grid gap-2 md:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
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
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          aria-label="حساب"
          options={[{ value: "", label: "همه حساب‌ها" }, ...endpoints]}
        />
        <div className="min-w-0">
          <Label className="text-xs" htmlFor="transactions-from">
            از تاریخ
          </Label>
          <JalaliDateInput
            id="transactions-from"
            value={from}
            onChange={setFrom}
            className={`${moneyInputClass} mt-1.5`}
          />
        </div>
        <div className="min-w-0">
          <Label className="text-xs" htmlFor="transactions-to">
            تا تاریخ
          </Label>
          <JalaliDateInput
            id="transactions-to"
            value={to}
            onChange={setTo}
            className={`${moneyInputClass} mt-1.5`}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={apply} variant="default">
          اعمال فیلتر
        </Button>
        <Button
          type="button"
          onClick={clear}
          variant="ghost"
          disabled={!hasFilters}
          className="gap-1.5"
        >
          <FilterX className="size-4" aria-hidden />
          پاک کردن فیلترها
        </Button>
      </div>
    </div>
  );
}

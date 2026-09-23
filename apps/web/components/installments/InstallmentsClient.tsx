"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArchiveRestore, CalendarCheck, History, Layers, Plus } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Progress } from "@/components/ui/progress";
import { JalaliDateInput } from "@/components/ui/JalaliDateInput";
import { cn } from "@/lib/cn";

const moneyInputClass =
  "h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground placeholder:text-muted-foreground/70";

interface AssetOpt {
  value: string;
  label: string;
}

function statusMeta(s: InstallmentDto["status"]): { text: string } {
  switch (s) {
    case "UPCOMING":
      return { text: "نزدیک" };
    case "DUE":
      return { text: "سررسید امروز" };
    case "OVERDUE":
      return { text: "معوق" };
    case "COMPLETED":
      return { text: "تکمیل‌شده" };
    case "ARCHIVED":
      return { text: "بایگانی‌شده" };
  }
}

function StatusBadge({ status }: { status: InstallmentDto["status"] }) {
  const meta = statusMeta(status);
  const variant =
    status === "OVERDUE" ? "destructive" : status === "DUE" ? "warning" : status === "COMPLETED" ? "success" : "secondary";
  return <Badge variant={variant}>{meta.text}</Badge>;
}

export function InstallmentsClient() {
  const [items, setItems] = useState<InstallmentDto[]>([]);
  const [accounts, setAccounts] = useState<BankAccountDto[]>([]);
  const [funds, setFunds] = useState<FundDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [inst, acc, fun] = await Promise.all([
      listInstallments(),
      listBankAccounts(),
      listFunds(),
    ]);
    setItems(inst);
    setAccounts(acc);
    setFunds(fun);
  }, []);

  useEffect(() => {
    reload()
      .catch((e) => setError(e instanceof ApiClientError ? e.message : "خطا در بارگذاری"))
      .finally(() => setLoading(false));
  }, [reload]);

  const assetOptions: AssetOpt[] = useMemo(
    () => [
      ...accounts.map((a) => ({ value: `BANK|${a.id}`, label: `حساب: ${a.name}` })),
      ...funds.map((f) => ({ value: `FUND|${f.id}`, label: `صندوق: ${f.name}` })),
    ],
    [accounts, funds],
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm text-muted">تعهدات مالی</p>
        <h1 className="text-3xl font-bold">اقساط</h1>
        <p className="mt-1 text-sm text-muted">پرداخت‌های دوره‌ای را پیگیری کنید</p>
      </header>

      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <CreateForm onDone={reload} onError={setError} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="size-4 text-primary" aria-hidden />
            فهرست اقساط
          </CardTitle>
          <CardDescription>پیشرفت و پرداخت‌های هر قسط</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="هنوز اقساطی ثبت نشده است"
              description="با تعریف اولین قسط، پرداخت‌های دوره‌ای را پیگیری کنید."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
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
        </CardContent>
      </Card>
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
        amountToman: amount,
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="size-4 text-primary" aria-hidden />
          قسط جدید
        </CardTitle>
        <CardDescription>مبلغ ثابت هر دوره به‌صورت سالیانه تکرار می‌شود.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-1.5">
            <Label htmlFor="in-name">نام</Label>
            <Input
              id="in-name"
              placeholder="مثلاً اقساط موبایل"
              maxLength={60}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="in-amount">مبلغ هر قسط (تومان)</Label>
            <MoneyInput
              id="in-amount"
              className={moneyInputClass}
              placeholder="مثلاً ۵۰۰٬۰۰۰"
              required
              value={amount}
              onChange={setAmount}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="in-count">تعداد اقساط</Label>
            <Input
              id="in-count"
              dir="ltr"
              inputMode="numeric"
              required
              value={count}
              onChange={(e) => setCount(e.target.value.replace(/[^\d]/g, ""))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="in-day">روز سررسید (۱-۳۱)</Label>
            <Input
              id="in-day"
              dir="ltr"
              inputMode="numeric"
              required
              value={day}
              onChange={(e) => setDay(e.target.value.replace(/[^\d]/g, ""))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="in-start">تاریخ شروع (اختیاری)</Label>
            <JalaliDateInput id="in-start" className={moneyInputClass} value={start} onChange={setStart} />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={busy} className="w-full lg:w-auto">
              {busy ? "…" : "ایجاد اقساط"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
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
  const payable = !item.archived && item.status !== "COMPLETED";
  const pct = item.totalCount === 0 ? 0 : Math.min(100, (item.paidCount / item.totalCount) * 100);

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
    <li className="flex flex-col gap-3 py-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold leading-6">{item.name}</h3>
          <p className="mt-0.5 text-muted-foreground">
            مبلغ هر قسط:{" "}
            <b className="text-foreground tabular-nums">{formatTomanUnit(item.amountToman)}</b> · روز
            سررسید: {item.dueDayOfMonth}
            {item.nextDueDate ? ` · قسط بعدی: ${formatJalaliDate(item.nextDueDate)}` : ""}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
        <span>
          پیشرفت:{" "}
          <b className="text-foreground tabular-nums">
            {item.paidCount} / {item.totalCount}
          </b>
        </span>
        <span>باقی‌مانده: {item.remainingCount}</span>
      </div>
      <Progress value={pct} label="پیشرفت پرداخت" />

      {payable ? (
        <form onSubmit={pay} className="flex flex-wrap items-center gap-2">
          <Select
            className="max-w-xs flex-1"
            placeholder="حساب / صندوق…"
            required
            options={assetOptions}
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
          />
          <span className="text-muted-foreground">
            مبلغ پرداختی: <b className="text-foreground tabular-nums">{formatTomanUnit(item.amountToman)}</b>
          </span>
          <Button type="submit" disabled={busy}>
            {busy ? "…" : "پرداخت قسط"}
          </Button>
        </form>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={toggleHistory}>
          <History className="size-3.5" aria-hidden />
          {open ? "بستن تاریخچه" : `تاریخچه پرداخت‌ها (${item.paidCount})`}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={archive}>
          <ArchiveRestore className="size-3.5" aria-hidden />
          {item.archived ? "بازگردانی" : "بایگانی"}
        </Button>
      </div>

      {open ? (
        <ul className="flex flex-col divide-y divide-border border-t border-border pt-2">
          {payments.length === 0 ? (
            <li className="py-2 text-muted-foreground">پرداختی ثبت نشده است.</li>
          ) : (
            payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="flex items-center gap-2">
                  <Badge variant="outline">{p.occurrenceNo}</Badge>
                  <b className="tabular-nums">{formatTomanUnit(p.amountToman)}</b>
                </span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  سررسید {formatJalaliDate(p.dueDate)}
                  <CalendarCheck className="size-3.5" aria-hidden />
                  پرداخت {formatJalaliDate(p.paidAt)}
                </span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </li>
  );
}

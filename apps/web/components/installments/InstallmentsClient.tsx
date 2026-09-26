"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArchiveRestore, CalendarCheck, History, Layers, Plus, Wallet } from "lucide-react";
import type { BankAccountDto, InstallmentDto } from "@batool/types";
import { listBankAccounts } from "@/lib/api/finance";
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
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Progress } from "@/components/ui/progress";
import { JalaliDateInput } from "@/components/ui/JalaliDateInput";

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
    status === "OVERDUE"
      ? "destructive"
      : status === "DUE"
        ? "warning"
        : status === "COMPLETED"
          ? "success"
          : "secondary";
  return <Badge variant={variant}>{meta.text}</Badge>;
}

export function InstallmentsClient() {
  const [items, setItems] = useState<InstallmentDto[]>([]);
  const [accounts, setAccounts] = useState<BankAccountDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(false);
  const closeForm = () => setForm(false);

  const reload = useCallback(async () => {
    const [inst, acc] = await Promise.all([listInstallments(), listBankAccounts()]);
    setItems(inst);
    setAccounts(acc);
  }, []);

  useEffect(() => {
    let active = true;
    // The API client already reports failures through the notification channel.
    void reload()
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);

  /** Same refresh, but never rejects: the toast already reported the failure. */
  const refresh = useCallback(async () => {
    await reload().catch(() => undefined);
  }, [reload]);

  // Installments are always paid from a Bank Account; funds are savings only.
  const assetOptions: AssetOpt[] = useMemo(
    () => accounts.map((a) => ({ value: `BANK|${a.id}`, label: `حساب: ${a.name}` })),
    [accounts],
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm text-muted">تعهدات مالی</p>
        <h1 className="text-3xl font-bold">اقساط</h1>
        <p className="mt-1 text-sm text-muted">پرداخت‌های دوره‌ای را پیگیری کنید</p>
      </header>

      {/* Actions: every creation form lives in a modal, like the Assets and Setar pages. */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setForm(true)}>
          <Plus aria-hidden /> قسط جدید
        </Button>
      </div>

      <Dialog
        open={form}
        onOpenChange={(value) => {
          if (!value) closeForm();
        }}
        title="قسط جدید"
        description="مبلغ ثابت هر دوره به‌صورت سالیانه تکرار می‌شود."
      >
        <CreateForm onDone={refresh} onSaved={closeForm} />
      </Dialog>

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
                  onChanged={refresh}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateForm({ onDone, onSaved }: { onDone: () => Promise<void>; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [count, setCount] = useState("12");
  const [day, setDay] = useState("1");
  const [start, setStart] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
      onSaved();
      await onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
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
      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="in-start">تاریخ شروع (اختیاری)</Label>
        <JalaliDateInput
          id="in-start"
          className={moneyInputClass}
          value={start}
          onChange={setStart}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSaved}>
          انصراف
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "در حال ثبت…" : "ایجاد اقساط"}
        </Button>
      </div>
    </form>
  );
}

function PayForm({
  item,
  assetOptions,
  onDone,
  onSaved,
}: {
  item: InstallmentDto;
  assetOptions: AssetOpt[];
  onDone: () => Promise<void>;
  onSaved: () => void;
}) {
  const [asset, setAsset] = useState("");
  const [busy, setBusy] = useState(false);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!asset) return;
    setBusy(true);
    try {
      const idx = asset.indexOf("|");
      await payInstallment(item.id, {
        assetKind: "BANK",
        assetId: asset.slice(idx + 1),
      });
      setAsset("");
      onSaved();
      await onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={pay} className="flex flex-col gap-3">
      <div className="space-y-1.5">
        <Label htmlFor={`in-asset-${item.id}`}>از حساب بانکی</Label>
        <Select
          id={`in-asset-${item.id}`}
          placeholder="حساب بانکی…"
          required
          options={assetOptions}
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
        />
      </div>
      <p className="text-sm text-muted">
        مبلغ پرداختی:{" "}
        <b className="tabular-nums text-foreground">{formatTomanUnit(item.amountToman)}</b>
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSaved}>
          انصراف
        </Button>
        <Button type="submit" disabled={busy || assetOptions.length === 0}>
          {busy ? "در حال پرداخت…" : "پرداخت قسط"}
        </Button>
      </div>
    </form>
  );
}

function InstallmentCard({
  item,
  assetOptions,
  onChanged,
}: {
  item: InstallmentDto;
  assetOptions: AssetOpt[];
  onChanged: () => Promise<void>;
}) {
  const payable = !item.archived && item.status !== "COMPLETED";
  const pct = item.totalCount === 0 ? 0 : Math.min(100, (item.paidCount / item.totalCount) * 100);

  const [payForm, setPayForm] = useState(false);
  const [open, setOpen] = useState(false);
  const [payments, setPayments] = useState<
    { id: string; occurrenceNo: number; amountToman: number; dueDate: string; paidAt: string }[]
  >([]);

  async function toggleHistory() {
    const next = !open;
    setOpen(next);
    if (next) {
      const d = await getInstallment(item.id);
      setPayments(d.payments);
    }
  }

  async function archive() {
    await updateInstallment(item.id, { archived: !item.archived });
    await onChanged();
  }

  return (
    <li className="flex flex-col gap-3 py-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold leading-6">{item.name}</h3>
          <p className="mt-0.5 text-muted-foreground">
            مبلغ هر قسط:{" "}
            <b className="text-foreground tabular-nums">{formatTomanUnit(item.amountToman)}</b> ·
            روز سررسید: {item.dueDayOfMonth}
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

      <div className="flex flex-wrap items-center gap-2">
        {payable ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setPayForm(true)}>
            <Wallet className="size-3.5" aria-hidden />
            پرداخت قسط
          </Button>
        ) : null}
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

      <Dialog
        open={payForm}
        onOpenChange={(value) => {
          if (!value) setPayForm(false);
        }}
        title={`پرداخت قسط — ${item.name}`}
        description={`مبلغ پرداختی: ${formatTomanUnit(item.amountToman)}`}
      >
        <PayForm
          item={item}
          assetOptions={assetOptions}
          onDone={onChanged}
          onSaved={() => setPayForm(false)}
        />
      </Dialog>
    </li>
  );
}

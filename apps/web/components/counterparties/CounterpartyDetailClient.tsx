"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { History, Plus, Receipt } from "lucide-react";
import type {
  BankAccountDto,
  CounterpartyDto,
  DebtEventDto,
  PaginatedResponse,
} from "@batool/types";
import { ApiClientError } from "@/lib/api/client";
import { listBankAccounts } from "@/lib/api/finance";
import { createDebtEvent, getCounterparty, settleDebt, updateCounterparty } from "@/lib/api/debts";
import { formatTomanUnit } from "@/lib/formatting/persian";
import { formatJalaliDateTime } from "@/lib/formatting/jalali";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Select, type SelectOption } from "@/components/ui/select";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { cn } from "@/lib/cn";

const moneyInputClass =
  "h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground placeholder:text-muted-foreground/70";

export function CounterpartyDetailClient({ id }: { id: string }) {
  const [cp, setCp] = useState<CounterpartyDto | null>(null);
  const [events, setEvents] = useState<PaginatedResponse<DebtEventDto> | null>(null);
  const [page, setPage] = useState(1);
  const [accounts, setAccounts] = useState<BankAccountDto[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState<"event" | "settle" | null>(null);
  const closeForm = () => setForm(null);

  const reload = useCallback(async () => {
    const [detail, acc] = await Promise.all([getCounterparty(id, page), listBankAccounts()]);
    setCp(detail.counterparty);
    setEvents(detail.events);
    setAccounts(acc);
  }, [id, page]);

  useEffect(() => {
    reload().catch((e) => {
      // A 404 means the counterparty is gone/unreachable; anything else is
      // already surfaced as a notification by the API client.
      if (e instanceof ApiClientError && e.status === 404) {
        setNotFound(true);
      }
    });
  }, [reload]);

  /** Same refresh, but never rejects: the toast already reported the failure. */
  const refresh = useCallback(async () => {
    await reload().catch(() => undefined);
  }, [reload]);

  // Settlements are always paid from / received into a Bank Account.
  const assetOptions: SelectOption[] = useMemo(
    () => accounts.map((a) => ({ value: a.id, label: `حساب: ${a.name}` })),
    [accounts],
  );

  /** A new event changes the history ordering, so return to the first page. */
  const afterEvent = useCallback(async () => {
    setPage(1);
    await refresh();
  }, [refresh]);

  async function onToggleArchive() {
    if (cp === null) return;
    await updateCounterparty(id, { archived: !cp.archived });
    await refresh();
  }

  if (notFound) {
    return (
      <Card className="p-6">
        <p className="text-danger">طرف حساب یافت نشد یا در دسترس شما نیست.</p>
      </Card>
    );
  }
  if (cp === null) {
    return (
      <Card className="p-6">
        <p className="text-muted">در حال بارگذاری…</p>
      </Card>
    );
  }

  const owesMe = cp.direction === "OWES_ME";
  const directionLine =
    cp.direction === "SETTLED"
      ? "تسویه شده است"
      : owesMe
        ? `«${cp.name}» به شما بدهکار است`
        : `شما به «${cp.name}» بدهکار هستید`;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/counterparties"
        className="text-sm font-bold text-primary hover:underline"
      >
        → بازگشت به طرف‌حساب‌ها
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">روابط مالی</p>
          <h1 className="text-3xl font-bold">{cp.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {cp.kind === "USER" ? `کاربر ثبت‌نام‌شده: @${cp.linkedUsername}` : "طرف حساب خارجی"}
            {cp.archived ? " · بایگانی‌شده" : ""}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onToggleArchive}>
          {cp.archived ? "بازگردانی" : "بایگانی"}
        </Button>
      </header>

      <Card>
        <div className="p-6">
          <p className="text-lg font-bold">{directionLine}</p>
          {cp.direction !== "SETTLED" ? (
            <p
              className={cn("mt-1 text-3xl font-bold", owesMe ? "text-accent-dark" : "text-danger")}
            >
              {formatTomanUnit(cp.outstandingToman)}
            </p>
          ) : (
            <Badge variant="secondary" className="mt-2">
              تسویه
            </Badge>
          )}
        </div>
      </Card>

      {/* Actions: every form lives in a modal, like the Counterparties and Installments pages. */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setForm("event")}>
          <Plus aria-hidden /> ثبت رویداد بدهی
        </Button>
        {/* Only the debtor can pay: the server rejects it otherwise. */}
        <Button
          variant="destructive"
          disabled={cp.direction !== "I_OWE"}
          onClick={() => setForm("settle")}
        >
          <Receipt aria-hidden /> پرداخت بدهی
        </Button>
      </div>

      {cp.direction !== "I_OWE" ? (
        <p
          role="note"
          className="rounded-lg border border-input bg-background/40 px-3 py-2 text-xs text-muted"
        >
          {cp.direction === "SETTLED"
            ? "این طرف حساب تسویه است و بدهی قابل پرداختی ندارد."
            : `«${cp.name}» به شما بدهکار است، بنابراین پرداخت بدهی برای شما در این رابطه فعال نیست.`}
        </p>
      ) : null}

      <Dialog
        open={form === "event"}
        onOpenChange={(value) => {
          if (!value) closeForm();
        }}
        title="ثبت رویداد بدهی"
        description="ثبت یک طلب یا بدهی جدید از طرف این شخص."
      >
        <AddEventForm counterpartyId={id} onDone={afterEvent} onSaved={closeForm} />
      </Dialog>

      <Dialog
        open={form === "settle"}
        onOpenChange={(value) => {
          if (!value) closeForm();
        }}
        title="پرداخت بدهی"
        description={`پرداخت بدهی «${cp.name}» از یکی از حساب‌های بانکی شما.`}
      >
        <SettleForm
          counterpartyId={id}
          name={cp.name}
          outstandingToman={cp.outstandingToman}
          assetOptions={assetOptions}
          onDone={refresh}
          onSaved={closeForm}
        />
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4 text-primary" aria-hidden />
            تاریخچه
          </CardTitle>
          <CardDescription>رویدادها و تسویه‌های ثبت‌شده</CardDescription>
        </CardHeader>
        <CardContent>
          {(events?.data.length ?? 0) === 0 ? (
            <EmptyState
              icon={History}
              title="رویدادی ثبت نشده است"
              description="با ثبت رویداد بدهی یا تسویه، تاریخچه این طرف حساب اینجا نمایش داده می‌شود."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {events?.data.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          e.kind === "SETTLEMENT"
                            ? "secondary"
                            : e.direction === "OWES_ME"
                              ? "success"
                              : "destructive"
                        }
                        className="tabular-nums"
                      >
                        {eventLabel(e)}
                      </Badge>
                      <span className="text-xs text-muted">
                        {formatJalaliDateTime(e.occurredAt)}
                      </span>
                    </div>
                    <span className="mt-1 block truncate text-ink">
                      {e.description && e.description.trim().length > 0
                        ? e.description
                        : "بدون توضیح"}
                      {e.sourceShareId ? " · نشئت از تقسیم هزینه" : ""}
                    </span>
                    {e.asset ? (
                      <span className="block text-xs text-muted">از طریق: {e.asset.name}</span>
                    ) : null}
                  </div>
                  <b
                    className={cn(
                      "shrink-0 tabular-nums",
                      e.direction === "OWES_ME" ? "text-accent-dark" : "text-danger",
                    )}
                  >
                    {formatTomanUnit(e.amountToman)}
                  </b>
                </li>
              ))}
            </ul>
          )}
          {events !== null && events.meta.total > 0 ? (
            <Pagination
              className="mt-3"
              meta={events.meta}
              onPageChange={setPage}
              label="صفحه‌بندی رویدادهای بدهی"
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function AddEventForm({
  counterpartyId,
  onDone,
  onSaved,
}: {
  counterpartyId: string;
  onDone: () => Promise<void>;
  onSaved: () => void;
}) {
  const [dir, setDir] = useState<"OWES_ME" | "I_OWE">("OWES_ME");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    setBusy(true);
    try {
      await createDebtEvent({
        counterpartyId,
        direction: dir,
        amountToman: amount,
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      setAmount("");
      setDescription("");
      onSaved();
      await onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="ev-dir">جهت</Label>
        <Select
          id="ev-dir"
          data-autofocus
          options={[
            { value: "OWES_ME", label: "طرف مقابل به من بدهکار است" },
            { value: "I_OWE", label: "من به طرف مقابل بدهکارم" },
          ]}
          value={dir}
          onChange={(e) => setDir(e.target.value as "OWES_ME" | "I_OWE")}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ev-amount">مبلغ (تومان)</Label>
        <MoneyInput
          id="ev-amount"
          className={moneyInputClass}
          placeholder="مثلاً ۵۰۰٬۰۰۰"
          value={amount}
          onChange={setAmount}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ev-desc">توضیح (اختیاری)</Label>
        <Input
          id="ev-desc"
          placeholder="مثلاً قرض شهریور"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSaved}>
          انصراف
        </Button>
        <Button type="submit" disabled={busy}>
          <Plus aria-hidden />
          {busy ? "در حال ثبت…" : "ثبت رویداد"}
        </Button>
      </div>
    </form>
  );
}

function SettleForm({
  counterpartyId,
  name,
  outstandingToman,
  assetOptions,
  onDone,
  onSaved,
}: {
  counterpartyId: string;
  name: string;
  outstandingToman: number;
  assetOptions: SelectOption[];
  onDone: () => Promise<void>;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !asset) return;
    setBusy(true);
    try {
      await settleDebt({
        counterpartyId,
        amountToman: amount,
        assetKind: "BANK",
        assetId: asset,
      });
      setAmount("");
      setAsset("");
      onSaved();
      await onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        مانده بدهی شما به «{name}» {formatTomanUnit(outstandingToman)} است؛ مبلغ پرداخت نمی‌تواند از
        آن بیشتر باشد.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="se-amount">مبلغ (تومان)</Label>
        <MoneyInput
          id="se-amount"
          className={moneyInputClass}
          placeholder="مثلاً ۳۵۰٬۰۰۰"
          value={amount}
          onChange={setAmount}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="se-asset">حساب بانکی</Label>
        <Select
          id="se-asset"
          required
          placeholder="حساب بانکی…"
          options={assetOptions}
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSaved}>
          انصراف
        </Button>
        <Button type="submit" variant="destructive" disabled={busy}>
          {busy ? "در حال پرداخت…" : "پرداخت بدهی"}
        </Button>
      </div>
    </form>
  );
}

function eventLabel(e: DebtEventDto): string {
  const who = e.direction === "OWES_ME" ? "بدهکار به من" : "من بدهکار";
  return e.kind === "SETTLEMENT" ? `تسویه · ${who}` : `رویداد · ${who}`;
}

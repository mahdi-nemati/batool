"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, History, Plus, Receipt } from "lucide-react";
import type {
  AssetKind,
  BankAccountDto,
  CounterpartyDto,
  DebtEventDto,
  FundDto,
} from "@batool/types";
import { ApiClientError } from "@/lib/api/client";
import { listBankAccounts, listFunds } from "@/lib/api/finance";
import { createDebtEvent, getCounterparty, settleDebt, updateCounterparty } from "@/lib/api/debts";
import { formatTomanUnit } from "@/lib/formatting/persian";
import { formatJalaliDateTime } from "@/lib/formatting/jalali";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { cn } from "@/lib/cn";

const moneyInputClass =
  "h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground placeholder:text-muted-foreground/70";

export function CounterpartyDetailClient({ id }: { id: string }) {
  const [cp, setCp] = useState<CounterpartyDto | null>(null);
  const [events, setEvents] = useState<DebtEventDto[]>([]);
  const [accounts, setAccounts] = useState<BankAccountDto[]>([]);
  const [funds, setFunds] = useState<FundDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // debt event form
  const [dir, setDir] = useState<"OWES_ME" | "I_OWE">("OWES_ME");
  const [dAmount, setDAmount] = useState("");
  const [dDesc, setDDesc] = useState("");
  // settlement form
  const [sAmount, setSAmount] = useState("");
  const [asset, setAsset] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const [detail, acc, fun] = await Promise.all([
      getCounterparty(id),
      listBankAccounts(),
      listFunds(),
    ]);
    setCp(detail.counterparty);
    setEvents(detail.events);
    setAccounts(acc);
    setFunds(fun);
  }, [id]);

  useEffect(() => {
    reload().catch((e) => {
      if (e instanceof ApiClientError && e.status === 404) {
        setNotFound(true);
      } else {
        setError(e instanceof ApiClientError ? e.message : "خطا در بارگذاری");
      }
    });
  }, [reload]);

  const assetOptions = useMemo(
    () => [
      ...accounts.map((a) => ({ value: `BANK|${a.id}`, label: `حساب: ${a.name}` })),
      ...funds.map((f) => ({ value: `FUND|${f.id}`, label: `صندوق: ${f.name}` })),
    ],
    [accounts, funds],
  );

  async function onAddEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!dAmount) return;
    setError(null);
    setBusy(true);
    try {
      await createDebtEvent({
        counterpartyId: id,
        direction: dir,
        amountToman: dAmount,
        ...(dDesc ? { description: dDesc } : {}),
      });
      setDAmount("");
      setDDesc("");
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  async function onSettle(e: React.FormEvent) {
    e.preventDefault();
    if (!sAmount || !asset) return;
    setError(null);
    setBusy(true);
    try {
      const idx = asset.indexOf("|");
      const kind = asset.slice(0, idx) as AssetKind;
      const assetId = asset.slice(idx + 1);
      await settleDebt({
        counterpartyId: id,
        amountToman: sAmount,
        assetKind: kind,
        assetId,
      });
      setSAmount("");
      setAsset("");
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  async function onToggleArchive() {
    if (cp === null) return;
    setError(null);
    try {
      await updateCounterparty(id, { archived: !cp.archived });
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "خطا");
    }
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
      <Link href="/dashboard/counterparties" className="text-sm font-bold text-primary hover:underline">
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
            <p className={cn("mt-1 text-3xl font-bold", owesMe ? "text-accent-dark" : "text-danger")}>
              {formatTomanUnit(cp.outstandingToman)}
            </p>
          ) : (
            <Badge variant="secondary" className="mt-2">
              تسویه
            </Badge>
          )}
        </div>
      </Card>

      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4 text-primary" aria-hidden />
              ثبت رویداد بدهی
            </CardTitle>
            <CardDescription>ثبت یک طلب یا بدهی جدید از طرف این شخص.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onAddEvent} className="flex flex-col gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ev-dir">جهت</Label>
                <Select
                  id="ev-dir"
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
                  value={dAmount}
                  onChange={setDAmount}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-desc">توضیح (اختیاری)</Label>
                <Input
                  id="ev-desc"
                  placeholder="مثلاً قرض شهریور"
                  value={dDesc}
                  onChange={(e) => setDDesc(e.target.value)}
                  maxLength={200}
                />
              </div>
              <Button type="submit" disabled={busy} className="self-start gap-1.5">
                <Plus className="size-4" aria-hidden />
                {busy ? "در حال ثبت…" : "ثبت رویداد"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="size-4 text-primary" aria-hidden />
              تسویه بدهی
            </CardTitle>
            <CardDescription>جهت تسویه بر اساس مانده فعلی به‌طور خودکار تعیین می‌شود.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSettle} className="flex flex-col gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="se-amount">مبلغ (تومان)</Label>
                <MoneyInput
                  id="se-amount"
                  className={moneyInputClass}
                  placeholder="مثلاً ۳۵۰٬۰۰۰"
                  value={sAmount}
                  onChange={setSAmount}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="se-asset">از حساب / صندوق</Label>
                <Select
                  id="se-asset"
                  required
                  placeholder="حساب / صندوق…"
                  options={assetOptions}
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                />
              </div>
              <Button type="submit" variant="destructive" disabled={busy} className="self-start">
                {busy ? "در حال تسویه…" : "تسویه"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4 text-primary" aria-hidden />
            تاریخچه
          </CardTitle>
          <CardDescription>رویدادها و تسویه‌های ثبت‌شده</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <EmptyState
              icon={History}
              title="رویدادی ثبت نشده است"
              description="با ثبت رویداد بدهی یا تسویه، تاریخچه این طرف حساب اینجا نمایش داده می‌شود."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {events.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={e.kind === "SETTLEMENT" ? "secondary" : "outline"}
                        className={cn(
                          "tabular-nums",
                          e.kind !== "SETTLEMENT" &&
                            (e.direction === "OWES_ME" ? "bg-accent/10 text-accent-dark" : "bg-danger/10 text-danger"),
                          e.kind === "SETTLEMENT" && "bg-secondary text-muted",
                        )}
                      >
                        {eventLabel(e)}
                      </Badge>
                      <span className="text-xs text-muted">{formatJalaliDateTime(e.occurredAt)}</span>
                    </div>
                    <span className="mt-1 block truncate text-ink">
                      {e.description ?? "—"}
                      {e.sourceShareId ? " · نشئت از تقسیم هزینه" : ""}
                    </span>
                    {e.asset ? (
                      <span className="block text-xs text-muted">از طریق: {e.asset.name}</span>
                    ) : null}
                  </div>
                  <b className={cn("shrink-0 tabular-nums", e.direction === "OWES_ME" ? "text-accent-dark" : "text-danger")}>
                    {formatTomanUnit(e.amountToman)}
                  </b>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function eventLabel(e: DebtEventDto): string {
  const who = e.direction === "OWES_ME" ? "بدهکار به من" : "من بدهکار";
  return e.kind === "SETTLEMENT" ? `تسویه · ${who}` : `رویداد · ${who}`;
}
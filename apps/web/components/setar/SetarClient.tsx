"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArchiveRestore, CalendarCheck, History, Music2, Plus, Wallet } from "lucide-react";
import type {
  AssetKind,
  BankAccountDto,
  FundDto,
  SetarSessionDto,
  SetarStatusDto,
  SetarTuitionPaymentDto,
} from "@batool/types";
import { ApiClientError } from "@/lib/api/client";
import { listBankAccounts, listFunds } from "@/lib/api/finance";
import {
  createSetarProfile,
  createSetarSession,
  getSetarStatus,
  listSetarPayments,
  listSetarSessions,
  paySetarTuition,
  updateSetarProfile,
} from "@/lib/api/setar";
import { formatJalaliDate } from "@/lib/formatting/jalali";
import { formatTomanUnit } from "@/lib/formatting/persian";
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

function statusMeta(s: SetarStatusDto): { text: string; variant: "success" | "secondary" | "destructive" } {
  if (s.profile === null) {
    return { text: "", variant: "secondary" };
  }
  if (s.profile.archived) {
    return { text: "بایگانی‌شده", variant: "secondary" };
  }
  if (s.tuitionPayable) {
    return { text: "قابل پرداخت", variant: "destructive" };
  }
  if (s.paidCycleCount > 0) {
    return { text: "پرداخت شده / در انتظار چرخه بعد", variant: "success" };
  }
  return { text: "هنوز قابل پرداخت نیست", variant: "secondary" };
}

const decimal = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });

export function SetarClient() {
  const [status, setStatus] = useState<SetarStatusDto | null>(null);
  const [sessions, setSessions] = useState<SetarSessionDto[]>([]);
  const [payments, setPayments] = useState<SetarTuitionPaymentDto[]>([]);
  const [accounts, setAccounts] = useState<BankAccountDto[]>([]);
  const [funds, setFunds] = useState<FundDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [st, se, pa, ac, fu] = await Promise.all([
      getSetarStatus(),
      listSetarSessions(),
      listSetarPayments(),
      listBankAccounts(),
      listFunds(),
    ]);
    setStatus(st);
    setSessions(se);
    setPayments(pa);
    setAccounts(ac);
    setFunds(fu);
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
        <p className="text-sm text-muted">شهریه دوره‌ای</p>
        <h1 className="text-3xl font-bold">سه‌تار</h1>
        <p className="mt-1 text-sm text-muted">جلسات و پرداخت شهریه دوره آموزش موسیقی</p>
      </header>

      {error !== null ? <InlineError message={error} /> : null}

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : status === null || status.profile === null ? (
        <SetupForm onDone={reload} onError={setError} />
      ) : (
        <SetarView
          status={status}
          sessions={sessions}
          payments={payments}
          assetOptions={assetOptions}
          onDone={reload}
          onError={setError}
        />
      )}
    </div>
  );
}

function SetarView({
  status,
  sessions,
  payments,
  assetOptions,
  onDone,
  onError,
}: {
  status: SetarStatusDto;
  sessions: SetarSessionDto[];
  payments: SetarTuitionPaymentDto[];
  assetOptions: AssetOpt[];
  onDone: () => Promise<void>;
  onError: (e: string) => void;
}) {
  const badge = statusMeta(status);
  const profile = status.profile as NonNullable<SetarStatusDto["profile"]>;
  const progress = Math.min(100, (status.sessionsInCurrentCycle / 4) * 100);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="size-4 text-primary" aria-hidden />
            وضعیت شهریه
          </CardTitle>
          {badge.text ? (
            <Badge variant={badge.variant}>
              {badge.text}
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">شهریه فعلی</dt>
              <dd className="mt-0.5 font-bold text-foreground tabular-nums">
                {formatTomanUnit(profile.tuitionAmountToman)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">مجموع جلسات</dt>
              <dd className="mt-0.5 font-bold tabular-nums">{decimal.format(status.totalSessions)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">چرخه جاری</dt>
              <dd className="mt-0.5 font-bold tabular-nums">
                جلسه {decimal.format(status.sessionsInCurrentCycle)} از ۴
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">جلسات باقی‌مانده تا پرداخت</dt>
              <dd className="mt-0.5 font-bold tabular-nums">
                {decimal.format(status.sessionsRemainingUntilTuition)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">چرخه‌های پرداخت‌شده</dt>
              <dd className="mt-0.5 font-bold tabular-nums">
                {decimal.format(status.paidCycleCount)}
              </dd>
            </div>
          </dl>
          <Progress value={progress} label="جلسات چرخه" />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <SessionForm onDone={onDone} onError={onError} archived={profile.archived} />
        <TuitionForm
          profileId={profile.id}
          current={profile.tuitionAmountToman}
          onDone={onDone}
          onError={onError}
        />
        <PaymentForm
          status={status}
          assetOptions={assetOptions}
          onDone={onDone}
          onError={onError}
          className="lg:col-span-2"
        />
      </div>

      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            updateSetarProfile(profile.id, { archived: !profile.archived })
              .then(() => onDone())
              .catch((e) => onError(e instanceof ApiClientError ? e.message : "خطا"))
          }
        >
          <ArchiveRestore className="size-3.5" aria-hidden />
          {profile.archived ? "بازگردانی پروفایل" : "بایگانی پروفایل"}
        </Button>
      </div>

      <SetarHistory sessions={sessions} payments={payments} />
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

function SetupForm({
  onDone,
  onError,
}: {
  onDone: () => Promise<void>;
  onError: (e: string) => void;
}) {
  const [tuition, setTuition] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    onError("");
    setBusy(true);
    try {
      await createSetarProfile(tuition);
      setTuition("");
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
          <Music2 className="size-4 text-primary" aria-hidden />
          راه‌اندازی سه‌تار
        </CardTitle>
        <CardDescription>
          هنوز پروفایل سه‌تار ساخته نشده است. شهریه هر دوره را مشخص کنید.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1 space-y-1.5">
            <Label htmlFor="st-tuition">شهریه هر دوره (تومان)</Label>
            <MoneyInput
              id="st-tuition"
              className={moneyInputClass}
              placeholder="مثلاً ۳٬۰۰۰٬۰۰۰"
              required
              value={tuition}
              onChange={setTuition}
            />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "…" : "ایجاد پروفایل"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SessionForm({
  onDone,
  onError,
  archived,
}: {
  onDone: () => Promise<void>;
  onError: (e: string) => void;
  archived: boolean;
}) {
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    onError("");
    setBusy(true);
    try {
      await createSetarSession({
        ...(date ? { occurredAt: new Date(`${date}T00:00:00Z`).getTime() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      setDate("");
      setDescription("");
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
          ثبت جلسه
        </CardTitle>
        <CardDescription>هر جلسه سنتی چهار جلسه شهریه‌اش را پیش می‌برد.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ss-date">تاریخ جلسه (اختیاری)</Label>
            <JalaliDateInput id="ss-date" className={moneyInputClass} value={date} onChange={setDate} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ss-desc">توضیح (اختیاری)</Label>
            <Input
              id="ss-desc"
              placeholder="مثلاً تمرین موسیقی ایرانی"
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy || archived} className="self-start">
            {busy ? "…" : "ثبت جلسه"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function TuitionForm({
  profileId,
  current,
  onDone,
  onError,
}: {
  profileId: string;
  current: number;
  onDone: () => Promise<void>;
  onError: (e: string) => void;
}) {
  const [tuition, setTuition] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    onError("");
    setBusy(true);
    try {
      await updateSetarProfile(profileId, { tuitionAmountToman: tuition });
      setTuition("");
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
        <CardTitle>تغییر شهریه</CardTitle>
        <CardDescription>شهریه فعلی: {formatTomanUnit(current)}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="tt-amount">شهریه جدید (تومان)</Label>
            <MoneyInput
              id="tt-amount"
              className={moneyInputClass}
              placeholder="مثلاً ۳٬۵۰۰٬۰۰۰"
              required
              value={tuition}
              onChange={setTuition}
            />
          </div>
          <Button type="submit" disabled={busy} className="self-start">
            {busy ? "…" : "ذخیره شهریه"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PaymentForm({
  status,
  assetOptions,
  onDone,
  onError,
  className,
}: {
  status: SetarStatusDto;
  assetOptions: AssetOpt[];
  onDone: () => Promise<void>;
  onError: (e: string) => void;
  className?: string;
}) {
  const [asset, setAsset] = useState("");
  const [busy, setBusy] = useState(false);
  if (status.profile === null) {
    return null;
  }
  const payable = status.tuitionPayable && !status.profile.archived;
  const amount = status.profile.tuitionAmountToman;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!asset) return;
    onError("");
    setBusy(true);
    try {
      const idx = asset.indexOf("|");
      await paySetarTuition({
        assetKind: asset.slice(0, idx) as AssetKind,
        assetId: asset.slice(idx + 1),
      });
      setAsset("");
      await onDone();
    } catch (err) {
      onError(err instanceof ApiClientError ? err.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>پرداخت شهریه</CardTitle>
        <CardDescription>مبلغ از روی شهریه تعیین‌شده توسط سرور پرداخت می‌شود.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="st-asset">از حساب / صندوق</Label>
            <Select
              id="st-asset"
              placeholder="حساب / صندوق…"
              disabled={!payable}
              required
              options={assetOptions}
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
            />
          </div>
          {!status.tuitionPayable ? (
            <p className="text-sm text-muted">
              {status.totalSessions === 0
                ? "هنوز جلسه‌ای ثبت نشده است."
                : `پس از تکمیل ${decimal.format(status.sessionsRemainingUntilTuition)} جلسه باقی‌مانده، پرداخت فعال می‌شود.`}
            </p>
          ) : null}
          <Button type="submit" variant={payable ? "default" : "secondary"} disabled={busy || !payable} className="self-start">
            {busy ? "…" : `پرداخت شهریه (${formatTomanUnit(amount)})`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SetarHistory({
  sessions,
  payments,
}: {
  sessions: SetarSessionDto[];
  payments: SetarTuitionPaymentDto[];
}) {
  const [tab, setTab] = useState<"sessions" | "payments">("sessions");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4 text-primary" aria-hidden />
          تاریخچه
        </CardTitle>
        <div className="flex rounded-lg border border-input bg-background/60 p-0.5">
          {(
            [
              { key: "sessions", label: `جلسات (${decimal.format(sessions.length)})` },
              { key: "payments", label: `پرداخت شهریه (${decimal.format(payments.length)})` },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "h-8 flex-1 rounded-md px-3 text-sm font-semibold transition-colors",
                tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {tab === "sessions" ? (
          sessions.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="هنوز جلسه‌ای ثبت نشده است"
              description="با ثبت اولین جلسه، چرخه شهریه آغاز می‌شود."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {sessions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className="tabular-nums">جلسه {decimal.format(s.sessionNo)}</Badge>
                    {s.description ? <span className="text-muted">({s.description})</span> : null}
                  </span>
                  <span className="text-muted-foreground">{formatJalaliDate(s.occurredAt)}</span>
                </li>
              ))}
            </ul>
          )
        ) : payments.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="پرداخت شهریه‌ای ثبت نشده است"
            description="پس از تکمیل چرخه، پرداخت ثبت و اینجا نمایش داده می‌شود."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <span className="flex items-center gap-2">
                  <b className="tabular-nums">{formatTomanUnit(p.amountToman)}</b>
                  <span className="text-muted-foreground">
                    دوره {decimal.format(p.cycleNo)} · جلسات {decimal.format(p.sessionStartNo)} تا {decimal.format(p.sessionEndNo)}
                  </span>
                </span>
                <span className="text-muted-foreground">{formatJalaliDate(p.paidAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

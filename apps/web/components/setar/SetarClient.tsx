"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArchiveRestore, CalendarCheck, History, Music2, Plus, Wallet } from "lucide-react";
import type {
  BankAccountDto,
  PaginatedResponse,
  SetarSessionDto,
  SetarStatusDto,
  SetarTuitionPaymentDto,
} from "@batool/types";
import { listBankAccounts } from "@/lib/api/finance";
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
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Progress } from "@/components/ui/progress";
import { Dialog } from "@/components/ui/dialog";
import { JalaliDateInput } from "@/components/ui/JalaliDateInput";
import { cn } from "@/lib/cn";

const moneyInputClass =
  "h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground placeholder:text-muted-foreground/70";

/** Tuition is always paid from a Bank Account, so the value is just the id. */
const BANK_PREFIX = "BANK|";

interface AssetOpt {
  value: string;
  label: string;
}

function statusMeta(s: SetarStatusDto): {
  text: string;
  variant: "success" | "secondary" | "destructive";
} {
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
  const [sessions, setSessions] = useState<PaginatedResponse<SetarSessionDto> | null>(null);
  const [payments, setPayments] = useState<PaginatedResponse<SetarTuitionPaymentDto> | null>(null);
  const [sessionPage, setSessionPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [accounts, setAccounts] = useState<BankAccountDto[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [st, se, pa, ac] = await Promise.all([
      getSetarStatus(),
      listSetarSessions(sessionPage),
      listSetarPayments(paymentPage),
      listBankAccounts(),
    ]);
    setStatus(st);
    setSessions(se);
    setPayments(pa);
    setAccounts(ac);
  }, [sessionPage, paymentPage]);

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

  // Bank Accounts only: funds are savings pots and never a tuition source.
  const assetOptions: AssetOpt[] = useMemo(
    () => accounts.map((a) => ({ value: `${BANK_PREFIX}${a.id}`, label: `حساب: ${a.name}` })),
    [accounts],
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm text-muted">شهریه دوره‌ای</p>
        <h1 className="text-3xl font-bold">سه‌تار</h1>
        <p className="mt-1 text-sm text-muted">جلسات و پرداخت شهریه دوره آموزش موسیقی</p>
      </header>

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : status === null || status.profile === null ? (
        <SetupForm onDone={refresh} />
      ) : (
        <SetarView
          status={status}
          sessions={sessions}
          payments={payments}
          assetOptions={assetOptions}
          onDone={refresh}
          onSessionPage={setSessionPage}
          onPaymentPage={setPaymentPage}
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
  onSessionPage,
  onPaymentPage,
}: {
  status: SetarStatusDto;
  sessions: PaginatedResponse<SetarSessionDto> | null;
  payments: PaginatedResponse<SetarTuitionPaymentDto> | null;
  assetOptions: AssetOpt[];
  onDone: () => Promise<void>;
  onSessionPage: (page: number) => void;
  onPaymentPage: (page: number) => void;
}) {
  const badge = statusMeta(status);
  const profile = status.profile as NonNullable<SetarStatusDto["profile"]>;
  const progress = Math.min(100, (status.sessionsInCurrentCycle / 4) * 100);
  // Tuition can only be paid from a Bank Account, and only once the cycle is due.
  const payable = status.tuitionPayable && !profile.archived;
  const [form, setForm] = useState<"session" | "tuition" | "payment" | null>(null);
  const closeForm = () => setForm(null);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="size-4 text-primary" aria-hidden />
            وضعیت شهریه
          </CardTitle>
          {badge.text ? <Badge variant={badge.variant}>{badge.text}</Badge> : null}
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
              <dd className="mt-0.5 font-bold tabular-nums">
                {decimal.format(status.totalSessions)}
              </dd>
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

      {/* Actions: every creation form lives in a modal, like the Assets page. */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setForm("session")} disabled={profile.archived}>
          <Plus aria-hidden /> ثبت جلسه
        </Button>
        <Button variant="outline" onClick={() => setForm("payment")} disabled={!payable}>
          <Wallet aria-hidden /> پرداخت شهریه ({formatTomanUnit(profile.tuitionAmountToman)})
        </Button>
        <Button variant="outline" onClick={() => setForm("tuition")}>
          تغییر شهریه
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            updateSetarProfile(profile.id, { archived: !profile.archived }).then(() => onDone())
          }
        >
          <ArchiveRestore className="size-3.5" aria-hidden />
          {profile.archived ? "بازگردانی پروفایل" : "بایگانی پروفایل"}
        </Button>
      </div>
      {!payable ? (
        <p className="text-xs text-muted">
          {status.totalSessions === 0
            ? "هنوز جلسه‌ای ثبت نشده است؛ پس از ثبت جلسه‌ها چرخه شهریه آغاز می‌شود."
            : `پس از تکمیل ${decimal.format(status.sessionsRemainingUntilTuition)} جلسه باقی‌مانده، پرداخت شهریه فعال می‌شود.`}
        </p>
      ) : null}

      <Dialog
        open={form === "session"}
        onOpenChange={(value) => {
          if (!value) closeForm();
        }}
        title="ثبت جلسه"
        description="هر جلسه سنتی چهار جلسه شهریه‌اش را پیش می‌برد."
      >
        <SessionForm onDone={onDone} archived={profile.archived} onSaved={closeForm} />
      </Dialog>

      <Dialog
        open={form === "tuition"}
        onOpenChange={(value) => {
          if (!value) closeForm();
        }}
        title="تغییر شهریه"
        description={`شهریه فعلی: ${formatTomanUnit(profile.tuitionAmountToman)}`}
      >
        <TuitionForm profileId={profile.id} onDone={onDone} onSaved={closeForm} />
      </Dialog>

      <Dialog
        open={form === "payment"}
        onOpenChange={(value) => {
          if (!value) closeForm();
        }}
        title="پرداخت شهریه"
        description="مبلغ از روی شهریه تعیین‌شده توسط سرور پرداخت می‌شود."
      >
        <PaymentForm
          status={status}
          assetOptions={assetOptions}
          onDone={onDone}
          onSaved={closeForm}
        />
      </Dialog>

      <SetarHistory
        sessions={sessions}
        payments={payments}
        onSessionPage={onSessionPage}
        onPaymentPage={onPaymentPage}
      />
    </div>
  );
}

function SetupForm({ onDone }: { onDone: () => Promise<void> }) {
  const [tuition, setTuition] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createSetarProfile(tuition);
      setTuition("");
      await onDone();
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
  archived,
  onSaved,
}: {
  onDone: () => Promise<void>;
  archived: boolean;
  onSaved: () => void;
}) {
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createSetarSession({
        ...(date ? { occurredAt: new Date(`${date}T00:00:00Z`).getTime() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      setDate("");
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
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSaved}>
          انصراف
        </Button>
        <Button type="submit" disabled={busy || archived}>
          {busy ? "در حال ثبت…" : "ثبت جلسه"}
        </Button>
      </div>
    </form>
  );
}

function TuitionForm({
  profileId,
  onDone,
  onSaved,
}: {
  profileId: string;
  onDone: () => Promise<void>;
  onSaved: () => void;
}) {
  const [tuition, setTuition] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateSetarProfile(profileId, { tuitionAmountToman: tuition });
      setTuition("");
      onSaved();
      await onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
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
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSaved}>
          انصراف
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "در حال ذخیره…" : "ذخیره شهریه"}
        </Button>
      </div>
    </form>
  );
}

function PaymentForm({
  status,
  assetOptions,
  onDone,
  onSaved,
}: {
  status: SetarStatusDto;
  assetOptions: AssetOpt[];
  onDone: () => Promise<void>;
  onSaved: () => void;
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
    setBusy(true);
    try {
      await paySetarTuition({
        assetKind: "BANK",
        assetId: asset.startsWith(BANK_PREFIX) ? asset.slice(BANK_PREFIX.length) : asset,
      });
      setAsset("");
      onSaved();
      await onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="st-asset">از حساب بانکی</Label>
        <Select
          id="st-asset"
          placeholder="حساب بانکی…"
          disabled={!payable}
          required
          options={assetOptions}
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
        />
      </div>
      <p className="text-sm text-muted">
        مبلغ پرداختی: <b className="tabular-nums">{formatTomanUnit(amount)}</b>
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSaved}>
          انصراف
        </Button>
        <Button type="submit" disabled={busy || !payable}>
          {busy ? "در حال پرداخت…" : "پرداخت"}
        </Button>
      </div>
    </form>
  );
}

function SetarHistory({
  sessions,
  payments,
  onSessionPage,
  onPaymentPage,
}: {
  sessions: PaginatedResponse<SetarSessionDto> | null;
  payments: PaginatedResponse<SetarTuitionPaymentDto> | null;
  onSessionPage: (page: number) => void;
  onPaymentPage: (page: number) => void;
}) {
  const [tab, setTab] = useState<"sessions" | "payments">("sessions");
  const sessionRows = sessions?.data ?? [];
  const paymentRows = payments?.data ?? [];

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
              {
                key: "sessions",
                label: `جلسات (${decimal.format(sessions?.meta.total ?? 0)})`,
              },
              {
                key: "payments",
                label: `پرداخت شهریه (${decimal.format(payments?.meta.total ?? 0)})`,
              },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "h-8 flex-1 rounded-md px-3 text-sm font-semibold transition-colors",
                tab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {tab === "sessions" ? (
          <>
            {sessionRows.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="هنوز جلسه‌ای ثبت نشده است"
                description="با ثبت اولین جلسه، چرخه شهریه آغاز می‌شود."
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {sessionRows.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="tabular-nums">
                        جلسه {decimal.format(s.sessionNo)}
                      </Badge>
                      {s.description ? <span className="text-muted">({s.description})</span> : null}
                    </span>
                    <span className="text-muted-foreground">{formatJalaliDate(s.occurredAt)}</span>
                  </li>
                ))}
              </ul>
            )}
            {sessions !== null && sessions.meta.total > 0 ? (
              <Pagination
                className="mt-3"
                meta={sessions.meta}
                onPageChange={onSessionPage}
                label="صفحه‌بندی جلسات"
              />
            ) : null}
          </>
        ) : (
          <>
            {paymentRows.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="پرداخت شهریه‌ای ثبت نشده است"
                description="پس از تکمیل چرخه، پرداخت ثبت و اینجا نمایش داده می‌شود."
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {paymentRows.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <b className="tabular-nums">{formatTomanUnit(p.amountToman)}</b>
                      <span className="text-muted-foreground">
                        دوره {decimal.format(p.cycleNo)} · جلسات {decimal.format(p.sessionStartNo)}{" "}
                        تا {decimal.format(p.sessionEndNo)}
                      </span>
                    </span>
                    <span className="text-muted-foreground">{formatJalaliDate(p.paidAt)}</span>
                  </li>
                ))}
              </ul>
            )}
            {payments !== null && payments.meta.total > 0 ? (
              <Pagination
                className="mt-3"
                meta={payments.meta}
                onPageChange={onPaymentPage}
                label="صفحه‌بندی پرداخت‌ها"
              />
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

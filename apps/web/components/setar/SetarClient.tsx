"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-accent";
const labelClass = "mb-1 block text-sm text-muted";

interface AssetOpt {
  value: string;
  label: string;
}

function statusBadge(s: SetarStatusDto): { text: string; cls: string } {
  if (s.profile === null) {
    return { text: "", cls: "" };
  }
  if (s.profile.archived) {
    return { text: "بایگانی‌شده", cls: "bg-paper text-muted" };
  }
  if (s.tuitionPayable) {
    return { text: "قابل پرداخت", cls: "bg-danger text-white" };
  }
  if (s.paidCycleCount > 0) {
    return { text: "پرداخت شده / در انتظار چرخه بعد", cls: "bg-accent/10 text-accent-dark" };
  }
  return { text: "هنوز قابل پرداخت نیست", cls: "bg-paper text-muted" };
}

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

  if (loading) {
    return <p className="text-muted">در حال بارگذاری…</p>;
  }

  if (status === null || status.profile === null) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">سه‌تار</h1>
        {error !== null ? <ErrorLine error={error} /> : null}
        <SetupForm onDone={reload} onError={setError} />
      </div>
    );
  }

  const badge = statusBadge(status);
  // Non-null after the guard above (early-returned when status/profile is null).
  const profile = status.profile;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">سه‌تار</h1>
      {error !== null ? <ErrorLine error={error} /> : null}

      {/* Current status */}
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold">وضعیت شهریه</h2>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${badge.cls}`}>
            {badge.text}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">شهریه فعلی</dt>
            <dd className="font-bold text-ink">{formatTomanUnit(profile.tuitionAmountToman)}</dd>
          </div>
          <div>
            <dt className="text-muted">مجموع جلسات</dt>
            <dd className="font-bold text-ink">{status.totalSessions}</dd>
          </div>
          <div>
            <dt className="text-muted">چرخه جاری</dt>
            <dd className="font-bold text-ink">جلسه {status.sessionsInCurrentCycle} از ۴</dd>
          </div>
          <div>
            <dt className="text-muted">جلسات باقی‌مانده تا پرداخت</dt>
            <dd className="font-bold text-ink">{status.sessionsRemainingUntilTuition}</dd>
          </div>
          <div>
            <dt className="text-muted">چرخه‌های پرداخت‌شده</dt>
            <dd className="font-bold text-ink">{status.paidCycleCount}</dd>
          </div>
        </dl>
        <div className="h-2 overflow-hidden rounded-full bg-paper">
          <div
            className="h-full bg-accent"
            style={{ width: `${(status.sessionsInCurrentCycle / 4) * 100}%` }}
          />
        </div>
      </section>

      {/* Actions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SessionForm onDone={reload} onError={setError} archived={profile.archived} />
        <TuitionForm
          profileId={profile.id}
          current={profile.tuitionAmountToman}
          onDone={reload}
          onError={setError}
        />
        <PaymentForm
          status={status}
          assetOptions={assetOptions}
          onDone={reload}
          onError={setError}
        />
      </div>

      <div className="flex items-center gap-3 text-sm">
        <button
          type="button"
          className="text-muted"
          onClick={() => {
            updateSetarProfile(profile.id, { archived: !profile.archived })
              .then(() => reload())
              .catch((e) => setError(e instanceof ApiClientError ? e.message : "خطا"));
          }}
        >
          {profile.archived ? "بازگردانی پروفایل" : "بایگانی پروفایل"}
        </button>
      </div>

      <History sessions={sessions} payments={payments} />
    </div>
  );
}

function ErrorLine({ error }: { error: string }) {
  return (
    <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
      {error}
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
      await createSetarProfile(Number(tuition));
      setTuition("");
      await onDone();
    } catch (err) {
      onError(err instanceof ApiClientError ? err.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <p className="mb-3 text-sm text-muted">
        هنوز پروفایل سه‌تار ساخته نشده است. شهریه دوره را مشخص کنید.
      </p>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label className={labelClass}>شهریه هر دوره (تومان)</label>
          <input
            className={inputClass}
            dir="ltr"
            inputMode="numeric"
            value={tuition}
            onChange={(e) => setTuition(e.target.value.replace(/[^\d]/g, ""))}
            required
          />
        </div>
        <button
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 font-bold text-white disabled:opacity-60"
        >
          {busy ? "…" : "ایجاد پروفایل"}
        </button>
      </form>
    </div>
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
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5"
    >
      <h3 className="font-bold">ثبت جلسه</h3>
      <div>
        <label className={labelClass}>تاریخ جلسه (اختیاری)</label>
        <input
          className={inputClass}
          type="date"
          dir="ltr"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div>
        <label className={labelClass}>توضیح (اختیاری)</label>
        <input
          className={inputClass}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
        />
      </div>
      <button
        disabled={busy || archived}
        className="rounded-lg bg-accent px-4 py-2 font-bold text-white disabled:opacity-60"
      >
        {busy ? "…" : "ثبت جلسه"}
      </button>
    </form>
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
      await updateSetarProfile(profileId, { tuitionAmountToman: Number(tuition) });
      setTuition("");
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
      <h3 className="font-bold">
        تغییر شهریه{" "}
        <span className="text-sm font-normal text-muted">(فعلی: {formatTomanUnit(current)})</span>
      </h3>
      <div>
        <label className={labelClass}>شهریه جدید (تومان)</label>
        <input
          className={inputClass}
          dir="ltr"
          inputMode="numeric"
          value={tuition}
          onChange={(e) => setTuition(e.target.value.replace(/[^\d]/g, ""))}
          required
        />
      </div>
      <button
        disabled={busy}
        className="rounded-lg bg-accent px-4 py-2 font-bold text-white disabled:opacity-60"
      >
        {busy ? "…" : "ذخیره شهریه"}
      </button>
    </form>
  );
}

function PaymentForm({
  status,
  assetOptions,
  onDone,
  onError,
}: {
  status: SetarStatusDto;
  assetOptions: AssetOpt[];
  onDone: () => Promise<void>;
  onError: (e: string) => void;
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
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5"
    >
      <h3 className="font-bold">
        پرداخت شهریه{" "}
        <span className="text-sm font-normal text-muted">({formatTomanUnit(amount)})</span>
      </h3>
      <select
        className={inputClass}
        value={asset}
        onChange={(e) => setAsset(e.target.value)}
        disabled={!payable}
        required
      >
        <option value="">حساب / صندوق…</option>
        {assetOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {!status.tuitionPayable ? (
        <p className="text-sm text-muted">
          {status.totalSessions === 0
            ? "هنوز جلسه‌ای ثبت نشده است."
            : `پس از تکمیل ${status.sessionsRemainingUntilTuition} جلسه باقی‌مانده، پرداخت فعال می‌شود.`}
        </p>
      ) : (
        <p className="text-sm text-muted">مبلغ از روی شهریه تعیین‌شده توسط سرور پرداخت می‌شود.</p>
      )}
      <button
        disabled={busy || !payable}
        className="rounded-lg bg-accent px-4 py-2 font-bold text-white disabled:opacity-60"
      >
        {busy ? "…" : "پرداخت شهریه"}
      </button>
    </form>
  );
}

function History({
  sessions,
  payments,
}: {
  sessions: SetarSessionDto[];
  payments: SetarTuitionPaymentDto[];
}) {
  const [tab, setTab] = useState<"sessions" | "payments">("sessions");

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="mb-3 flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => setTab("sessions")}
          className={`rounded-lg px-3 py-1.5 font-bold ${
            tab === "sessions" ? "bg-accent text-white" : "text-muted"
          }`}
        >
          جلسات ({sessions.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("payments")}
          className={`rounded-lg px-3 py-1.5 font-bold ${
            tab === "payments" ? "bg-accent text-white" : "text-muted"
          }`}
        >
          پرداخت شهریه ({payments.length})
        </button>
      </div>

      {tab === "sessions" ? (
        sessions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
            هنوز جلسه‌ای ثبت نشده است.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="font-bold text-ink">جلسه {s.sessionNo}</span>
                  {s.description ? <span className="text-muted">({s.description})</span> : null}
                </span>
                <span className="text-muted">{formatJalaliDate(s.occurredAt)}</span>
              </li>
            ))}
          </ul>
        )
      ) : payments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
          پرداخت شهریه‌ای ثبت نشده است.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {payments.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <span className="font-bold text-ink">{formatTomanUnit(p.amountToman)}</span>
                <span className="text-muted">
                  دوره {p.cycleNo} • جلسات {p.sessionStartNo} تا {p.sessionEndNo}
                </span>
              </span>
              <span className="text-muted">{formatJalaliDate(p.paidAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

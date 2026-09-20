"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { formatJalaliDate } from "@/lib/formatting/jalali";
import { MoneyInput } from "@/components/ui/MoneyInput";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-accent";
const labelClass = "mb-1 block text-sm text-muted";

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
    return <p className="text-danger">طرف حساب یافت نشد یا در دسترس شما نیست.</p>;
  }
  if (cp === null) {
    return <p className="text-muted">در حال بارگذاری…</p>;
  }

  const directionLine =
    cp.direction === "SETTLED"
      ? "تسویه شده است"
      : cp.direction === "OWES_ME"
        ? `«${cp.name}» به شما بدهکار است`
        : `شما به «${cp.name}» بدهکار هستید`;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/counterparties" className="text-sm text-accent-dark">
        → بازگشت به طرف‌حساب‌ها
      </Link>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{cp.name}</h1>
          <p className="text-sm text-muted">
            {cp.kind === "USER" ? `کاربر ثبت‌نام‌شده: @${cp.linkedUsername}` : "طرف حساب خارجی"}
            {cp.archived ? " • بایگانی‌شده" : ""}
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-line px-3 py-1 text-sm"
          onClick={onToggleArchive}
        >
          {cp.archived ? "بازگردانی" : "بایگانی"}
        </button>
      </header>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <p className="text-lg font-bold">{directionLine}</p>
        {cp.direction !== "SETTLED" ? (
          <p
            className={`mt-1 text-2xl font-bold ${cp.direction === "OWES_ME" ? "text-accent-dark" : "text-danger"}`}
          >
            {formatTomanUnit(cp.outstandingToman)}
          </p>
        ) : null}
      </section>

      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <form
          onSubmit={onAddEvent}
          className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5"
        >
          <h3 className="font-bold">ثبت رویداد بدهی</h3>
          <select
            className={inputClass}
            value={dir}
            onChange={(e) => setDir(e.target.value as "OWES_ME" | "I_OWE")}
          >
            <option value="OWES_ME">طرف مقابل به من بدهکار است</option>
            <option value="I_OWE">من به طرف مقابل بدهکارم</option>
          </select>
          <MoneyInput
            className={inputClass}
            placeholder="مبلغ (تومان)"
            value={dAmount}
            onChange={setDAmount}
            required
          />
          <input
            className={inputClass}
            placeholder="توضیح (اختیاری)"
            value={dDesc}
            onChange={(e) => setDDesc(e.target.value)}
            maxLength={200}
          />
          <button
            disabled={busy}
            className="self-start rounded-lg bg-accent px-4 py-2 font-bold text-white disabled:opacity-60"
          >
            ثبت
          </button>
        </form>

        <form
          onSubmit={onSettle}
          className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5"
        >
          <h3 className="font-bold">تسویه بدهی</h3>
          <p className="text-xs text-muted">
            جهت تسویه بر اساس مانده فعلی به‌طور خودکار تعیین می‌شود.
          </p>
          <MoneyInput
            className={inputClass}
            placeholder="مبلغ (تومان)"
            value={sAmount}
            onChange={setSAmount}
            required
          />
          <select
            className={inputClass}
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            required
          >
            <option value="">حساب / صندوق…</option>
            {assetOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            disabled={busy}
            className="self-start rounded-lg bg-accent px-4 py-2 font-bold text-white disabled:opacity-60"
          >
            تسویه
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">تاریخچه</h2>
        {events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-4 text-muted">
            رویدادی ثبت نشده است.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-line bg-panel px-4 py-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm text-muted">{label(e)}</span>
                  <span className="text-ink">{e.description ?? "—"}</span>
                  {e.asset ? (
                    <span className="text-xs text-muted">از طریق: {e.asset.name}</span>
                  ) : null}
                  {e.sourceShareId ? (
                    <span className="text-xs text-muted">نشئت از تقسیم هزینه</span>
                  ) : null}
                </div>
                <div className="flex flex-col items-start gap-1">
                  <span className="font-bold text-ink">{formatTomanUnit(e.amountToman)}</span>
                  <span className="text-xs text-muted">{formatJalaliDate(e.occurredAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function label(e: DebtEventDto): string {
  const who = e.direction === "OWES_ME" ? "بدهکار به من" : "من بدهکار";
  return e.kind === "SETTLEMENT" ? `تسویه • ${who}` : `رویداد • ${who}`;
}

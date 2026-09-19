"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { CounterpartyDto, ConnectionDto, DebtSummaryDto } from "@batool/types";
import { ApiClientError } from "@/lib/api/client";
import {
  connectUser,
  createExternalCounterparty,
  debtSummary,
  listConnections,
  listCounterparties,
  updateCounterparty,
} from "@/lib/api/debts";
import { formatTomanUnit } from "@/lib/formatting/persian";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-accent";

export function CounterpartiesClient() {
  const [counterparties, setCps] = useState<CounterpartyDto[]>([]);
  const [connections, setConns] = useState<ConnectionDto[]>([]);
  const [summary, setSummary] = useState<DebtSummaryDto | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [cps, conns, sum] = await Promise.all([
      listCounterparties(),
      listConnections(),
      debtSummary(),
    ]);
    setCps(cps);
    setConns(conns);
    setSummary(sum);
  }, []);

  useEffect(() => {
    reload()
      .catch((e) => setError(e instanceof ApiClientError ? e.message : "خطا در بارگذاری"))
      .finally(() => setLoading(false));
  }, [reload]);

  async function onExternal(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createExternalCounterparty(name);
      setName("");
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "خطا");
    }
  }

  async function onConnect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await connectUser(username);
      setUsername("");
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "خطا");
    }
  }

  async function onToggleArchive(cp: CounterpartyDto) {
    setError(null);
    try {
      await updateCounterparty(cp.id, { archived: !cp.archived });
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "خطا");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">طرف‌حساب‌ها و بدهی‌ها</h1>

      {summary !== null ? (
        <section className="grid grid-cols-3 gap-3">
          <Stat
            title="طلب من"
            value={formatTomanUnit(summary.totalReceivableToman)}
            tone="accent"
          />
          <Stat title="بدهی من" value={formatTomanUnit(summary.totalPayableToman)} tone="danger" />
          <Stat
            title="خالص"
            value={
              formatTomanUnit(Math.abs(summary.netToman)) +
              (summary.netToman >= 0 ? " (طلب)" : " (بدهی)")
            }
            tone="ink"
          />
        </section>
      ) : null}

      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <form
          onSubmit={onExternal}
          className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5"
        >
          <h3 className="font-bold">طرف حساب جدید (خارجی)</h3>
          <input
            className={inputClass}
            placeholder="نام"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            required
          />
          <button className="self-start rounded-lg bg-accent px-4 py-2 font-bold text-white">
            افزودن
          </button>
        </form>
        <form
          onSubmit={onConnect}
          className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5"
        >
          <h3 className="font-bold">اتصال به کاربر (با نام کاربری)</h3>
          <input
            className={inputClass}
            dir="ltr"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            required
          />
          <button className="self-start rounded-lg bg-accent px-4 py-2 font-bold text-white">
            ارتباط
          </button>
          {connections.length > 0 ? (
            <p className="text-sm text-muted">
              متصل: {connections.map((c) => c.username).join("، ")}
            </p>
          ) : null}
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">فهرست طرف‌حساب‌ها</h2>
        {loading ? (
          <p className="text-muted">در حال بارگذاری…</p>
        ) : counterparties.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-4 text-muted">
            هنوز طرف حسابی ندارید.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {counterparties.map((cp) => (
              <li
                key={cp.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-panel px-4 py-3"
              >
                <div className="flex flex-col">
                  <Link
                    href={`/dashboard/counterparties/${cp.id}`}
                    className="font-bold text-accent-dark hover:underline"
                  >
                    {cp.name}
                  </Link>
                  <span className="text-xs text-muted">
                    {cp.kind === "USER" ? `کاربر: @${cp.linkedUsername}` : "خارجی"}
                    {cp.archived ? " • بایگانی‌شده" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <DirectionBadge cp={cp} />
                  <button
                    type="button"
                    className="rounded-lg border border-line px-3 py-1 text-sm"
                    onClick={() => onToggleArchive(cp)}
                  >
                    {cp.archived ? "بازگردانی" : "بایگانی"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DirectionBadge({ cp }: { cp: CounterpartyDto }) {
  if (cp.direction === "SETTLED") {
    return <span className="rounded-full bg-paper px-3 py-1 text-xs text-muted">تسویه</span>;
  }
  const label = cp.direction === "OWES_ME" ? "به من بدهکار" : "من بدهکار";
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold text-white ${cp.direction === "OWES_ME" ? "bg-accent" : "bg-danger"}`}
    >
      {label} • {formatTomanUnit(cp.outstandingToman)}
    </span>
  );
}

function Stat({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "accent" | "danger" | "ink";
}) {
  const color =
    tone === "accent" ? "text-accent-dark" : tone === "danger" ? "text-danger" : "text-ink";
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <p className="text-sm text-muted">{title}</p>
      <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

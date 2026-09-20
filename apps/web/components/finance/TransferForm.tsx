"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AssetKind } from "@batool/types";
import { ApiClientError } from "@/lib/api/client";
import { createTransfer } from "@/lib/api/finance";
import { MoneyInput } from "@/components/ui/MoneyInput";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-accent";
const labelClass = "mb-1 block text-sm text-muted";

interface Endpoint {
  id: string;
  name: string;
}
interface Props {
  accounts: Endpoint[];
  funds: Endpoint[];
}

interface Sel {
  kind: AssetKind;
  id: string;
}

function parse(value: string): Sel {
  const idx = value.indexOf("|");
  return idx === -1
    ? { kind: value as AssetKind, id: "" }
    : { kind: value.slice(0, idx) as AssetKind, id: value.slice(idx + 1) };
}

/**
 * Toman transfer between bank accounts and funds. Gold/USD are deliberately NOT
 * endpoints here: their buy/sell flows have dedicated wallet pages.
 */
export function TransferForm({ accounts, funds }: Props) {
  const router = useRouter();
  const options = [
    ...accounts.map((a) => ({ value: `BANK|${a.id}`, label: `حساب: ${a.name}` })),
    ...funds.map((f) => ({ value: `FUND|${f.id}`, label: `صندوق: ${f.name}` })),
  ];

  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [toman, setToman] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const src = source ? parse(source) : null;
  const dst = destination ? parse(destination) : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!src || !dst) {
      setError("مبدأ و مقصد را انتخاب کنید");
      return;
    }
    if (src.kind === dst.kind && src.id === dst.id) {
      setError("مبدأ و مقصد نمی‌توانند یکی باشند");
      return;
    }
    setBusy(true);
    try {
      await createTransfer({
        sourceKind: src.kind,
        ...(src.id.length > 0 ? { sourceId: src.id } : {}),
        destinationKind: dst.kind,
        ...(dst.id.length > 0 ? { destinationId: dst.id } : {}),
        ...(toman.length > 0 ? { amountToman: toman } : {}),
      });
      setToman("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "خطای ناشناخته");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5 shadow-sm"
    >
      <h3 className="font-bold">انتقال وجه (تومان)</h3>
      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="tr-src">
            مبدأ
          </label>
          <select
            id="tr-src"
            required
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className={inputClass}
          >
            <option value="">انتخاب…</option>
            {options.map((o) => (
              <option key={`s-${o.value}`} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="tr-dst">
            مقصد
          </label>
          <select
            id="tr-dst"
            required
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className={inputClass}
          >
            <option value="">انتخاب…</option>
            {options.map((o) => (
              <option key={`d-${o.value}`} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor="tr-toman">
          مبلغ (تومان)
        </label>
        <MoneyInput id="tr-toman" value={toman} onChange={setToman} className={inputClass} />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-lg bg-accent px-4 py-2 font-bold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
      >
        {busy ? "…" : "ثبت انتقال"}
      </button>
      <p className="text-xs text-muted">
        برای خرید/فروش{" "}
        <Link href="/dashboard/assets/gold" className="text-accent-dark underline">
          طلا
        </Link>{" "}
        یا{" "}
        <Link href="/dashboard/assets/usd" className="text-accent-dark underline">
          دلار
        </Link>{" "}
        از صفحات اختصاصی آن‌ها استفاده کنید.
      </p>
    </form>
  );
}

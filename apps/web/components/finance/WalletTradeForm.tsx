"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AssetKind } from "@batool/types";
import { ApiClientError } from "@/lib/api/client";
import { createTransfer } from "@/lib/api/finance";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-accent";
const labelClass = "mb-1 block text-sm text-muted";

type WalletKind = "GOLD" | "USD";

interface Endpoint {
  id: string;
  name: string;
}

interface Props {
  asset: WalletKind;
  accounts: Endpoint[];
}

type Side = "BUY" | "SELL";

interface Meta {
  title: string;
  unit: string;
}

function meta(asset: WalletKind): Meta {
  if (asset === AssetKind.GOLD) {
    return { title: "طلا", unit: "گرم" };
  }
  return { title: "دلار", unit: "دلار" };
}

/**
 * Buy/sell flow for a single non-Toman wallet (Gold or USD). The Toman amount is
 * the historical price paid/received and lives only on the transfer record; it is
 * never used to value the wallet. The wallet always trades against a bank account.
 */
export function WalletTradeForm({ asset, accounts }: Props) {
  const router = useRouter();
  const m = meta(asset);

  const [side, setSide] = useState<Side>("BUY");
  const [bank, setBank] = useState("");
  const [quantity, setQuantity] = useState("");
  const [toman, setToman] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (bank.length === 0) {
      setError("یک حساب بانکی انتخاب کنید");
      return;
    }
    if (quantity.length === 0) {
      setError(`مقدار (${m.unit}) را وارد کنید`);
      return;
    }
    if (toman.length === 0) {
      setError("مبلغ تومان را وارد کنید");
      return;
    }
    setBusy(true);
    try {
      await createTransfer({
        ...(side === "BUY"
          ? {
              sourceKind: AssetKind.BANK,
              sourceId: bank,
              destinationKind: asset,
            }
          : {
              sourceKind: asset,
              destinationKind: AssetKind.BANK,
              destinationId: bank,
            }),
        amountToman: Number(toman),
        ...(asset === AssetKind.GOLD ? { amountGram: quantity } : { amountUsd: quantity }),
      });
      setQuantity("");
      setToman("");
      setBank("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "خطای ناشناخته");
    } finally {
      setBusy(false);
    }
  }

  const quantityRe = /^\d+(\.\d{1,8})?$/;
  const quantityValid = quantityRe.test(quantity);

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-bold">{side === "BUY" ? `خرید ${m.title}` : `فروش ${m.title}`}</h3>
        <div className="flex rounded-lg border border-line p-0.5 text-sm">
          <button
            type="button"
            onClick={() => setSide("BUY")}
            className={`rounded-md px-3 py-1 ${side === "BUY" ? "bg-accent text-white" : "text-muted"}`}
          >
            خرید
          </button>
          <button
            type="button"
            onClick={() => setSide("SELL")}
            className={`rounded-md px-3 py-1 ${side === "SELL" ? "bg-accent text-white" : "text-muted"}`}
          >
            فروش
          </button>
        </div>
      </div>

      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {accounts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-3 py-2 text-sm text-muted">
          برای خرید و فروش ابتدا یک حساب بانکی بسازید.
        </p>
      ) : (
        <div>
          <label className={labelClass} htmlFor="wt-bank">
            {side === "BUY" ? "برداشت از حساب" : "واریز به حساب"}
          </label>
          <select
            id="wt-bank"
            required
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            className={inputClass}
          >
            <option value="">انتخاب…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={labelClass} htmlFor="wt-qty">
          مقدار ({m.unit})
        </label>
        <input
          id="wt-qty"
          dir="ltr"
          inputMode="decimal"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value.replace(/[^\d.]/g, ""))}
          className={`${inputClass} ${quantity.length > 0 && !quantityValid ? "border-danger" : ""}`}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="wt-toman">
          مبلغ (تومان)
        </label>
        <input
          id="wt-toman"
          dir="ltr"
          inputMode="numeric"
          value={toman}
          onChange={(e) => setToman(e.target.value.replace(/[^\d]/g, ""))}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-muted">
          این مبلغ فقط در تاریخچه ثبت می‌شود و برای ارزش‌گذاری {m.title} به کار نمی‌رود.
        </p>
      </div>

      <button
        type="submit"
        disabled={busy || accounts.length === 0}
        className="self-start rounded-lg bg-accent px-4 py-2 font-bold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
      >
        {busy ? "…" : side === "BUY" ? `ثبت خرید ${m.title}` : `ثبت فروش ${m.title}`}
      </button>
    </form>
  );
}

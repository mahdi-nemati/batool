"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AssetKind } from "@batool/types";
import { ApiClientError } from "@/lib/api/client";
import { createTransfer } from "@/lib/api/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { cn } from "@/lib/cn";

const moneyInputClass =
  "h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground placeholder:text-muted-foreground/70";

type WalletKind = "GOLD" | "USD";

interface Endpoint {
  id: string;
  name: string;
}

interface Props {
  asset: WalletKind;
  accounts: Endpoint[];
  /** Called after a successful trade; the parent closes the modal. */
  onSaved: () => void;
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
export function WalletTradeForm({ asset, accounts, onSaved }: Props) {
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
        amountToman: toman,
        ...(asset === AssetKind.GOLD ? { amountGram: quantity } : { amountUsd: quantity }),
      });
      setQuantity("");
      setToman("");
      setBank("");
      router.refresh();
      onSaved();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "خطای ناشناخته");
    } finally {
      setBusy(false);
    }
  }

  const quantityRe = /^\d+(\.\d{1,8})?$/;
  const quantityValid = quantityRe.test(quantity);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div
        className="flex rounded-lg border border-input bg-background/60 p-0.5"
        role="group"
        aria-label="نوع معامله"
      >
        {(["BUY", "SELL"] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={side === s}
            onClick={() => setSide(s)}
            className={cn(
              "h-9 flex-1 rounded-md px-3 text-sm font-semibold transition-colors motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              side === s
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s === "BUY" ? "خرید" : "فروش"}
          </button>
        ))}
      </div>

      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {accounts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-input px-3 py-2 text-sm text-muted">
          برای خرید و فروش ابتدا یک حساب بانکی بسازید.
        </p>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="wt-bank">{side === "BUY" ? "برداشت از حساب" : "واریز به حساب"}</Label>
          <Select
            id="wt-bank"
            required
            placeholder="انتخاب…"
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            value={bank}
            onChange={(e) => setBank(e.target.value)}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="wt-qty">مقدار ({m.unit})</Label>
        <Input
          id="wt-qty"
          dir="ltr"
          inputMode="decimal"
          placeholder="مثلاً ۱٫۵"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value.replace(/[^\d.]/g, ""))}
          {...(quantity.length > 0 && !quantityValid
            ? { error: `مقدار ${m.unit} معتبر نیست` }
            : {})}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wt-toman">مبلغ (تومان)</Label>
        <MoneyInput
          id="wt-toman"
          className={moneyInputClass}
          placeholder="مثلاً ۴۵۰٬۰۰۰"
          value={toman}
          onChange={setToman}
        />
        <p className="text-xs text-muted-foreground">
          این مبلغ فقط در تاریخچه ثبت می‌شود و برای ارزش‌گذاری {m.title} به کار نمی‌رود.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSaved}>
          انصراف
        </Button>
        <Button
          type="submit"
          variant={side === "BUY" ? "default" : "destructive"}
          disabled={busy || accounts.length === 0}
        >
          {busy ? "در حال ثبت…" : side === "BUY" ? `ثبت خرید ${m.title}` : `ثبت فروش ${m.title}`}
        </Button>
      </div>
    </form>
  );
}

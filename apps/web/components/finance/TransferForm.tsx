"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AssetKind } from "@batool/types";
import { createTransfer } from "@/lib/api/finance";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Select, type SelectOption } from "@/components/ui/select";

const moneyInputClass =
  "h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground placeholder:text-muted-foreground/70";

interface Endpoint {
  id: string;
  name: string;
}
interface Props {
  accounts: Endpoint[];
  funds: Endpoint[];
  onDone?: () => void;
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

const endpointOptions = (accounts: Endpoint[], funds: Endpoint[]): SelectOption[] => [
  ...accounts.map((a) => ({ value: `BANK|${a.id}`, label: `حساب: ${a.name}` })),
  ...funds.map((f) => ({ value: `FUND|${f.id}`, label: `صندوق: ${f.name}` })),
];

/**
 * Toman transfer between bank accounts and funds. Gold/USD are deliberately NOT
 * endpoints here: their buy/sell flows have dedicated wallet pages.
 * Body-only, so it can live inside a dialog.
 */
export function TransferForm({ accounts, funds, onDone }: Props) {
  const router = useRouter();
  const options = endpointOptions(accounts, funds);

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
      onDone?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="tr-src">از</Label>
        <Select
          id="tr-src"
          aria-label="مبدأ"
          required
          placeholder="مبدأ را انتخاب کنید"
          options={options}
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tr-dst">به</Label>
        <Select
          id="tr-dst"
          aria-label="مقصد"
          required
          placeholder="مقصد را انتخاب کنید"
          options={options}
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tr-toman">مبلغ (تومان)</Label>
        <MoneyInput id="tr-toman" value={toman} onChange={setToman} className={moneyInputClass} />
      </div>
      <Button type="submit" disabled={busy} className="self-start">
        {busy ? "در حال ثبت…" : "ثبت انتقال"}
      </Button>
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

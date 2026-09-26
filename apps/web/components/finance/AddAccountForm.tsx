"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBankAccount } from "@/lib/api/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/MoneyInput";

const moneyInputClass =
  "h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground placeholder:text-muted-foreground/70";

/** بدنهٔ فرم حساب بانکی؛ بدون کارت تا در مودال جا شود. */
export function AddAccountForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [initial, setInitial] = useState("0");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createBankAccount({ name, initialBalanceToman: initial || "0" });
      setName("");
      setInitial("0");
      router.refresh();
      onDone?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="acc-name">نام حساب</Label>
        <Input
          id="acc-name"
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثلاً حساب روزمره"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="acc-initial">موجودی اولیه (تومان)</Label>
        <MoneyInput
          id="acc-initial"
          value={initial}
          onChange={setInitial}
          className={moneyInputClass}
        />
      </div>
      <Button type="submit" disabled={busy} className="self-start">
        {busy ? "در حال ثبت…" : "افزودن حساب"}
      </Button>
    </form>
  );
}

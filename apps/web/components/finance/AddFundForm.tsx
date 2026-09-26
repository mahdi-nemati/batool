"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createFund } from "@/lib/api/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/MoneyInput";

const moneyInputClass =
  "h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground placeholder:text-muted-foreground/70";

/** بدنهٔ فرم صندوق؛ بدون کارت تا در مودال جا شود. */
export function AddFundForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createFund({ name, ...(goal.length > 0 ? { goalToman: goal } : {}) });
      setName("");
      setGoal("");
      router.refresh();
      onDone?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="fund-name">نام صندوق</Label>
        <Input
          id="fund-name"
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثلاً سفر"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fund-goal">هدف (اختیاری، تومان)</Label>
        <MoneyInput id="fund-goal" value={goal} onChange={setGoal} className={moneyInputClass} />
      </div>
      <Button type="submit" disabled={busy} className="self-start">
        {busy ? "در حال ثبت…" : "افزودن صندوق"}
      </Button>
    </form>
  );
}

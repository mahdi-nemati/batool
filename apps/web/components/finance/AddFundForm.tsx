"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PiggyBank } from "lucide-react";
import { ApiClientError } from "@/lib/api/client";
import { createFund } from "@/lib/api/finance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/MoneyInput";

const moneyInputClass =
  "h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground placeholder:text-muted-foreground/70";

export function AddFundForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await createFund({ name, ...(goal.length > 0 ? { goalToman: goal } : {}) });
      setName("");
      setGoal("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "خطای ناشناخته");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PiggyBank className="size-4 text-primary" aria-hidden />
          صندوق جدید
        </CardTitle>
        <CardDescription>یک صندوق با هدف پس‌انداز بسازید.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          {error !== null ? (
            <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
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
            <MoneyInput
              id="fund-goal"
              value={goal}
              onChange={setGoal}
              className={moneyInputClass}
            />
          </div>
          <Button type="submit" disabled={busy} className="self-start">
            {busy ? "…" : "افزودن صندوق"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
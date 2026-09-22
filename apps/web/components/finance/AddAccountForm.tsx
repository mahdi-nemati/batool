"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Landmark } from "lucide-react";
import { ApiClientError } from "@/lib/api/client";
import { createBankAccount } from "@/lib/api/finance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/MoneyInput";

const moneyInputClass =
  "h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground placeholder:text-muted-foreground/70";

export function AddAccountForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [initial, setInitial] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await createBankAccount({ name, initialBalanceToman: initial || "0" });
      setName("");
      setInitial("0");
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
          <Landmark className="size-4 text-primary" aria-hidden />
          حساب بانکی جدید
        </CardTitle>
        <CardDescription>یک حساب با موجودی اولیه بسازید.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          {error !== null ? (
            <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
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
            {busy ? "…" : "افزودن حساب"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
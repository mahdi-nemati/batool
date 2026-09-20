"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiClientError } from "@/lib/api/client";
import { createFund } from "@/lib/api/finance";
import { MoneyInput } from "@/components/ui/MoneyInput";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-accent";
const labelClass = "mb-1 block text-sm text-muted";

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
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5 shadow-sm"
    >
      <h3 className="font-bold">صندوق جدید</h3>
      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div>
        <label className={labelClass} htmlFor="fund-name">
          نام صندوق
        </label>
        <input
          id="fund-name"
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="fund-goal">
          هدف (اختیاری، تومان)
        </label>
        <MoneyInput id="fund-goal" value={goal} onChange={setGoal} className={inputClass} />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-lg bg-accent px-4 py-2 font-bold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
      >
        {busy ? "…" : "افزودن صندوق"}
      </button>
    </form>
  );
}

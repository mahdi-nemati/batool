"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiClientError } from "@/lib/api/client";
import { createBankAccount } from "@/lib/api/finance";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-accent";
const labelClass = "mb-1 block text-sm text-muted";

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
      await createBankAccount({ name, initialBalanceToman: Number(initial) || 0 });
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
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5 shadow-sm"
    >
      <h3 className="font-bold">حساب بانکی جدید</h3>
      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div>
        <label className={labelClass} htmlFor="acc-name">
          نام حساب
        </label>
        <input
          id="acc-name"
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="acc-initial">
          مبلغ اولیه (تومان)
        </label>
        <input
          id="acc-initial"
          dir="ltr"
          inputMode="numeric"
          value={initial}
          onChange={(e) => setInitial(e.target.value.replace(/[^\d]/g, ""))}
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-lg bg-accent px-4 py-2 font-bold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
      >
        {busy ? "…" : "افزودن حساب"}
      </button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiClientError } from "@/lib/api/client";
import { login } from "@/lib/api/auth";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-accent";
const labelClass = "mb-1 block text-sm text-muted";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login({ email, password });
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "خطای ناشناخته");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">ورود</h1>
        <p className="mt-1 text-sm text-muted">برای ادامه وارد حساب خود شوید.</p>
      </div>

      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div>
        <label className={labelClass} htmlFor="email">
          ایمیل
        </label>
        <input
          id="email"
          type="email"
          dir="ltr"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="password">
          رمز عبور
        </label>
        <input
          id="password"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-accent px-4 py-2 font-bold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
      >
        {busy ? "در حال ورود…" : "ورود"}
      </button>

      <p className="text-center text-sm text-muted">
        حساب ندارید؟{" "}
        <Link href="/register" className="font-bold text-accent-dark">
          ثبت‌نام
        </Link>
      </p>
    </form>
  );
}

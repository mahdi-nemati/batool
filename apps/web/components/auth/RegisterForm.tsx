"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiClientError } from "@/lib/api/client";
import { register } from "@/lib/api/auth";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-accent";
const labelClass = "mb-1 block text-sm text-muted";

export function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register({ username, nickname, email, password });
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
        <h1 className="text-xl font-bold">ثبت‌نام</h1>
        <p className="mt-1 text-sm text-muted">یک حساب جدید بسازید.</p>
      </div>

      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div>
        <label className={labelClass} htmlFor="username">
          نام کاربری
        </label>
        <input
          id="username"
          dir="ltr"
          required
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_.]+"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-muted">
          حروف کوچک، رقم، نقطه یا زیرخط (۳ تا ۲۰ نویسه). بعداً قابل تغییر نیست.
        </p>
      </div>

      <div>
        <label className={labelClass} htmlFor="nickname">
          نام مستعار
        </label>
        <input
          id="nickname"
          required
          maxLength={40}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="email">
          ایمیل
        </label>
        <input
          id="email"
          type="email"
          dir="ltr"
          required
          autoComplete="email"
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
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-muted">حداقل ۸ نویسه شامل حرف و رقم.</p>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-accent px-4 py-2 font-bold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
      >
        {busy ? "در حال ثبت‌نام…" : "ایجاد حساب"}
      </button>

      <p className="text-center text-sm text-muted">
        حساب دارید؟{" "}
        <Link href="/login" className="font-bold text-accent-dark">
          ورود
        </Link>
      </p>
    </form>
  );
}

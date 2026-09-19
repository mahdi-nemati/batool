"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiClientError } from "@/lib/api/client";
import { changePassword } from "@/lib/api/auth";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-accent";
const labelClass = "mb-1 block text-sm text-muted";

export function PasswordForm() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError("رمز عبور جدید و تکرار آن یکسان نیستند");
      return;
    }
    setBusy(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      // Password changed: all sessions revoked and the cookie cleared. Log in again.
      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "خطای ناشناخته");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-6 shadow-sm"
    >
      <div>
        <h2 className="text-lg font-bold">تغییر رمز عبور</h2>
        <p className="mt-1 text-sm text-muted">پس از تغییر رمز، از همه دستگاه‌ها خارج می‌شوید.</p>
      </div>

      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div>
        <label className={labelClass} htmlFor="current">
          رمز عبور فعلی
        </label>
        <input
          id="current"
          type="password"
          dir="ltr"
          required
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="next">
          رمز عبور جدید
        </label>
        <input
          id="next"
          type="password"
          dir="ltr"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="confirm">
          تکرار رمز عبور جدید
        </label>
        <input
          id="confirm"
          type="password"
          dir="ltr"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-lg bg-accent px-4 py-2 font-bold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
      >
        {busy ? "در حال ثبت…" : "تغییر رمز عبور"}
      </button>
    </form>
  );
}

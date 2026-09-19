"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiClientError } from "@/lib/api/client";
import { updateProfile } from "@/lib/api/auth";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-accent";
const disabledClass =
  "w-full rounded-lg border border-line bg-paper px-3 py-2 text-muted outline-none";
const labelClass = "mb-1 block text-sm text-muted";

interface Initial {
  nickname: string;
  email: string;
  username: string;
}

export function ProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [nickname, setNickname] = useState(initial.nickname);
  const [email, setEmail] = useState(initial.email);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      await updateProfile({ nickname, email });
      setSaved(true);
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
      className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-6 shadow-sm"
    >
      <h2 className="text-lg font-bold">اطلاعات کاربر</h2>

      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {saved ? <p className="text-sm text-accent-dark">تغییرات ذخیره شد.</p> : null}

      <div>
        <label className={labelClass} htmlFor="username">
          نام کاربری
        </label>
        <input
          id="username"
          dir="ltr"
          value={initial.username}
          disabled
          readOnly
          className={disabledClass}
        />
        <p className="mt-1 text-xs text-muted">نام کاربری پایدار است و قابل تغییر نیست.</p>
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-lg bg-accent px-4 py-2 font-bold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
      >
        {busy ? "در حال ذخیره…" : "ذخیره تغییرات"}
      </button>
    </form>
  );
}

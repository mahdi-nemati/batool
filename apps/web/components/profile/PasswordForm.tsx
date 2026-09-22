"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { ApiClientError } from "@/lib/api/client";
import { changePassword } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export function PasswordForm({ className }: { className?: string }) {
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
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-primary" aria-hidden />
          تغییر رمز عبور
        </CardTitle>
        <CardDescription>پس از تغییر رمز، از همه دستگاه‌ها خارج می‌شوید.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error !== null ? (
            <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="current">رمز عبور فعلی</Label>
            <PasswordInput
              id="current"
              required
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="next">رمز عبور جدید</Label>
            <PasswordInput
              id="next"
              strength
              required
              minLength={8}
              maxLength={128}
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">تکرار رمز عبور جدید</Label>
            <PasswordInput
              id="confirm"
              required
              minLength={8}
              maxLength={128}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={busy} className="self-start">
            {busy ? "در حال ثبت…" : "تغییر رمز عبور"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiClientError } from "@/lib/api/client";
import { register } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle as="h1">ثبت‌نام</CardTitle>
        <CardDescription>یک حساب جدید بسازید.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error !== null ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username">نام کاربری</Label>
            <Input
              id="username"
              dir="ltr"
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_.]+"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <p className="text-xs text-muted">
              حروف کوچک، رقم، نقطه یا زیرخط (۳ تا ۲۰ نویسه). بعداً قابل تغییر نیست.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nickname">نام مستعار</Label>
            <Input
              id="nickname"
              required
              maxLength={40}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">ایمیل</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">رمز عبور</Label>
            <Input
              id="password"
              type="password"
              dir="ltr"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted">حداقل ۸ نویسه شامل حرف و رقم.</p>
          </div>

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "در حال ثبت‌نام…" : "ایجاد حساب"}
          </Button>

          <p className="text-center text-sm text-muted">
            حساب دارید؟{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              ورود
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
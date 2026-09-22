"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiClientError } from "@/lib/api/client";
import { updateProfile } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Initial {
  nickname: string;
  email: string;
  username: string;
}

export function ProfileForm({ initial, className }: { initial: Initial; className?: string }) {
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
    <Card className={className}>
      <CardHeader>
        <CardTitle>اطلاعات کاربر</CardTitle>
        <CardDescription>نام مستعار و ایمیل برای ورود و ارتباط با شما</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error !== null ? (
            <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p className="text-sm text-accent-dark">تغییرات ذخیره شد.</p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="username">نام کاربری</Label>
            <div className="flex gap-2">
              <Input id="username" dir="ltr" value={initial.username} disabled className="flex-1" />
              <Badge variant="secondary" className="shrink-0">ثابت</Badge>
            </div>
            <p className="text-xs text-muted-foreground">نام کاربری پایدار است و قابل تغییر نیست.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nickname">نام مستعار</Label>
            <Input
              id="nickname"
              required
              maxLength={40}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">ایمیل</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={busy} className="self-start">
            {busy ? "در حال ذخیره…" : "ذخیره تغییرات"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
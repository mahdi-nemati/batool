import Link from "next/link";
import { cookies } from "next/headers";
import type { HealthDto, ReadinessDto } from "@batool/types";
import { API_ORIGIN, request } from "@/lib/api/client";
import { getMeServer } from "@/lib/api/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Check = { ok: true } | { ok: false };

async function check<T>(path: string): Promise<Check> {
  try {
    await request<T>(path, { cache: "no-store" });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const [liveness, readiness, user] = await Promise.all([
    check<HealthDto>("/health"),
    check<ReadinessDto>("/health/ready"),
    getMeServer(
      cookieStore
        .getAll()
        .map((c) => `${c.name}=${c.value}`)
        .join("; "),
    ),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 p-6">
      <header className="text-center">
        <h1 className="text-5xl font-bold text-accent-dark">بتول</h1>
        <p className="mt-2 text-lg text-muted">مدیریت دارایی و امور مالی شخصی</p>
      </header>

      <section className="flex flex-col items-center gap-3">
        {user !== null ? (
          <Link
            href="/dashboard"
            className="flex w-full max-w-xs items-center justify-center rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
          >
            ادامه به داشبورد
          </Link>
        ) : (
          <div className="flex w-full max-w-xs gap-3">
            <Link
              href="/login"
              className="flex flex-1 items-center justify-center rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              ورود
            </Link>
            <Link
              href="/register"
              className="flex flex-1 items-center justify-center rounded-xl border border-input bg-background/60 px-4 py-3 text-center text-sm font-semibold text-foreground transition-colors hover:bg-accent-soft hover:text-foreground"
            >
              ثبت‌نام
            </Link>
          </div>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>وضعیت سامانه (فاز ۱)</CardTitle>
          <CardDescription>
            اتصال پیش‌بینی‌شده: <code className="text-accent-dark">{API_ORIGIN}</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col divide-y divide-border text-sm">
            <div className="flex items-center justify-between py-2">
              <span className="text-muted">سرویس API</span>
              <Pill ok={liveness.ok} />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted">اتصال پایگاه داده</span>
              <Pill ok={readiness.ok} />
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function Pill({ ok }: { ok: boolean }) {
  return (
    <Badge variant={ok ? "success" : "destructive"}>{ok ? "سالم" : "در دسترس نیست"}</Badge>
  );
}

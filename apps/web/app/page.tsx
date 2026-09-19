import Link from "next/link";
import { cookies } from "next/headers";
import type { HealthDto, ReadinessDto } from "@batool/types";
import { API_ORIGIN, request } from "@/lib/api/client";
import { getMeServer } from "@/lib/api/auth";

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
            className="w-full max-w-xs rounded-lg bg-accent px-4 py-3 text-center font-bold text-white transition-colors hover:bg-accent-dark"
          >
            ادامه به داشبورد
          </Link>
        ) : (
          <div className="flex w-full max-w-xs gap-3">
            <Link
              href="/login"
              className="flex-1 rounded-lg bg-accent px-4 py-3 text-center font-bold text-white transition-colors hover:bg-accent-dark"
            >
              ورود
            </Link>
            <Link
              href="/register"
              className="flex-1 rounded-lg border border-accent px-4 py-3 text-center font-bold text-accent-dark transition-colors hover:bg-accent/10"
            >
              ثبت‌نام
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-panel p-6 text-sm shadow-sm">
        <h2 className="mb-3 font-bold">وضعیت سامانه (فاز ۱)</h2>
        <p className="mb-3 text-muted">
          اتصال پیش‌بینی‌شده: <code className="text-accent-dark">{API_ORIGIN}</code>
        </p>
        <div className="flex items-center justify-between border-b border-line py-2">
          <span className="text-muted">سرویس API</span>
          <Pill ok={liveness.ok} />
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-muted">اتصال پایگاه داده</span>
          <Pill ok={readiness.ok} />
        </div>
      </section>
    </main>
  );
}

function Pill({ ok }: { ok: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold text-white ${ok ? "bg-accent" : "bg-danger"}`}
    >
      {ok ? "سالم" : "در دسترس نیست"}
    </span>
  );
}

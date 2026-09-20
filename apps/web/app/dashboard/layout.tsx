import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMeServer } from "@/lib/api/auth";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const store = await cookies();
  const user = await getMeServer(
    store
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; "),
  );
  if (user === null) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/dashboard" className="text-xl font-bold text-accent-dark">
            بتول
          </Link>
          <nav className="flex max-w-full items-center gap-4 overflow-x-auto text-sm whitespace-nowrap">
            <Link href="/dashboard" className="text-muted hover:text-ink">
              داشبورد
            </Link>
            <Link href="/dashboard/assets" className="text-muted hover:text-ink">
              دارایی‌ها
            </Link>
            <Link href="/dashboard/transactions" className="text-muted hover:text-ink">
              تراکنش‌ها
            </Link>
            <Link href="/dashboard/counterparties" className="text-muted hover:text-ink">
              طرف‌حساب‌ها
            </Link>
            <Link href="/dashboard/installments" className="text-muted hover:text-ink">
              اقساط
            </Link>
            <Link href="/dashboard/setar" className="text-muted hover:text-ink">
              سه‌تار
            </Link>
            {user.role === "ADMIN" ? (
              <Link href="/dashboard/categories" className="text-muted hover:text-ink">
                دسته‌بندی‌ها
              </Link>
            ) : null}
            <Link href="/dashboard/profile" className="text-muted hover:text-ink">
              پروفایل
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-ink">{user.nickname}</span>
          <span className="rounded-full bg-paper px-2 py-0.5 text-xs text-muted">
            {user.role === "ADMIN" ? "مدیر" : "کاربر"}
          </span>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-5">{children}</main>
    </div>
  );
}

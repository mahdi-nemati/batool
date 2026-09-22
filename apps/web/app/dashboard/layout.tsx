import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMeServer } from "@/lib/api/auth";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Badge } from "@/components/ui/badge";
import { DashboardNav, type NavItem } from "@/components/dashboard/DashboardNav";
import { ToastProvider } from "@/components/ui/toast";

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

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "داشبورد" },
    { href: "/dashboard/assets", label: "دارایی‌ها" },
    { href: "/dashboard/transactions", label: "تراکنش‌ها" },
    { href: "/dashboard/counterparties", label: "طرف‌حساب‌ها" },
    { href: "/dashboard/installments", label: "اقساط" },
    { href: "/dashboard/setar", label: "سه‌تار" },
    ...(user.role === "ADMIN"
      ? [{ href: "/dashboard/categories", label: "دسته‌بندی‌ها" }]
      : []),
    { href: "/dashboard/profile", label: "پروفایل" },
  ];

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/dashboard" className="text-xl font-bold text-accent-dark">
            بتول
          </Link>
          <DashboardNav items={navItems} />
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-ink">{user.nickname}</span>
          <Badge variant="secondary">
            {user.role === "ADMIN" ? "مدیر" : "کاربر"}
          </Badge>
          <LogoutButton />
        </div>
      </header>
      <ToastProvider>
        <main className="mx-auto max-w-6xl p-5">{children}</main>
      </ToastProvider>
    </div>
  );
}

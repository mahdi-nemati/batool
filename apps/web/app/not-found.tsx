"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { NotFoundPage } from "@/components/error-pages";

const routes = [
  { href: "/dashboard", terms: ["داشبورد", "خانه"] },
  { href: "/dashboard/assets", terms: ["دارایی", "دارایی‌ها"] },
  { href: "/dashboard/counterparties", terms: ["طرف حساب", "طرف‌حساب", "اشخاص"] },
  { href: "/dashboard/installments", terms: ["قسط", "اقساط"] },
  { href: "/dashboard/transactions", terms: ["تراکنش", "تراکنش‌ها"] },
  { href: "/dashboard/statistics", terms: ["آمار", "تحلیل"] },
];

export default function NotFound() {
  const router = useRouter();

  function search(query: string) {
    const normalized = query.replace(/\s+/g, " ").trim();
    const match = routes.find(({ terms }) => terms.some((term) => normalized.includes(term)));
    router.push(match?.href ?? "/dashboard");
  }

  return (
    <NotFoundPage
      onSearch={search}
      backAction={
        <Link
          href="/dashboard"
          className="rounded-lg px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
          بازگشت به داشبورد
        </Link>
      }
    />
  );
}

import Link from "next/link";

export default function DashboardPage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">داشبورد</h1>
      <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm">
        <p className="text-muted">
          احراز هویت با موفقیت انجام شد. ماژول‌های مالی (حساب‌ها، تراکنش‌ها، بدهی‌ها، اقساط و ستار)
          در فازهای آینده افزوده می‌شوند.
        </p>
        <Link
          href="/dashboard/profile"
          className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 font-bold text-white transition-colors hover:bg-accent-dark"
        >
          مدیریت پروفایل
        </Link>
      </div>
    </section>
  );
}

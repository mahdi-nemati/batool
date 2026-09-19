import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "ورود | بتول" };

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <Link href="/" className="text-3xl font-bold text-accent-dark">
        بتول
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-line bg-panel p-6 shadow-sm">
        {children}
      </div>
    </main>
  );
}

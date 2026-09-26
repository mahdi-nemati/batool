"use client";

import Link from "next/link";
import { ServerErrorPage } from "@/components/error-pages";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ServerErrorPage
      onRetry={reset}
      {...(error.digest ? { trackingCode: error.digest } : {})}
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

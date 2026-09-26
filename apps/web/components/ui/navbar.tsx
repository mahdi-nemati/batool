import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export interface NavbarProps {
  actions?: React.ReactNode;
  className?: string;
}

/** هدر ساده. Navigation stays in the sidebar; the header only carries identity and actions. */
export function Navbar({ actions, className }: NavbarProps) {
  return (
    <header
      dir="rtl"
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/dashboard"
          className={cn("shrink-0 text-title font-bold text-primary", focusRing)}
        >
          بتول
        </Link>
        <div className="ms-auto flex shrink-0 items-center gap-2 text-sm">{actions}</div>
      </div>
    </header>
  );
}

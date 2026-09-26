"use client";

import { usePathname } from "next/navigation";
import type { Role } from "@batool/types";
import { Sidebar } from "@/components/ui/sidebar";
import { buildNavGroups } from "@/components/dashboard/nav-items";

/** نوار کناری داشبورد. The persistent rail; the mobile drawer reuses the same config. */
export function DashboardSidebar({ role, className }: { role: Role; className?: string }) {
  const pathname = usePathname();

  return (
    <Sidebar
      groups={buildNavGroups(role)}
      activeHref={pathname}
      {...(className !== undefined ? { className } : {})}
    />
  );
}

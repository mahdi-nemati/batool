import {
  ArrowLeftRight,
  BarChart3,
  CalendarClock,
  Coins,
  Gem,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Settings,
  Tags,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import type { Role } from "@batool/types";
import type { SidebarGroup } from "@/components/ui/sidebar";

/** ساختار ناوبری داشبورد. The rail mirrors the routes: overview, assets, money, settings. */
export function buildNavGroups(role: Role): SidebarGroup[] {
  return [
    {
      id: "overview",
      items: [
        { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard },
        { href: "/dashboard/statistics", label: "آمار و تحلیل", icon: BarChart3 },
      ],
    },
    {
      id: "assets",
      label: "دارایی‌ها",
      icon: Wallet,
      defaultOpen: true,
      items: [
        { href: "/dashboard/assets", label: "همه دارایی‌ها", icon: ListChecks },
        { href: "/dashboard/assets/gold", label: "طلا", icon: Gem },
        { href: "/dashboard/assets/usd", label: "دلار", icon: Coins },
      ],
    },
    {
      id: "money",
      label: "مدیریت مالی",
      icon: ListChecks,
      defaultOpen: true,
      items: [
        { href: "/dashboard/transactions", label: "تراکنش‌ها", icon: ArrowLeftRight },
        { href: "/dashboard/counterparties", label: "طرف‌حساب‌ها", icon: Users },
        { href: "/dashboard/installments", label: "اقساط", icon: CalendarClock },
        { href: "/dashboard/setar", label: "سه‌تار", icon: GraduationCap },
      ],
    },
    {
      id: "settings",
      label: "تنظیمات",
      icon: Settings,
      defaultOpen: true,
      items: [
        { href: "/dashboard/profile", label: "پروفایل", icon: UserRound },
        ...(role === "ADMIN"
          ? [{ href: "/dashboard/categories", label: "دسته‌بندی‌ها", icon: Tags }]
          : []),
      ],
    },
  ];
}

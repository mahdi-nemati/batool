"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const faDigits = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });

type SidebarIcon = React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

export interface SidebarItem {
  href: string;
  label: string;
  icon?: SidebarIcon;
  /** شمارنده. A number renders in Persian digits; pass `formatTomanUnit(n)` for money. */
  badge?: number | string;
  /** `exact` matches only the item's own path; `false` never marks it as the current page. */
  match?: "exact" | "prefix" | false;
}

export interface SidebarGroup {
  id: string;
  /** بدون برچسب، گروه یک فهرست ساده و بدون بازشو می‌شود. */
  label?: string;
  icon?: SidebarIcon;
  items: SidebarItem[];
  defaultOpen?: boolean;
}

export interface SidebarProps {
  groups: SidebarGroup[];
  activeHref?: string | null;
  label?: string;
  className?: string;
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const motion = "transition-colors duration-200 motion-reduce:transition-none";

function matches(item: SidebarItem, activeHref: string): boolean {
  if (item.match === false) return false;
  if (item.match === "exact") return activeHref === item.href;
  return activeHref === item.href || activeHref.startsWith(`${item.href}/`);
}

/** عمیق‌ترین مسیر منطبق، صفحه‌ی جاری است تا «دارایی‌ها» و «طلا» با هم روشن نشوند. */
function currentItem(
  groups: SidebarGroup[],
  activeHref: string | null | undefined,
): SidebarItem | null {
  if (!activeHref) return null;
  let best: SidebarItem | null = null;
  for (const group of groups) {
    for (const item of group.items) {
      if (!matches(item, activeHref)) continue;
      if (best === null || item.href.length > best.href.length) best = item;
    }
  }
  return best;
}

function SidebarLink({ item, active }: { item: SidebarItem; active: boolean }) {
  const Icon = item.icon;
  const badge =
    item.badge === undefined || item.badge === "" || item.badge === 0
      ? null
      : typeof item.badge === "number"
        ? faDigits.format(item.badge)
        : item.badge;

  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-body font-medium",
          motion,
          focusRing,
          active
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        )}
      >
        {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {badge !== null ? (
          <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-caption tabular-nums text-secondary-foreground">
            {badge}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

function SidebarSection({
  group,
  current,
  open,
  onToggle,
}: {
  group: SidebarGroup;
  current: SidebarItem | null;
  open: boolean;
  onToggle: () => void;
}) {
  const GroupIcon = group.icon;
  const collapsible = group.label !== undefined;
  const panelId = `sidebar-group-${group.id}`;

  const list = (
    <ul
      id={collapsible ? panelId : undefined}
      className={cn("flex flex-col gap-0.5", collapsible && "min-h-0 overflow-hidden")}
    >
      {group.items.map((item) => (
        <SidebarLink key={item.href} item={item} active={item === current} />
      ))}
    </ul>
  );

  if (!collapsible) {
    return <div className="flex flex-col">{list}</div>;
  }

  return (
    <section aria-labelledby={`${panelId}-trigger`} className="flex flex-col">
      <h3>
        <button
          id={`${panelId}-trigger`}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-label font-semibold text-muted-foreground",
            "hover:text-foreground",
            motion,
            focusRing,
          )}
        >
          {GroupIcon ? <GroupIcon className="size-4 shrink-0" aria-hidden /> : null}
          <span className="min-w-0 flex-1 truncate text-start">{group.label}</span>
          {/* در چیدمان راست‌به‌چپ، چرخش ۹۰ درجه‌ی فلش پایین رو به چپ می‌افتد؛ یعنی همان جهت باز شدن. */}
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
              !open && "rotate-90",
            )}
          />
        </button>
      </h3>
      {/* grid-rows 0fr→1fr lets the section animate; `inert` keeps collapsed links out of the tab order. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
        inert={open ? undefined : true}
      >
        {list}
      </div>
    </section>
  );
}

/** نوار کناری. A vertical RTL rail; the deepest matching item is the current page. */
export function Sidebar({ groups, activeHref, label = "ناوبری اصلی", className }: SidebarProps) {
  const current = currentItem(groups, activeHref);
  const [toggled, setToggled] = React.useState<Record<string, boolean>>({});

  return (
    <aside
      dir="rtl"
      className={cn("flex w-64 shrink-0 flex-col border-e border-border bg-panel", className)}
    >
      <nav aria-label={label} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
        {groups.map((group) => {
          const isCurrent = group.items.some((item) => item === current);
          return (
            <SidebarSection
              key={group.id}
              group={group}
              current={current}
              open={toggled[group.id] ?? group.defaultOpen ?? isCurrent}
              onToggle={() =>
                setToggled((state) => ({
                  ...state,
                  [group.id]: !(state[group.id] ?? group.defaultOpen ?? isCurrent),
                }))
              }
            />
          );
        })}
      </nav>
    </aside>
  );
}

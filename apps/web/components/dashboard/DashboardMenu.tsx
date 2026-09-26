"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { Role } from "@batool/types";
import { Sidebar } from "@/components/ui/sidebar";
import { buildNavGroups } from "@/components/dashboard/nav-items";

const iconButton =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-accent-soft hover:text-foreground active:scale-[0.98] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** منوی موبایل. Small screens get the same rail as a modal drawer, anchored to the start (right). */
export function DashboardMenu({ role }: { role: Role }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]):not([tabindex="-1"])',
        ) ?? [],
      );
      const first = nodes.at(0);
      const last = nodes.at(-1);
      if (!first || !last) return;
      const inside = panelRef.current?.contains(document.activeElement) ?? false;
      if (event.shiftKey && (!inside || document.activeElement === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-label="باز کردن منو"
        onClick={() => setOpen(true)}
        className={`${iconButton} lg:hidden`}
      >
        <Menu className="size-5" aria-hidden />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="منوی ناوبری"
          className="fixed inset-0 z-50 lg:hidden"
        >
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-overlay"
          />
          <div
            ref={panelRef}
            className="absolute inset-y-0 start-0 flex w-64 max-w-[85vw] flex-col bg-panel shadow-elevated"
          >
            <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
              <span className="text-title font-bold text-accent-dark">بتول</span>
              <button
                ref={closeRef}
                type="button"
                aria-label="بستن منو"
                onClick={() => setOpen(false)}
                className={iconButton}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <Sidebar
              groups={buildNavGroups(role)}
              activeHref={pathname}
              className="min-h-0 flex-1"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

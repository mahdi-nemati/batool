"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

const GAP = 8;
const EDGE = 8;
const FOCUSABLE =
  '[data-autofocus], a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface HoverCardProps {
  /** The trigger. Focus on it opens the card immediately. */
  children: React.ReactNode;
  content: React.ReactNode;
  /** نام دسترس‌پذیر کارت. */
  label: string;
  /** Delay before a hover opens it, so a passing pointer does not. */
  openDelay?: number;
  /** Delay before it closes, so the pointer can reach the card itself. */
  closeDelay?: number;
  side?: "top" | "bottom";
  /** `start` follows the trigger's inline-start edge (the right edge in RTL). */
  align?: "start" | "center" | "end";
  className?: string;
}

/**
 * کارت شناور. A hover card is a non-modal popup: it never steals focus, opens
 * instantly on focus, and is portaled to `document.body` with `position: fixed`
 * so an `overflow: hidden` ancestor cannot clip it.
 */
export function HoverCard({
  children,
  content,
  label,
  openDelay = 300,
  closeDelay = 200,
  side = "bottom",
  align = "start",
  className,
}: HoverCardProps) {
  const triggerRef = React.useRef<HTMLSpanElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const openTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = React.useState(false);
  // Null until the card is measured, which also keeps it invisible on first paint.
  const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(null);
  const cardId = React.useId();

  const clearTimers = React.useCallback(() => {
    if (openTimer.current !== null) clearTimeout(openTimer.current);
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  const close = React.useCallback(() => {
    clearTimers();
    setOpen(false);
  }, [clearTimers]);

  React.useEffect(() => clearTimers, [clearTimers]);

  const place = React.useCallback(() => {
    const trigger = triggerRef.current;
    const card = cardRef.current;
    if (!trigger || !card) return;
    const box = trigger.getBoundingClientRect();
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const roomAbove = box.top - GAP - EDGE;
    const roomBelow = viewportHeight - box.bottom - GAP - EDGE;
    // Flip to the roomier side instead of hanging off the viewport.
    const placed =
      side === "top"
        ? roomAbove < height && roomBelow > roomAbove
          ? "bottom"
          : "top"
        : roomBelow < height && roomAbove > roomBelow
          ? "top"
          : "bottom";
    const top = placed === "top" ? box.top - height - GAP : box.bottom + GAP;

    const rtl = getComputedStyle(trigger).direction === "rtl";
    const start = rtl ? box.right : box.left;
    const aligned =
      align === "center"
        ? box.left + box.width / 2 - width / 2
        : align === "end"
          ? start - width
          : start;
    const left = Math.min(Math.max(aligned, EDGE), Math.max(EDGE, viewportWidth - width - EDGE));

    setCoords({ top: Math.max(EDGE, top), left });
  }, [align, side]);

  React.useEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  function openNow() {
    clearTimers();
    setCoords(null);
    setOpen(true);
  }

  function openSoon() {
    clearTimers();
    openTimer.current = setTimeout(openNow, openDelay);
  }

  function closeSoon() {
    clearTimers();
    closeTimer.current = setTimeout(close, closeDelay);
  }

  function focusables(): HTMLElement[] {
    return Array.from(cardRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
  }

  function onTriggerKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      close();
      return;
    }
    // The card is portaled to the end of <body>, so Tab would skip over it.
    if (event.key === "Tab" && !event.shiftKey && open) {
      const first = focusables().at(0);
      if (first) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function onCardKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      close();
      triggerRef.current?.focus();
      return;
    }
    if (event.key !== "Tab") return;
    const first = focusables().at(0);
    const last = focusables().at(-1);
    if (!first || !last) return;
    if (event.shiftKey === (document.activeElement === first)) {
      event.preventDefault();
      triggerRef.current?.focus();
    }
  }

  function keepFocusInside(from: "trigger" | "card", related: EventTarget | null) {
    if (!(related instanceof Node)) return true;
    if (triggerRef.current?.contains(related)) return true;
    return from === "card" && (cardRef.current?.contains(related) ?? false);
  }

  return (
    <>
      <span
        ref={triggerRef}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? cardId : undefined}
        className="inline-flex"
        onPointerEnter={openSoon}
        onPointerLeave={closeSoon}
        onFocus={openNow}
        onBlur={(event) => {
          if (!keepFocusInside("trigger", event.relatedTarget)) close();
        }}
        onKeyDown={onTriggerKeyDown}
      >
        {children}
      </span>

      {open
        ? createPortal(
            <div
              ref={cardRef}
              id={cardId}
              dir="rtl"
              role="dialog"
              aria-modal="false"
              aria-label={label}
              // A fixed overlay anchored to a measured rect: the coordinates are
              // physical, so this is the one place logical properties cannot be used.
              style={{ top: coords?.top ?? 0, left: coords?.left ?? 0 }}
              className={cn(
                "fixed z-50 w-72 max-w-[calc(100vw-1rem)] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-elevated",
                "transition-opacity duration-200 motion-reduce:transition-none",
                coords !== null ? "opacity-100" : "opacity-0",
                className,
              )}
              onPointerEnter={clearTimers}
              onPointerLeave={closeSoon}
              onFocus={clearTimers}
              onBlur={(event) => {
                if (!keepFocusInside("card", event.relatedTarget)) close();
              }}
              onKeyDown={onCardKeyDown}
            >
              {content}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

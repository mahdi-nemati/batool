"use client";

import * as React from "react";
import { Check, Copy, Plus, RotateCw, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

/**
 * صفحه‌های خطا. A Persian/RTL set of full-page states: a 404 with a search box,
 * a 500 with a tracking code and a retry, and an empty state with an add button.
 *
 * The code is rendered large and muted so the number is the first thing read and
 * the last thing shouted. Headlines are plain factual sentences; every body is
 * two sentences and ends with the one next step the reader can take.
 *
 * All three are page-level components and each renders an `h1`.
 */

// Only the display code needs converting; a tracking code is an identifier and
// stays Latin, rendered inside a `dir="ltr"` box so it copies cleanly.
const faDigits = new Intl.NumberFormat("fa-IR", { useGrouping: false });

/**
 * A 200ms entrance, and nothing at all under `prefers-reduced-motion`. Declared
 * here rather than in globals.css so the template remains a single file.
 */
const MOTION = `
@keyframes batool-error-in { from { opacity: 0; transform: translateY(6px); } }
.batool-error-in { animation: batool-error-in 200ms ease-out both; }
@media (prefers-reduced-motion: reduce) { .batool-error-in { animation: none; } }
`;

export interface NotFoundPageProps {
  /**
   * Called with the trimmed query on submit. Required: the page cannot search
   * without a destination, and inventing a route would be a lie.
   */
  onSearch: (query: string) => void;
  /** Usually a `next/link` back to a safe route. */
  backAction?: React.ReactNode;
  className?: string;
}

/** ۴۰۴ — the address does not exist, so hand over a way to look for the real one. */
export function NotFoundPage({ onSearch, backAction, className }: NotFoundPageProps) {
  const [query, setQuery] = React.useState("");
  const searchId = React.useId();

  return (
    <ErrorShell code={404} title="این صفحه در بتول وجود ندارد." className={className}>
      <p className="max-w-md text-body leading-6 text-muted-foreground">
        نشانی وارد‌شده اشتباه است، یا صفحه‌ای که دنبالش بودید جابه‌جا شده است. برای رسیدن به بخش
        موردنظر، نام آن را در کادر زیر جست‌وجو کنید.
      </p>

      <form
        role="search"
        className="flex w-full max-w-sm flex-col gap-2 sm:flex-row sm:items-center"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = query.trim();
          if (trimmed) onSearch(trimmed);
        }}
      >
        <div className="flex-1">
          <label htmlFor={searchId} className="sr-only">
            جست‌وجوی بخش موردنظر
          </label>
          <Input
            id={searchId}
            name="q"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="مثلاً اقساط یا طرف‌حساب‌ها"
            startAddon={<Search className="size-4" aria-hidden />}
          />
        </div>
        <Button type="submit" disabled={query.trim().length === 0}>
          جست‌وجو
        </Button>
      </form>

      {backAction}
    </ErrorShell>
  );
}

export interface ServerErrorPageProps {
  /** Reference to quote in a bug report, e.g. `BAT-8F3A-2C91`. */
  trackingCode?: string;
  /** Defaults to a full page reload. */
  onRetry?: () => void;
  backAction?: React.ReactNode;
  className?: string;
}

/** ۵۰۰ — the request never completed, so give a code to quote and a way to retry. */
export function ServerErrorPage({
  trackingCode,
  onRetry,
  backAction,
  className,
}: ServerErrorPageProps) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copyTrackingCode() {
    if (trackingCode === undefined) return;
    try {
      await navigator.clipboard.writeText(trackingCode);
      setCopied(true);
    } catch {
      // Clipboard access can be denied; the code stays visible and selectable.
    }
  }

  return (
    <ErrorShell code={500} title="درخواست شما در سرور پردازش نشد." className={className}>
      <p className="max-w-md text-body leading-6 text-muted-foreground">
        این خطا پیش از تکمیل عملیات رخ داده و برای پیگیری ثبت شده است. چند لحظه بعد دوباره تلاش کنید
        و اگر تکرار شد کد پیگیری را همراه گزارش خطا بفرستید.
      </p>

      {trackingCode !== undefined ? (
        <div className="flex w-full max-w-sm flex-col items-center gap-1.5">
          <span className="text-label text-muted-foreground">کد پیگیری</span>
          <div className="flex items-center gap-2">
            <code
              className="rounded-lg border border-border bg-card px-3 py-2 text-label text-foreground"
              dir="ltr"
            >
              {trackingCode}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyTrackingCode}
              aria-describedby={copied ? "error-copy-status" : undefined}
            >
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? "کپی شد" : "کپی"}
            </Button>
          </div>
          <span id="error-copy-status" role="status" aria-live="polite" className="sr-only">
            {copied ? "کد پیگیری کپی شد." : ""}
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          onClick={() => {
            if (onRetry) onRetry();
            else window.location.reload();
          }}
        >
          <RotateCw aria-hidden />
          تلاش دوباره
        </Button>
        {backAction}
      </div>
    </ErrorShell>
  );
}

export interface EmptyStatePageProps {
  title: string;
  /** Two sentences: what is missing, and how to fill it. */
  description: string;
  onAdd: () => void;
  /** Defaults to «افزودن». */
  addLabel?: string;
  icon?: LucideIcon;
  secondaryAction?: React.ReactNode;
  className?: string;
}

/** Not an error: the list is simply empty. Offer the one action that fixes it. */
export function EmptyStatePage({
  title,
  description,
  onAdd,
  addLabel = "افزودن",
  icon: Icon,
  secondaryAction,
  className,
}: EmptyStatePageProps) {
  return (
    <main
      dir="rtl"
      className={cn(
        "batool-error-in flex min-h-dvh w-full flex-col items-center justify-center gap-3 bg-background px-4 py-14 text-center",
        className,
      )}
    >
      <style>{MOTION}</style>

      <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-input p-8">
        {Icon ? (
          <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Icon className="size-5" aria-hidden />
          </span>
        ) : null}

        <h1 className="text-title font-bold leading-6 text-foreground">{title}</h1>
        <p className="max-w-sm text-body leading-6 text-muted-foreground">{description}</p>

        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={onAdd}>
            <Plus aria-hidden />
            {addLabel}
          </Button>
          {secondaryAction}
        </div>
      </div>
    </main>
  );
}

interface ErrorShellProps {
  code: number;
  title: string;
  children: React.ReactNode;
  // `| undefined` because exactOptionalPropertyTypes is on and every caller
  // forwards its own optional className straight through.
  className?: string | undefined;
}

function ErrorShell({ code, title, children, className }: ErrorShellProps) {
  const digits = faDigits.format(code);
  return (
    <main
      dir="rtl"
      className={cn(
        "batool-error-in flex min-h-dvh w-full flex-col items-center justify-center gap-5 bg-background px-4 py-14 text-center",
        className,
      )}
    >
      <style>{MOTION}</style>

      {/* The digits are decoration; the same information is spelled out for
          screen readers in the heading below. */}
      <p
        aria-hidden
        className="text-7xl font-bold leading-none tabular-nums text-muted-foreground/40 sm:text-8xl"
      >
        {digits}
      </p>

      <h1 className="max-w-lg text-2xl font-bold leading-9 text-foreground">
        <span className="sr-only">خطای {digits}: </span>
        {title}
      </h1>

      {children}
    </main>
  );
}

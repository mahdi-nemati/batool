"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationMeta } from "@batool/types";
import { cn } from "@/lib/cn";

const digits = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });

export interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  className?: string;
  label?: string;
}

/**
 * Server-side pagination footer for `PaginatedResponse` lists. The visible rows
 * are sliced by the API, so this control never filters data locally — it only
 * asks for the next window.
 */
export function Pagination({
  meta,
  onPageChange,
  className,
  label = "صفحه‌بندی",
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  const first = meta.total === 0 ? 0 : Math.max(1, (meta.page - 1) * meta.pageSize + 1);
  const last = Math.min(meta.total, meta.page * meta.pageSize);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground",
        className,
      )}
    >
      <span>
        {meta.total === 0
          ? "موردی برای نمایش نیست"
          : `نمایش ${digits.format(first)} تا ${digits.format(last)} از ${digits.format(
              meta.total,
            )} مورد`}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={meta.page <= 1}
          aria-label="صفحه‌ی قبل"
          className="rounded-md p-1.5 transition-colors hover:bg-accent-soft hover:text-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
        <span aria-live="polite">
          {`صفحه‌ی ${digits.format(meta.page)} از ${digits.format(pageCount)}`}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={meta.page >= pageCount}
          aria-label="صفحه‌ی بعد"
          className="rounded-md p-1.5 transition-colors hover:bg-accent-soft hover:text-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

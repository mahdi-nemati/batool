"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

type SortDirection = "asc" | "desc";

export interface DataTableColumn<T extends object> {
  key: keyof T & string;
  header: string;
  sortable?: boolean;
  numeric?: boolean;
  cell?: (value: T[DataTableColumn<T>["key"]], row: T) => React.ReactNode;
}

interface SortState<T extends object> {
  key: keyof T & string;
  direction: SortDirection;
}

const persianDigits = new Intl.NumberFormat("fa-IR");

function normalizeSearch(value: unknown): string {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .toLocaleLowerCase("fa-IR")
    .trim();
}

function compareValues(left: unknown, right: unknown): number {
  if (typeof left === "number" && typeof right === "number") return left - right;
  return normalizeSearch(left).localeCompare(normalizeSearch(right), "fa-IR");
}

export function DataTable<T extends object>({
  data,
  columns,
  searchKeys = [],
  loading = false,
  pageSize = 10,
  rowKey,
  label = "جدول داده‌ها",
  searchPlaceholder = "جست‌وجو در جدول",
  emptyTitle = "داده‌ای ثبت نشده است",
  emptyDescription = "هنوز داده‌ای برای نمایش وجود ندارد.",
}: {
  data: T[];
  columns: DataTableColumn<T>[];
  searchKeys?: (keyof T & string)[];
  loading?: boolean;
  pageSize?: number;
  rowKey?: (row: T, index: number) => React.Key;
  label?: string;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState<T> | null>(null);

  const filteredRows = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery || searchKeys.length === 0) return data;
    return data.filter((row) =>
      searchKeys.some((key) => normalizeSearch(row[key]).includes(normalizedQuery)),
    );
  }, [data, query, searchKeys]);

  const sortedRows = useMemo(() => {
    if (sort === null) return filteredRows;
    return [...filteredRows].sort((left, right) => {
      const result = compareValues(left[sort.key], right[sort.key]);
      return sort.direction === "asc" ? result : -result;
    });
  }, [filteredRows, sort]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const visibleRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [query, sort]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  function cycleSort(column: DataTableColumn<T>) {
    if (!column.sortable) return;
    if (sort?.key !== column.key) {
      setSort({ key: column.key, direction: "asc" });
    } else if (sort.direction === "asc") {
      setSort({ key: column.key, direction: "desc" });
    } else {
      setSort(null);
    }
  }

  const sortableColumns = columns.filter((column) => column.sortable);

  function renderCell(column: DataTableColumn<T>, row: T) {
    return column.cell ? column.cell(row[column.key], row) : String(row[column.key] ?? "");
  }

  function sortIcon(active: boolean) {
    if (!active) return <ArrowUpDown className="size-3" aria-hidden />;
    return sort?.direction === "asc" ? (
      <ArrowUp className="size-3" aria-hidden />
    ) : (
      <ArrowDown className="size-3" aria-hidden />
    );
  }

  return (
    <div dir="rtl" className="flex w-full min-w-0 flex-col gap-3">
      {searchKeys.length > 0 ? (
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="max-w-sm"
        />
      ) : null}
      {/* Small screens: sorting moves to compact chips and every row becomes a
          labelled card, so a wide table never forces sideways scrolling. */}
      {sortableColumns.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 md:hidden">
          <span className="text-xs text-muted-foreground">مرتب‌سازی:</span>
          {sortableColumns.map((column) => {
            const active = sort?.key === column.key;
            return (
              <button
                key={column.key}
                type="button"
                onClick={() => cycleSort(column)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors motion-reduce:transition-none",
                  active
                    ? "border-primary bg-accent-soft text-foreground"
                    : "border-border text-muted-foreground hover:bg-accent-soft hover:text-foreground",
                )}
              >
                {column.header}
                {sortIcon(active)}
              </button>
            );
          })}
        </div>
      ) : null}
      <ul className="flex flex-col gap-2 md:hidden">
        {loading
          ? Array.from({ length: Math.min(pageSize, 5) }, (_, index) => (
              <li key={index}>
                <Skeleton className="h-16 w-full" />
              </li>
            ))
          : visibleRows.map((row, index) => (
              <li
                key={rowKey?.(row, index) ?? index}
                className="rounded-lg border border-border p-3"
              >
                <dl className="flex flex-col gap-1.5 text-sm">
                  {columns.map((column) => (
                    <div
                      key={column.key}
                      className="flex min-w-0 items-start justify-between gap-3"
                    >
                      <dt className="shrink-0 text-xs text-muted-foreground">{column.header}</dt>
                      <dd
                        className={cn(
                          "min-w-0 break-words text-end",
                          column.numeric && "tabular-nums",
                        )}
                      >
                        {renderCell(column, row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
        {!loading && visibleRows.length === 0 ? (
          <li>
            <EmptyState title={emptyTitle} description={emptyDescription} />
          </li>
        ) : null}
      </ul>
      {/* min-w-0 + max-w-full: inside a grid/flex parent the table must be
          allowed to shrink instead of stretching the page. The horizontal
          scroller is only a safety net for genuinely wide tables, and
          whitespace/nowrap are limited to md+ so a narrow card never needs it. */}
      <div className="hidden w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-border md:block">
        <table className="w-full text-sm" aria-label={label}>
          <thead className="bg-secondary/60 text-xs text-muted-foreground">
            <tr>
              {columns.map((column) => {
                const active = sort?.key === column.key;
                const ariaSort = active
                  ? sort.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none";
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={ariaSort}
                    className={cn(
                      "px-3 py-2 font-medium md:whitespace-nowrap",
                      column.numeric ? "text-end" : "text-start",
                    )}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => cycleSort(column)}
                        className="inline-flex items-center gap-1 rounded-md p-1 text-inherit transition-colors hover:bg-accent-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                      >
                        {column.header}
                        {sortIcon(active)}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-4">
                  <div className="flex flex-col gap-2" aria-label="در حال بارگذاری">
                    {Array.from({ length: Math.min(pageSize, 5) }, (_, index) => (
                      <Skeleton key={index} className="h-8 w-full" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : visibleRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              visibleRows.map((row, index) => (
                <tr
                  key={rowKey?.(row, index) ?? index}
                  className="border-t border-border transition-colors hover:bg-accent/40 motion-reduce:transition-none"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-3 py-2.5 align-middle break-words",
                        column.numeric && "text-end tabular-nums",
                      )}
                    >
                      {renderCell(column, row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!loading && sortedRows.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{`صفحه‌ی ${persianDigits.format(page)} از ${persianDigits.format(pageCount)}`}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              aria-label="صفحه‌ی قبل"
              className="rounded-md p-1.5 transition-colors hover:bg-accent-soft hover:text-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={page === pageCount}
              aria-label="صفحه‌ی بعد"
              className="rounded-md p-1.5 transition-colors hover:bg-accent-soft hover:text-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

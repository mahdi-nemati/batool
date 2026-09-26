"use client";

import { useState } from "react";
import { History } from "lucide-react";
import type { AssetKind, PaginatedResponse, TransferDto } from "@batool/types";
import { listTransfers } from "@/lib/api/finance";
import { formatJalaliDate } from "@/lib/formatting/jalali";
import { formatQuantity, formatTomanUnit } from "@/lib/formatting/persian";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 20;

type WalletKind = Extract<AssetKind, "GOLD" | "USD">;

function isBuy(transfer: TransferDto, asset: WalletKind): boolean {
  return transfer.destination.kind === asset;
}

function quantityOf(transfer: TransferDto, asset: WalletKind): string {
  const raw = asset === "GOLD" ? transfer.amountGram : transfer.amountUsd;
  return raw ?? "0";
}

/** تاریخچهٔ خرید و فروش کیف پول با صفحه‌بندی سمت سرور. */
export function WalletHistory({
  asset,
  unit,
  title,
  initial,
}: {
  asset: WalletKind;
  unit: string;
  title: string;
  initial: PaginatedResponse<TransferDto>;
}) {
  const [transfers, setTransfers] = useState(initial);
  const [page, setPage] = useState(initial.meta.page);
  const [loading, setLoading] = useState(false);

  async function load(nextPage: number) {
    setLoading(true);
    try {
      const data = await listTransfers({ kind: asset, page: nextPage, pageSize: PAGE_SIZE });
      setTransfers(data);
      setPage(nextPage);
    } finally {
      setLoading(false);
    }
  }

  const pageSize = transfers.meta.pageSize || PAGE_SIZE;
  const lastPage = Math.max(1, Math.ceil(transfers.meta.total / pageSize));

  return (
    <div className="flex flex-col gap-2">
      {transfers.data.length === 0 ? (
        <EmptyState
          icon={History}
          title="هنوز خرید یا فروشی ثبت نشده است"
          description={`با ثبت اولین معامله ${title}، تاریخچه کامل اینجا نمایش داده می‌شود.`}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border" aria-busy={loading}>
          {transfers.data.map((t) => {
            const buy = isBuy(t, asset);
            return (
              <li key={t.id} className="flex flex-col gap-1 py-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-foreground">{t.description}</span>
                  <span
                    className={cn(
                      "shrink-0 font-bold tabular-nums",
                      buy ? "text-accent-dark" : "text-danger",
                    )}
                  >
                    {buy ? "+" : "−"}
                    {formatQuantity(quantityOf(t, asset))} {unit}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-muted-foreground">
                  <span>
                    {buy ? "پرداخت" : "دریافت"}: {formatTomanUnit(t.amountToman ?? 0)}
                  </span>
                  <span>{formatJalaliDate(t.occurredAt)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {lastPage > 1 ? (
        <Pagination
          meta={{ ...transfers.meta, page, pageSize }}
          className="mt-2"
          onPageChange={(next) => {
            if (next >= 1 && next <= lastPage) void load(next);
          }}
        />
      ) : null}
    </div>
  );
}

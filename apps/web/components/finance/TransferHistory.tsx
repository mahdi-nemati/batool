"use client";

import { useState } from "react";
import Link from "next/link";
import { Receipt } from "lucide-react";
import type { AssetKind, PaginatedResponse, TransferDto } from "@batool/types";
import { listTransfers, type ListTransfersInput } from "@/lib/api/finance";
import { formatJalaliDate } from "@/lib/formatting/jalali";
import { formatQuantity, formatTomanUnit } from "@/lib/formatting/persian";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";

const digits = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });
const PAGE_SIZE = 20;

function assetRoute(kind: string): string {
  if (kind === "GOLD") return "/dashboard/assets/gold";
  if (kind === "USD") return "/dashboard/assets/usd";
  return "/dashboard/assets";
}

function TransferAmount({ transfer }: { transfer: TransferDto }) {
  if (transfer.amountGram !== null) {
    return <span>{formatQuantity(transfer.amountGram)} گرم</span>;
  }
  if (transfer.amountUsd !== null) {
    return <span>{formatQuantity(transfer.amountUsd)} دلار</span>;
  }
  return <span>{formatTomanUnit(transfer.amountToman ?? 0)}</span>;
}

function TransferRow({ transfer }: { transfer: TransferDto }) {
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 text-sm sm:grid-cols-[1fr_auto_auto]">
      <span className="min-w-0">
        <span className="block font-bold">{transfer.description}</span>
        <span className="block text-xs text-muted">
          از{" "}
          <Link className="text-accent-dark" href={assetRoute(transfer.source.kind)}>
            {transfer.source.name}
          </Link>{" "}
          به{" "}
          <Link className="text-accent-dark" href={assetRoute(transfer.destination.kind)}>
            {transfer.destination.name}
          </Link>
        </span>
      </span>
      <span className="shrink-0 text-xs tabular-nums text-muted">
        {formatJalaliDate(transfer.occurredAt)}
      </span>
      <b className="shrink-0 tabular-nums text-ink">
        <TransferAmount transfer={transfer} />
      </b>
    </li>
  );
}

/**
 * تاریخچهٔ انتقال‌ها. صفحهٔ اول از سرور رندر شده است؛ صفحه‌های بعد و فیلتر نوع
 * از همان اندپوینت پیجینیشن‌شده خوانده می‌شوند.
 */
export function TransferHistory({ initial }: { initial: PaginatedResponse<TransferDto> }) {
  const [transfers, setTransfers] = useState(initial);
  const [page, setPage] = useState(initial.meta.page);
  const [kind, setKind] = useState<AssetKind | "">("");
  const [loading, setLoading] = useState(false);

  async function load(nextPage: number, nextKind: AssetKind | "") {
    setLoading(true);
    try {
      const input: ListTransfersInput = { page: nextPage, pageSize: PAGE_SIZE };
      if (nextKind !== "") input.kind = nextKind;
      const data = await listTransfers(input);
      setTransfers(data);
      setPage(nextPage);
    } finally {
      setLoading(false);
    }
  }

  const total = transfers.meta.total;
  const pageSize = transfers.meta.pageSize || PAGE_SIZE;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {total === 0 ? "بدون انتقال" : `${digits.format(total)} مورد انتقال`}
        </span>
        <div className="flex items-center gap-2">
          <label htmlFor="transfer-kind" className="text-xs text-muted-foreground">
            فیلتر نوع
          </label>
          <Select
            id="transfer-kind"
            aria-label="فیلتر نوع انتقال"
            className="h-9 w-40"
            value={kind}
            options={[
              { value: "", label: "همه" },
              { value: "BANK", label: "حساب بانکی" },
              { value: "FUND", label: "صندوق" },
              { value: "GOLD", label: "طلا" },
              { value: "USD", label: "دلار" },
            ]}
            onChange={(event) => {
              const next = event.target.value as AssetKind | "";
              setKind(next);
              void load(1, next);
            }}
          />
        </div>
      </div>

      {transfers.data.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="انتقالی یافت نشد"
          description={
            kind.length > 0
              ? "با این فیلتر انتقالی ثبت نشده است؛ فیلتر را پاک کنید."
              : "با افزودن حساب، صندوق یا خرید و فروش طلا و دلار، تاریخچه‌ای از جابه‌جایی‌ها اینجا نمایش داده می‌شود."
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-line" aria-busy={loading}>
          {transfers.data.map((transfer) => (
            <TransferRow key={transfer.id} transfer={transfer} />
          ))}
        </ul>
      )}

      {lastPage > 1 ? (
        <Pagination
          meta={{ ...transfers.meta, page, pageSize }}
          onPageChange={(next) => {
            if (next >= 1 && next <= lastPage) void load(next, kind);
          }}
        />
      ) : null}
    </div>
  );
}

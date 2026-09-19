import Link from "next/link";
import type { TransferDto } from "@batool/types";
import { WalletTradeForm } from "@/components/finance/WalletTradeForm";
import { formatQuantity, formatTomanUnit } from "@/lib/formatting/persian";
import { formatJalaliDate } from "@/lib/formatting/jalali";

type WalletKind = "GOLD" | "USD";

interface Props {
  asset: WalletKind;
  title: string;
  unit: string;
  balance: string;
  createdAt: string;
  accounts: { id: string; name: string }[];
  transfers: TransferDto[];
}

function isBuy(t: TransferDto, asset: WalletKind): boolean {
  return t.destination.kind === asset;
}

function quantityOf(t: TransferDto, asset: WalletKind): string {
  const raw = asset === "GOLD" ? t.amountGram : t.amountUsd;
  return raw ?? "0";
}

export function WalletPage({ asset, title, unit, balance, createdAt, accounts, transfers }: Props) {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{title}</h1>
          <Link href="/dashboard/assets" className="text-sm text-muted hover:text-ink">
            → همه دارایی‌ها
          </Link>
        </div>
        <div className="rounded-xl border border-line bg-panel p-4">
          <p className="text-sm text-muted">موجودی فعلی ({title})</p>
          <p className="mt-1 text-2xl font-bold text-ink">
            {formatQuantity(balance)} {unit}
          </p>
          <p className="mt-2 text-xs text-muted">
            این کیف پول ارزش تومانی ندارد و به تومان تبدیل یا نمایش داده نمی‌شود.
          </p>
          <p className="mt-1 text-xs text-muted">تاریخ ایجاد: {formatJalaliDate(createdAt)}</p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">خرید و فروش</h2>
        <WalletTradeForm asset={asset} accounts={accounts} />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">تاریخچه</h2>
        {transfers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-4 text-muted">
            هنوز خرید یا فروشی ثبت نشده است.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {transfers.map((t) => {
              const buy = isBuy(t, asset);
              return (
                <li
                  key={t.id}
                  className="flex flex-col gap-1 rounded-xl border border-line bg-panel px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-ink">{t.description}</span>
                    <span
                      className={`shrink-0 font-bold ${buy ? "text-accent-dark" : "text-danger"}`}
                    >
                      {buy ? "+" : "−"}
                      {formatQuantity(quantityOf(t, asset))} {unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-sm text-muted">
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
      </section>
    </div>
  );
}

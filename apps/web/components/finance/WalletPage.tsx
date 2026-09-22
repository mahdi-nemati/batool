import Link from "next/link";
import { Banknote, Coins, History } from "lucide-react";
import type { TransferDto } from "@batool/types";
import { WalletTradeForm } from "@/components/finance/WalletTradeForm";
import { formatQuantity, formatTomanUnit } from "@/lib/formatting/persian";
import { formatJalaliDate } from "@/lib/formatting/jalali";
import { AssetKind } from "@batool/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";

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
  const Icon = asset === AssetKind.GOLD ? Coins : Banknote;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">دارایی‌ها</p>
          <h1 className="text-3xl font-bold">{title}</h1>
        </div>
        <Link href="/dashboard/assets" className="text-sm font-bold text-primary hover:underline">
          → همه دارایی‌ها
        </Link>
      </header>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">موجودی فعلی</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              {formatQuantity(balance)} {unit}
            </p>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Icon className="size-5 text-primary" aria-hidden />
          </span>
        </div>
        <p className="mt-3 text-xs text-muted">
          این کیف پول ارزش تومانی ندارد و به تومان تبدیل یا نمایش داده نمی‌شود.
        </p>
        <p className="mt-1 text-xs text-muted">تاریخ ایجاد: {formatJalaliDate(createdAt)}</p>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">خرید و فروش</h2>
        <WalletTradeForm asset={asset} accounts={accounts} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4 text-primary" aria-hidden />
            تاریخچه
          </CardTitle>
          <CardDescription>خرید و فروش‌های ثبت‌شده</CardDescription>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <EmptyState
              icon={History}
              title="هنوز خرید یا فروشی ثبت نشده است"
              description={`با ثبت اولین معامله ${title}، تاریخچه کامل اینجا نمایش داده می‌شود.`}
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {transfers.map((t) => {
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
        </CardContent>
      </Card>
    </div>
  );
}
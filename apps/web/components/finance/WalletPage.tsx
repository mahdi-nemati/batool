import Link from "next/link";
import { Banknote, Coins, History } from "lucide-react";
import type { PaginatedResponse, TransferDto } from "@batool/types";
import { WalletHistory } from "@/components/finance/WalletHistory";
import { WalletTradeActions } from "@/components/finance/WalletTradeActions";
import { formatQuantity } from "@/lib/formatting/persian";
import { formatJalaliDate } from "@/lib/formatting/jalali";
import { AssetKind } from "@batool/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type WalletKind = "GOLD" | "USD";

interface Props {
  asset: WalletKind;
  title: string;
  unit: string;
  balance: string;
  createdAt: string;
  accounts: { id: string; name: string }[];
  transfers: PaginatedResponse<TransferDto>;
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

      {/* Actions: the trade form lives in a modal, like the Assets and Setar pages. */}
      <WalletTradeActions asset={asset} title={title} accounts={accounts} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4 text-primary" aria-hidden />
            تاریخچه
          </CardTitle>
          <CardDescription>خرید و فروش‌های ثبت‌شده</CardDescription>
        </CardHeader>
        <CardContent>
          <WalletHistory asset={asset} unit={unit} title={title} initial={transfers} />
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Banknote, Coins, Receipt } from "lucide-react";
import type { TransferDto } from "@batool/types";
import { AddAccountForm } from "@/components/finance/AddAccountForm";
import { AddFundForm } from "@/components/finance/AddFundForm";
import { TransferForm } from "@/components/finance/TransferForm";
import { getAssetsOverviewServer } from "@/lib/api/finance";
import { formatQuantity, formatTomanUnit } from "@/lib/formatting/persian";
import { formatJalaliDate } from "@/lib/formatting/jalali";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";

export const dynamic = "force-dynamic";

const wholeFormat = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });

function assetRoute(kind: string): string {
  if (kind === "GOLD") return "/dashboard/assets/gold";
  if (kind === "USD") return "/dashboard/assets/usd";
  return "/dashboard/assets";
}

function TransferDescription({ transfer }: { transfer: TransferDto }) {
  return (
    <span className="min-w-0">
      <span className="block font-bold">{transfer.description}</span>
      <span className="block text-xs text-muted">
        از <Link className="text-accent-dark" href={assetRoute(transfer.source.kind)}>{transfer.source.name}</Link>{" "}
        به <Link className="text-accent-dark" href={assetRoute(transfer.destination.kind)}>{transfer.destination.name}</Link>
      </span>
    </span>
  );
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
      <TransferDescription transfer={transfer} />
      <span className="shrink-0 text-xs tabular-nums text-muted">
        {formatJalaliDate(transfer.occurredAt)}
      </span>
      <b className="shrink-0 tabular-nums text-ink">
        <TransferAmount transfer={transfer} />
      </b>
    </li>
  );
}

export default async function AssetsPage() {
  const store = await cookies();
  const data = await getAssetsOverviewServer(
    store
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; "),
  );
  if (data === null) {
    redirect("/login");
  }

  const totalToman =
    data.bankAccounts.reduce((sum, account) => sum + account.balanceToman, 0) +
    data.funds.reduce((sum, fund) => sum + fund.balanceToman, 0);
  const accountCount = data.bankAccounts.length;
  const fundCount = data.funds.length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">مدیریت دارایی</p>
          <h1 className="text-3xl font-bold">دارایی‌ها</h1>
          <p className="mt-1 text-sm text-muted">حساب‌ها، صندوق‌ها، طلا و دلار</p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-bold text-primary hover:underline"
        >
          ← بازگشت به داشبورد
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col justify-between lg:col-span-2">
          <div className="p-6 pb-4">
            <p className="text-sm text-muted">مجموع موجودی (تومان)</p>
          </div>
          <div className="p-6 pt-0">
            <div className="flex flex-wrap items-end gap-x-2">
              <span dir="ltr" className="text-4xl font-bold leading-none tabular-nums">
                {wholeFormat.format(totalToman)}
              </span>
              <span className="mb-0.5 text-sm text-muted">تومان</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {accountCount > 0 ? (
                <Badge variant="secondary">{accountCount} حساب بانکی</Badge>
              ) : null}
              {fundCount > 0 ? (
                <Badge variant="secondary">{fundCount} صندوق</Badge>
              ) : (
                <span className="text-sm text-muted">هنوز حساب یا صندوقی ثبت نشده است.</span>
              )}
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Link href="/dashboard/assets/gold" className="group/focus">
            <Card className="flex flex-1 items-center gap-3 p-6 transition-colors hover:border-ring/60">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Coins className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted">طلا</p>
                <p className="mt-0.5 text-lg font-bold">
                  {formatQuantity(data.gold.balanceGram)} <span className="text-xs font-normal text-muted">گرم</span>
                </p>
                <p className="mt-0.5 text-xs text-primary">مدیریت خرید و فروش</p>
              </div>
            </Card>
          </Link>
          <Link href="/dashboard/assets/usd" className="group/focus">
            <Card className="flex flex-1 items-center gap-3 p-6 transition-colors hover:border-ring/60">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Banknote className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted">دلار</p>
                <p className="mt-0.5 text-lg font-bold">
                  {formatQuantity(data.usd.balanceUsd)} <span className="text-xs font-normal text-muted">دلار</span>
                </p>
                <p className="mt-0.5 text-xs text-primary">مدیریت خرید و فروش</p>
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {data.funds.some((fund) => fund.goalToman !== null && fund.goalToman > 0) ? (
        <section className="flex flex-col gap-3" aria-labelledby="fund-goals-heading">
          <div>
            <h2 id="fund-goals-heading" className="text-lg font-semibold">پیشرفت هدف صندوق‌ها</h2>
            <p className="text-sm text-muted">موجودی فعلی هر صندوق نسبت به هدف پس‌انداز</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {data.funds
              .filter((fund) => fund.goalToman !== null && fund.goalToman > 0)
              .map((fund) => {
                const goal = fund.goalToman ?? 0;
                const remaining = Math.max(goal - fund.balanceToman, 0);
                return (
                  <Card key={fund.id} className="flex flex-col gap-4 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{fund.name}</h3>
                      <span className="text-xs text-muted">هدف: {formatTomanUnit(goal)}</span>
                    </div>
                    <Progress
                      value={fund.balanceToman}
                      max={goal}
                      label={`موجودی ${formatTomanUnit(fund.balanceToman)} از ${formatTomanUnit(goal)}`}
                    />
                    <p className="text-sm text-muted">
                      {remaining > 0
                        ? `باقی‌مانده تا هدف: ${formatTomanUnit(remaining)}`
                        : "هدف این صندوق تکمیل شده است."}
                    </p>
                  </Card>
                );
              })}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <AddAccountForm />
        <AddFundForm />
        <TransferForm
          accounts={data.bankAccounts.map((a) => ({ id: a.id, name: a.name }))}
          funds={data.funds.map((f) => ({ id: f.id, name: f.name }))}
        />
      </section>

      <Panel
        title="انتقالات"
        badge={
          <Badge variant="secondary">{wholeFormat.format(data.transfers.length)} مورد</Badge>
        }
      >
        {data.transfers.length === 0 ? (
          <div className="py-6">
            <EmptyState
              icon={Receipt}
              title="هنوز انتقالی ثبت نشده"
              description="با افزودن حساب، صندوق یا خرید و فروش طلا و دلار، تاریخچه‌ای از جابه‌جایی‌ها اینجا نمایش داده می‌شود."
            />
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {data.transfers.map((transfer) => (
              <TransferRow key={transfer.id} transfer={transfer} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Panel({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3 p-6 pb-4">
        <h2 className="text-lg font-bold">{title}</h2>
        {badge}
      </div>
      <div className="p-6 pt-0">{children}</div>
    </Card>
  );
}

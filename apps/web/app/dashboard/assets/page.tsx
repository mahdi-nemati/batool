import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Banknote, Coins, Landmark, PiggyBank } from "lucide-react";
import { AssetActions } from "@/components/finance/AssetActions";
import { FundList } from "@/components/finance/FundList";
import { TransferHistory } from "@/components/finance/TransferHistory";
import { getAssetsOverviewServer } from "@/lib/api/finance";
import { formatQuantity } from "@/lib/formatting/persian";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

const wholeFormat = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });

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
        <Link href="/dashboard" className="text-sm font-bold text-primary hover:underline">
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
              ) : accountCount === 0 ? (
                <span className="text-sm text-muted">هنوز حساب یا صندوقی ثبت نشده است.</span>
              ) : null}
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
                  {formatQuantity(data.gold.balanceGram)}{" "}
                  <span className="text-xs font-normal text-muted">گرم</span>
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
                  {formatQuantity(data.usd.balanceUsd)}{" "}
                  <span className="text-xs font-normal text-muted">دلار</span>
                </p>
                <p className="mt-0.5 text-xs text-primary">مدیریت خرید و فروش</p>
              </div>
            </Card>
          </Link>
        </div>
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="accounts-heading">
        <div>
          <h2 id="accounts-heading" className="text-lg font-semibold">
            حساب‌های بانکی
          </h2>
          <p className="text-sm text-muted">موجودی هر حساب به‌صورت جداگانه</p>
        </div>
        {data.bankAccounts.length === 0 ? (
          <Card>
            <div className="py-6">
              <EmptyState
                icon={Landmark}
                title="هنوز حساب بانکی ثبت نشده"
                description="برای ثبت درآمد، هزینه و پرداخت‌ها ابتدا یک حساب بانکی بسازید."
              />
            </div>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.bankAccounts.map((account) => (
              <li key={account.id}>
                <Card className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{account.name}</p>
                      <p className="text-xs text-muted">حساب بانکی</p>
                    </div>
                    {account.isActive ? null : <Badge variant="secondary">غیرفعال</Badge>}
                  </div>
                  <p className="text-xl font-bold tabular-nums" dir="ltr">
                    {wholeFormat.format(account.balanceToman)}
                    <span className="ms-1 text-xs font-normal text-muted">تومان</span>
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="funds-heading">
        <div>
          <h2 id="funds-heading" className="text-lg font-semibold">
            صندوق‌ها
          </h2>
          <p className="text-sm text-muted">موجودی هر صندوق به‌صورت جداگانه</p>
        </div>
        {data.funds.length === 0 ? (
          <Card>
            <div className="py-6">
              <EmptyState
                icon={PiggyBank}
                title="هنوز صندوقی ثبت نشده"
                description="صندوق‌ها برای پس‌انداز استفاده می‌شوند و فقط با انتقال بین حساب و صندوق شارژ می‌شوند."
              />
            </div>
          </Card>
        ) : (
          <FundList funds={data.funds} />
        )}
      </section>

      <section>
        <AssetActions
          accounts={data.bankAccounts.map((a) => ({ id: a.id, name: a.name }))}
          funds={data.funds.map((f) => ({ id: f.id, name: f.name }))}
        />
      </section>

      <Panel title="انتقالات">
        <TransferHistory initial={data.transfers} />
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="p-6 pb-4">
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <div className="p-6 pt-0">{children}</div>
    </Card>
  );
}

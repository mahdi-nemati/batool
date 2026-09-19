import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AddAccountForm } from "@/components/finance/AddAccountForm";
import { AddFundForm } from "@/components/finance/AddFundForm";
import { TransferForm } from "@/components/finance/TransferForm";
import { getAssetsOverviewServer } from "@/lib/api/finance";
import { formatQuantity, formatTomanUnit } from "@/lib/formatting/persian";

export const dynamic = "force-dynamic";

const jalali = new Intl.DateTimeFormat("fa-IR", { dateStyle: "short" });

function BalanceCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <p className="text-sm text-muted">{title}</p>
      <p className="mt-1 text-lg font-bold text-ink">{value}</p>
    </div>
  );
}

function WalletLinkCard({ href, title, value }: { href: string; title: string; value: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-line bg-panel p-4 transition-colors hover:border-accent"
    >
      <p className="text-sm text-muted">{title}</p>
      <p className="mt-1 text-lg font-bold text-ink">{value}</p>
      <p className="mt-1 text-xs text-accent-dark">خرید و فروش ←</p>
    </Link>
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

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-2xl font-bold">دارایی‌ها</h1>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {data.bankAccounts.map((a) => (
            <BalanceCard
              key={a.id}
              title={`حساب ${a.name}`}
              value={formatTomanUnit(a.balanceToman)}
            />
          ))}
          {data.funds.map((f) => (
            <BalanceCard
              key={f.id}
              title={`صندوق ${f.name}`}
              value={formatTomanUnit(f.balanceToman)}
            />
          ))}
          <WalletLinkCard
            href="/dashboard/assets/gold"
            title="طلا"
            value={`${formatQuantity(data.gold.balanceGram)} گرم`}
          />
          <WalletLinkCard
            href="/dashboard/assets/usd"
            title="دلار"
            value={`${formatQuantity(data.usd.balanceUsd)} دلار`}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <AddAccountForm />
        <AddFundForm />
        <TransferForm
          accounts={data.bankAccounts.map((a) => ({ id: a.id, name: a.name }))}
          funds={data.funds.map((f) => ({ id: f.id, name: f.name }))}
        />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">انتقالات</h2>
        {data.transfers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-4 text-muted">
            هنوز انتقالی ثبت نشده است.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.transfers.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-line bg-panel px-4 py-3"
              >
                <span className="text-ink">{t.description}</span>
                <span className="shrink-0 text-sm text-muted">
                  {jalali.format(new Date(t.occurredAt))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

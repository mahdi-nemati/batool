import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AssetKind } from "@batool/types";
import { getWalletOverviewServer } from "@/lib/api/finance";
import { WalletPage } from "@/components/finance/WalletPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "دلار | بتول" };

export default async function UsdWalletPage() {
  const store = await cookies();
  const data = await getWalletOverviewServer(
    store
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; "),
    AssetKind.USD,
  );
  if (data === null) {
    redirect("/login");
  }

  return (
    <WalletPage
      asset={AssetKind.USD}
      title="دلار"
      unit="دلار"
      balance={data.balance}
      createdAt={data.createdAt}
      accounts={data.accounts.map((a) => ({ id: a.id, name: a.name }))}
      transfers={data.transfers}
    />
  );
}

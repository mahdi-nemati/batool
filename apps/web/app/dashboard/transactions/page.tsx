import type { Metadata } from "next";
import { TransactionsClient } from "@/components/transactions/TransactionsClient";

export const metadata: Metadata = { title: "تراکنش‌ها | بتول" };

export default function TransactionsPage() {
  return <TransactionsClient />;
}

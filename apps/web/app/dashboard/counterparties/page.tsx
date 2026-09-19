import type { Metadata } from "next";
import { CounterpartiesClient } from "@/components/counterparties/CounterpartiesClient";

export const metadata: Metadata = { title: "طرف‌حساب‌ها | بتول" };

export default function CounterpartiesPage() {
  return <CounterpartiesClient />;
}

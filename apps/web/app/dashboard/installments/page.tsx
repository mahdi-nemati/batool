import type { Metadata } from "next";
import { InstallmentsClient } from "@/components/installments/InstallmentsClient";

export const metadata: Metadata = { title: "اقساط | بتول" };

export default function InstallmentsPage() {
  return <InstallmentsClient />;
}

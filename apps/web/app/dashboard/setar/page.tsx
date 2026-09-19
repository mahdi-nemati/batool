import type { Metadata } from "next";
import { SetarClient } from "@/components/setar/SetarClient";

export const metadata: Metadata = { title: "سه‌تار | بتول" };

export default function SetarPage() {
  return <SetarClient />;
}

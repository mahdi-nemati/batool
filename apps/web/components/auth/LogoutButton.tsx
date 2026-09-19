"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/api/auth";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      await logout();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="rounded-lg border border-line px-3 py-1 text-ink transition-colors hover:bg-paper disabled:opacity-60"
    >
      {busy ? "…" : "خروج"}
    </button>
  );
}

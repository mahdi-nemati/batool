"use client";

import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { WalletTradeForm } from "@/components/finance/WalletTradeForm";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type WalletKind = "GOLD" | "USD";

/**
 * خرید و فروش کیف پول. The trade form lives in a modal like every other action
 * form; a successful trade refreshes the server data and closes the modal.
 */
export function WalletTradeActions({
  asset,
  title,
  accounts,
}: {
  asset: WalletKind;
  title: string;
  accounts: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <ArrowLeftRight aria-hidden /> خرید و فروش {title}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) close();
        }}
        title={`خرید و فروش ${title}`}
        description="این کیف پول ارزش تومانی ندارد؛ مبلغ تومان فقط قیمت همان لحظه در تاریخچه ثبت می‌شود."
      >
        <WalletTradeForm asset={asset} accounts={accounts} onSaved={close} />
      </Dialog>
    </>
  );
}

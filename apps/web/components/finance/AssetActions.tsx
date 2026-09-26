"use client";

import { useState } from "react";
import { ArrowLeftRight, Landmark, PiggyBank } from "lucide-react";
import { AddAccountForm } from "@/components/finance/AddAccountForm";
import { AddFundForm } from "@/components/finance/AddFundForm";
import { TransferForm } from "@/components/finance/TransferForm";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type Kind = "account" | "fund" | "transfer";

/**
 * اقدامات دارایی. هر فرم در مودال باز می‌شود تا صفحه شلوغ نشود؛ بعد از ثبت
 * موفق، سرور دوباره رندر می‌شود.
 */
export function AssetActions({
  accounts,
  funds,
}: {
  accounts: { id: string; name: string }[];
  funds: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState<Kind | null>(null);
  const close = () => setOpen(null);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setOpen("account")}>
          <Landmark aria-hidden /> حساب بانکی جدید
        </Button>
        <Button variant="outline" onClick={() => setOpen("fund")}>
          <PiggyBank aria-hidden /> صندوق جدید
        </Button>
        <Button variant="outline" onClick={() => setOpen("transfer")}>
          <ArrowLeftRight aria-hidden /> انتقال وجه
        </Button>
      </div>

      <Dialog
        open={open === "account"}
        onOpenChange={(value) => {
          if (!value) close();
        }}
        title="حساب بانکی جدید"
        description="یک حساب با موجودی اولیه بسازید."
      >
        <AddAccountForm onDone={close} />
      </Dialog>

      <Dialog
        open={open === "fund"}
        onOpenChange={(value) => {
          if (!value) close();
        }}
        title="صندوق جدید"
        description="صندوق‌ها برای پس‌انداز هستند و فقط با انتقال بین حساب و صندوق شارژ می‌شوند."
      >
        <AddFundForm onDone={close} />
      </Dialog>

      <Dialog
        open={open === "transfer"}
        onOpenChange={(value) => {
          if (!value) close();
        }}
        title="انتقال وجه"
        description="جابه‌جایی تومان بین حساب‌ها و صندوق‌ها."
      >
        <TransferForm accounts={accounts} funds={funds} onDone={close} />
      </Dialog>
    </>
  );
}

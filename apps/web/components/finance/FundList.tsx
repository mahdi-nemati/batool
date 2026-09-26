"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { FundDto } from "@batool/types";
import { deleteFund, updateFund } from "@/lib/api/finance";
import { formatTomanUnit } from "@/lib/formatting/persian";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Progress } from "@/components/ui/progress";

const moneyInputClass =
  "h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground placeholder:text-muted-foreground/70";

const wholeFormat = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });

/** فهرست صندوق‌ها با ویرایش و حذف (مودالی). */
export function FundList({ funds }: { funds: FundDto[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<FundDto | null>(null);
  const [removing, setRemoving] = useState<FundDto | null>(null);

  function done() {
    setEditing(null);
    setRemoving(null);
    router.refresh();
  }

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2">
        {funds.map((fund) => {
          const goal = fund.goalToman !== null && fund.goalToman > 0 ? fund.goalToman : null;
          const remaining = goal === null ? 0 : Math.max(goal - fund.balanceToman, 0);
          return (
            <li key={fund.id}>
              <Card className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{fund.name}</p>
                    <p className="text-xs text-muted">موجودی فعلی صندوق</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`ویرایش ${fund.name}`}
                      onClick={() => setEditing(fund)}
                    >
                      <Pencil aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`حذف ${fund.name}`}
                      className="text-danger hover:text-danger"
                      onClick={() => setRemoving(fund)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </div>

                <p className="text-xl font-bold tabular-nums" dir="ltr">
                  {wholeFormat.format(fund.balanceToman)}
                  <span className="ms-1 text-xs font-normal text-muted">تومان</span>
                </p>

                {goal === null ? (
                  <p className="rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted">
                    بدون هدف پس‌انداز — برای این صندوق هدفی ثبت نشده است.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Progress
                      value={fund.balanceToman}
                      max={goal}
                      label={`هدف: ${formatTomanUnit(goal)}`}
                    />
                    <p className="text-xs text-muted">
                      {remaining > 0
                        ? `باقی‌مانده تا هدف: ${formatTomanUnit(remaining)}`
                        : "هدف این صندوق تکمیل شده است."}
                    </p>
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ul>

      <FundEditDialog fund={editing} onClose={() => setEditing(null)} onDone={done} />
      <FundDeleteDialog fund={removing} onClose={() => setRemoving(null)} onDone={done} />
    </>
  );
}

function FundEditDialog({
  fund,
  onClose,
  onDone,
}: {
  fund: FundDto | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Every close path (cancel button, Escape, overlay click) must drop the
  // unsaved draft, otherwise the next fund would open with stale values.
  function close() {
    setName(null);
    setGoal(null);
    onClose();
  }

  // Seed the fields from the fund that is being edited.
  const currentName = name ?? fund?.name ?? "";
  const currentGoal =
    goal ?? (fund !== null && fund.goalToman !== null ? String(fund.goalToman) : "");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (fund === null) return;
    setBusy(true);
    try {
      await updateFund(fund.id, {
        name: currentName,
        // An empty field means "no goal", which the API clears explicitly.
        goalToman: currentGoal.length > 0 ? currentGoal : null,
      });
      setName(null);
      setGoal(null);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={fund !== null}
      onOpenChange={(value) => {
        if (!value) close();
      }}
      title={`ویرایش ${fund?.name ?? "صندوق"}`}
      description="نام و هدف پس‌انداز را می‌توانید تغییر دهید؛ موجودی صندوق از دفتر انتقال‌ها می‌آید و دستی نیست."
    >
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="fund-edit-name">نام صندوق</Label>
          <Input
            id="fund-edit-name"
            required
            maxLength={60}
            value={currentName}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fund-edit-goal">هدف (اختیاری، تومان)</Label>
          <MoneyInput
            id="fund-edit-goal"
            value={currentGoal}
            onChange={setGoal}
            className={moneyInputClass}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            انصراف
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "در حال ذخیره…" : "ذخیرهٔ تغییرات"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function FundDeleteDialog({
  fund,
  onClose,
  onDone,
}: {
  fund: FundDto | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (fund === null) return;
    setBusy(true);
    try {
      await deleteFund(fund.id);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      role="alertdialog"
      open={fund !== null}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
      title={`حذف ${fund?.name ?? "صندوق"}؟`}
      description="این کار صندوق را حذف می‌کند. اگر موجودی داشته باشد، کل موجودی با عنوان «برگشت پول از صندوق حذف شده» به اولین حساب بانکی شما برمی‌گردد."
    >
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          انصراف
        </Button>
        <Button variant="destructive" onClick={remove} disabled={busy}>
          {busy ? "در حال حذف…" : "حذف صندوق"}
        </Button>
      </div>
    </Dialog>
  );
}

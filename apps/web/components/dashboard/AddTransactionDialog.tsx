"use client";

import { useEffect, useMemo, useState } from "react";
import type { BankAccountDto, CategoryDto, CounterpartyDto } from "@batool/types";
import { listActiveCategories } from "@/lib/api/categories";
import { listBankAccounts } from "@/lib/api/finance";
import { listCounterparties } from "@/lib/api/debts";
import { createExpense, createIncome } from "@/lib/api/transactions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";

const moneyInputClass =
  "h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60";

interface Data {
  accounts: BankAccountDto[];
  categories: CategoryDto[];
  counterparties: CounterpartyDto[];
}

interface PShare {
  amount: string;
  /** Counterparty id: the only allowed source of a shared-expense participant. */
  party: string;
}

const blankShare: PShare = { amount: "", party: "" };

/**
 * ثبت سریع درآمد/هزینه از داخل داشبورد. Form closes after a successful save;
 * the parent refreshes the summary via `onSaved`.
 *
 * Income and expense cash always comes from a Bank Account (funds are savings),
 * and an expense can be split between the user's existing Counterparties — the
 * counterparty nickname is the participant name, so no free text is accepted.
 */
export function AddTransactionDialog({
  type,
  onClose,
  onSaved,
  defaultSplit = false,
}: {
  type: "INCOME" | "EXPENSE" | null;
  onClose: () => void;
  onSaved: () => void;
  /** Open with the shared-expense builder ready (Quick Access). */
  defaultSplit?: boolean;
}) {
  const isExpense = type === "EXPENSE";
  const open = type !== null;
  const [data, setData] = useState<Data | null>(null);
  const [noAccount, setNoAccount] = useState(false);
  const [cat, setCat] = useState("");
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [split, setSplit] = useState(false);
  const [shares, setShares] = useState<PShare[]>([{ ...blankShare }]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setData(null);
    setNoAccount(false);
    setCat("");
    setAccount("");
    setAmount("");
    setDesc("");
    setSplit(type === "EXPENSE" && defaultSplit);
    setShares([{ ...blankShare }]);
    let active = true;
    Promise.all([listBankAccounts(), listActiveCategories(type), listCounterparties()])
      .then(([accounts, categories, counterparties]) => {
        if (!active) return;
        setData({
          accounts,
          categories,
          counterparties: counterparties.filter((c) => !c.archived),
        });
        setNoAccount(accounts.length === 0);
      })
      .catch(() => {
        // Loading failures are already reported through the notification channel.
        if (active) setData({ accounts: [], categories: [], counterparties: [] });
      });
    return () => {
      active = false;
    };
  }, [open, type, defaultSplit]);

  const endpoints = useMemo(
    () => data?.accounts.map((a) => ({ value: a.id, label: `حساب: ${a.name}` })) ?? [],
    [data],
  );
  const total = Number(amount) || 0;
  const participantsSum = split ? shares.reduce((s, x) => s + (Number(x.amount) || 0), 0) : 0;
  const ownerShare = total - participantsSum;
  // A share with an amount but no counterparty would be dropped on submit and
  // its amount silently charged to the owner, so it blocks the form instead.
  const missingCounterparty = split
    ? shares.some((s) => Number(s.amount) > 0 && s.party === "")
    : false;
  const shareError = split && (participantsSum <= 0 || ownerShare <= 0 || missingCounterparty);
  const noCounterparties = (data?.counterparties.length ?? 0) === 0;

  function updateShare(index: number, patch: Partial<PShare>) {
    setShares(shares.map((row, j) => (j === index ? { ...row, ...patch } : row)));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (data === null || !cat || !account || !amount) return;
    setBusy(true);
    try {
      const payloadShares =
        isExpense && split
          ? shares
              .filter((s) => Number(s.amount) > 0 && s.party !== "")
              .map((s) => ({
                counterpartyId: s.party,
                amountToman: s.amount,
              }))
          : undefined;
      const payload = {
        amountToman: amount,
        categoryId: cat,
        assetKind: "BANK" as const,
        assetId: account,
        ...(desc.trim() ? { description: desc.trim() } : {}),
        ...(payloadShares !== undefined && payloadShares.length > 0
          ? { shares: payloadShares }
          : {}),
      };
      if (isExpense) await createExpense(payload);
      else await createIncome(payload);
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  const ready = data !== null && endpoints.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
      title={isExpense ? "ثبت هزینه" : "ثبت درآمد"}
      description={
        isExpense ? "افزودن هزینه به دفتر مالی این ماه" : "افزودن درآمد به دفتر مالی این ماه"
      }
    >
      {data === null ? (
        <p className="text-sm text-muted">در حال بارگذاری…</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          {noAccount ? (
            <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
              برای ثبت تراکنش ابتدا یک حساب بانکی بسازید.
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="tx-cat">دسته‌بندی</Label>
            <Select
              id="tx-cat"
              required
              placeholder="انتخاب…"
              options={data.categories.map((category) => ({
                value: category.id,
                label: category.name,
              }))}
              value={cat}
              onChange={(event) => setCat(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tx-asset">حساب بانکی</Label>
            <Select
              id="tx-asset"
              required
              placeholder="انتخاب…"
              options={endpoints}
              value={account}
              onChange={(event) => setAccount(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tx-amount">مبلغ (تومان)</Label>
            <MoneyInput
              id="tx-amount"
              value={amount}
              onChange={setAmount}
              required
              className={moneyInputClass}
            />
          </div>
          {isExpense ? (
            <>
              <label
                className={cn(
                  "flex items-center gap-2 text-sm",
                  noCounterparties ? "cursor-not-allowed text-muted" : "cursor-pointer",
                )}
              >
                <input
                  type="checkbox"
                  checked={split}
                  disabled={noCounterparties}
                  onChange={(event) => setSplit(event.target.checked)}
                  className="size-4 accent-primary"
                />
                هزینه مشترک (تقسیم بین طرف حساب‌ها)
              </label>
              {noCounterparties ? (
                <p className="rounded-lg border border-input bg-background/40 px-3 py-2 text-xs text-muted">
                  برای تقسیم هزینه، ابتدا از بخش «طرف حساب‌ها» یک طرف حساب بسازید؛ شرکت‌کننده هزینه
                  مشترک فقط از طرف حساب‌های شما انتخاب می‌شود.
                </p>
              ) : null}
              {split ? (
                <div className="flex flex-col gap-3 rounded-lg border border-input bg-background/40 p-3">
                  {shares.map((s, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-2 border-b border-input pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs" htmlFor={`tx-share-party-${i}`}>
                          طرف حساب
                        </Label>
                        <Select
                          id={`tx-share-party-${i}`}
                          required
                          placeholder="انتخاب طرف حساب…"
                          value={s.party}
                          options={data.counterparties.map((c) => ({
                            value: c.id,
                            label: c.name,
                          }))}
                          onChange={(event) => updateShare(i, { party: event.target.value })}
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="min-w-0 flex-1">
                          <Label className="text-xs" htmlFor={`tx-share-${i}`}>
                            سهم (تومان)
                          </Label>
                          <MoneyInput
                            id={`tx-share-${i}`}
                            className={`${moneyInputClass} mt-1.5`}
                            placeholder="سهم"
                            value={s.amount}
                            onChange={(value) => updateShare(i, { amount: value })}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="حذف شرکت‌کننده"
                          onClick={() => setShares(shares.filter((_, j) => j !== i))}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShares([...shares, { ...blankShare }])}
                    >
                      + افزودن شرکت‌کننده
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSplit(false)}>
                      لغو تقسیم
                    </Button>
                  </div>
                  {shareError ? (
                    <span className="text-xs text-danger">
                      {missingCounterparty
                        ? "برای هر سهمِ دارای مبلغ، یک طرف حساب از فهرست انتخاب کنید."
                        : "سهم‌ها باید مثبت باشند و مجموع آن‌ها کمتر از مبلغ کل."}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="tx-desc">توضیح (اختیاری)</Label>
            <Input
              id="tx-desc"
              value={desc}
              onChange={(event) => setDesc(event.target.value)}
              maxLength={200}
            />
          </div>
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              انصراف
            </Button>
            <Button
              type="submit"
              variant={isExpense ? "destructive" : "default"}
              disabled={busy || !ready || !cat || !account || !amount || shareError}
            >
              {busy ? "در حال ثبت…" : isExpense ? "ثبت هزینه" : "ثبت درآمد"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

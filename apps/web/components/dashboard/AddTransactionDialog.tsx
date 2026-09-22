"use client";

import { useEffect, useMemo, useState } from "react";
import type { AssetKind, BankAccountDto, CategoryDto, FundDto } from "@batool/types";
import { ApiClientError } from "@/lib/api/client";
import { listActiveCategories } from "@/lib/api/categories";
import { listBankAccounts, listFunds } from "@/lib/api/finance";
import { createExpense, createIncome } from "@/lib/api/transactions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Select } from "@/components/ui/select";

interface Data {
  accounts: BankAccountDto[];
  funds: FundDto[];
  categories: CategoryDto[];
}

/**
 * ثبت سریع درآمد/هزینه از داخل داشبورد. Form closes after a successful save;
 * the parent refreshes the summary via `onSaved`.
 */
export function AddTransactionDialog({
  type,
  onClose,
  onSaved,
}: {
  type: "INCOME" | "EXPENSE" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isExpense = type === "EXPENSE";
  const open = type !== null;
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cat, setCat] = useState("");
  const [asset, setAsset] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setData(null);
    setLoadError(null);
    setCat("");
    setAsset("");
    setAmount("");
    setDesc("");
    setError(null);
    let active = true;
    Promise.all([listBankAccounts(), listFunds(), listActiveCategories(type)])
      .then(([accounts, funds, categories]) => {
        if (!active) return;
        setData({ accounts, funds, categories });
        if (accounts.length === 0 && funds.length === 0) {
          setLoadError("برای ثبت، ابتدا یک حساب یا صندوق بسازید.");
        }
      })
      .catch((cause) => {
        if (active) {
          setLoadError(cause instanceof ApiClientError ? cause.message : "خطا در بارگذاری");
        }
      });
    return () => {
      active = false;
    };
  }, [open, type]);

  const endpoints = useMemo(
    () => [
      ...(data?.accounts.map((account) => ({
        value: `BANK|${account.id}`,
        label: `حساب: ${account.name}`,
      })) ?? []),
      ...(data?.funds.map((fund) => ({
        value: `FUND|${fund.id}`,
        label: `صندوق: ${fund.name}`,
      })) ?? []),
    ],
    [data],
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (data === null || !cat || !asset || !amount) return;
    setBusy(true);
    setError(null);
    try {
      const split = asset.indexOf("|");
      const payload = {
        amountToman: amount,
        categoryId: cat,
        assetKind: asset.slice(0, split) as AssetKind,
        assetId: asset.slice(split + 1),
        ...(desc ? { description: desc } : {}),
      };
      if (isExpense) await createExpense(payload);
      else await createIncome(payload);
      onSaved();
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "ثبت ناموفق بود");
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
        <p className="text-sm text-muted">{loadError ?? "در حال بارگذاری…"}</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          {loadError !== null ? (
            <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
              {loadError}
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="tx-cat">دسته‌بندی</Label>
            <Select
              id="tx-cat"
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
            <Label htmlFor="tx-asset">حساب / صندوق</Label>
            <Select
              id="tx-asset"
              placeholder="انتخاب…"
              options={endpoints}
              value={asset}
              onChange={(event) => setAsset(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tx-amount">مبلغ (تومان)</Label>
            <MoneyInput
              id="tx-amount"
              value={amount}
              onChange={setAmount}
              required
              className="h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tx-desc">توضیح (اختیاری)</Label>
            <Input id="tx-desc" value={desc} onChange={(event) => setDesc(event.target.value)} maxLength={200} />
          </div>
          {error !== null ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              انصراف
            </Button>
            <Button
              type="submit"
              variant={isExpense ? "destructive" : "default"}
              disabled={busy || !ready || !cat || !asset || !amount}
            >
              {busy ? "در حال ثبت…" : isExpense ? "ثبت هزینه" : "ثبت درآمد"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
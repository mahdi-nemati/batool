"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, CirclePlus, Power, Tag } from "lucide-react";
import type { CategoryDto, CategoryType } from "@batool/types";
import { ApiClientError } from "@/lib/api/client";
import { createCategory, listAllCategories, updateCategory } from "@/lib/api/categories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

export function CategoryManager() {
  const [rows, setRows] = useState<CategoryDto[] | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("EXPENSE");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    try {
      setRows(await listAllCategories());
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "خطا در بارگذاری");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await createCategory({ name, type });
      setName("");
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  async function onRename(c: CategoryDto) {
    setError(null);
    try {
      await updateCategory(c.id, { name: drafts[c.id] ?? c.name });
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "خطا");
    }
  }

  async function onToggle(c: CategoryDto) {
    setError(null);
    try {
      await updateCategory(c.id, { isActive: !c.isActive });
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "خطا");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm text-muted">مدیریت</p>
        <h1 className="text-3xl font-bold">دسته‌بندی‌ها</h1>
        <p className="mt-1 text-sm text-muted">دسته‌های درآمد و هزینه برای تراکنش‌ها</p>
      </header>

      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CirclePlus className="size-4 text-primary" aria-hidden />
            دسته‌بندی جدید
          </CardTitle>
          <CardDescription>بعد از افزودن، در فرم‌های تراکنش در دسترس خواهد بود.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="flex flex-wrap items-end gap-3">
            <div className="min-w-40 flex-1 space-y-1.5">
              <Label htmlFor="ct-name">نام دسته‌بندی</Label>
              <Input
                id="ct-name"
                placeholder="مثلاً خوراک، اجاره، حقوق"
                maxLength={40}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="min-w-36 space-y-1.5">
              <Label htmlFor="ct-type">نوع</Label>
              <Select
                id="ct-type"
                options={[
                  { value: "EXPENSE", label: "هزینه" },
                  { value: "INCOME", label: "درآمد" },
                ]}
                value={type}
                onChange={(e) => setType(e.target.value as CategoryType)}
              />
            </div>
            <Button type="submit" disabled={busy} className="items-end">
              {busy ? "…" : "افزودن"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="size-4 text-primary" aria-hidden />
            فهرست دسته‌بندی‌ها
          </CardTitle>
          <CardDescription>با ذخیره، نام دسته تغییر می‌کند.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows === null ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="دسته‌ای ثبت نشده است"
              description="اولین دسته درآمد یا هزینه را بسازید."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {rows.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2 py-3 text-sm">
                  <Badge
                    variant={c.type === "INCOME" ? "success" : "destructive"}
                    className="shrink-0"
                  >
                    {c.type === "INCOME" ? "درآمد" : "هزینه"}
                  </Badge>
                  <Input
                    className={cn("max-w-56", !c.isActive && "opacity-50")}
                    maxLength={40}
                    value={drafts[c.id] ?? c.name}
                    onChange={(e) => setDrafts({ ...drafts, [c.id]: e.target.value })}
                  />
                  {c.isSystem ? (
                    <span className="text-xs text-muted-foreground">سیستمی</span>
                  ) : null}
                  {!c.isActive ? (
                    <span className="text-xs text-danger">غیرفعال</span>
                  ) : null}
                  <div className="mr-auto flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => onRename(c)}>
                      <Check className="size-3.5" aria-hidden />
                      ذخیره
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => onToggle(c)}>
                      <Power className="size-3.5" aria-hidden />
                      {c.isActive ? "غیرفعال کردن" : "فعال کردن"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

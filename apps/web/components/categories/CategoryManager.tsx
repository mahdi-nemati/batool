"use client";

import { useCallback, useEffect, useState } from "react";
import type { CategoryDto, CategoryType } from "@batool/types";
import { ApiClientError } from "@/lib/api/client";
import { createCategory, listAllCategories, updateCategory } from "@/lib/api/categories";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-accent";
const labelClass = "mb-1 block text-sm text-muted";

export function CategoryManager() {
  const [rows, setRows] = useState<CategoryDto[]>([]);
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
      <h1 className="text-2xl font-bold">مدیریت دسته‌بندی‌ها</h1>
      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={onCreate}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-panel p-5"
      >
        <div className="min-w-40 flex-1">
          <label className={labelClass}>نام دسته‌بندی</label>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            required
          />
        </div>
        <div>
          <label className={labelClass}>نوع</label>
          <select
            className={inputClass}
            value={type}
            onChange={(e) => setType(e.target.value as CategoryType)}
          >
            <option value="EXPENSE">هزینه</option>
            <option value="INCOME">درآمد</option>
          </select>
        </div>
        <button
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 font-bold text-white disabled:opacity-60"
        >
          {busy ? "…" : "افزودن"}
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {rows.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-2 rounded-xl border border-line bg-panel px-4 py-2"
          >
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${c.type === "INCOME" ? "bg-accent/10 text-accent-dark" : "bg-danger/10 text-danger"}`}
            >
              {c.type === "INCOME" ? "درآمد" : "هزینه"}
            </span>
            <input
              className={`${inputClass} max-w-56 ${c.isActive ? "" : "opacity-50"}`}
              value={drafts[c.id] ?? c.name}
              onChange={(e) => setDrafts({ ...drafts, [c.id]: e.target.value })}
              maxLength={40}
            />
            {c.isSystem ? <span className="text-xs text-muted">سیستمی</span> : null}
            {!c.isActive ? <span className="text-xs text-danger">غیرفعال</span> : null}
            <div className="mr-auto flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-line px-3 py-1 text-sm"
                onClick={() => onRename(c)}
              >
                ذخیره
              </button>
              <button
                type="button"
                className="rounded-lg border border-line px-3 py-1 text-sm"
                onClick={() => onToggle(c)}
              >
                {c.isActive ? "غیرفعال کردن" : "فعال کردن"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

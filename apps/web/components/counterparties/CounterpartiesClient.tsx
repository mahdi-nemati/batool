"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Link2, Plus, Scale, Search, UserRound, Users, UserPlus } from "lucide-react";
import type { ConnectionDto, CounterpartyDto, DebtSummaryDto, PaginationMeta } from "@batool/types";
import { ApiClientError } from "@/lib/api/client";
import {
  connectUser,
  createExternalCounterparty,
  debtSummary,
  listConnections,
  listCounterparties,
  updateCounterparty,
} from "@/lib/api/debts";
import { formatJalaliDate } from "@/lib/formatting/jalali";
import { formatTomanUnit } from "@/lib/formatting/persian";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { HoverCard } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

const wholeFormat = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });
const COUNTERPARTY_PAGE_SIZE = 20;

export function CounterpartiesClient() {
  const [counterparties, setCps] = useState<CounterpartyDto[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [connections, setConns] = useState<ConnectionDto[]>([]);
  const [summary, setSummary] = useState<DebtSummaryDto | null>(null);
  const [form, setForm] = useState<"external" | "connect" | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const closeForm = () => setForm(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cps, conns, sum] = await Promise.all([
        listCounterparties(page, COUNTERPARTY_PAGE_SIZE, search),
        listConnections(),
        debtSummary(),
      ]);
      setCps(cps.data);
      setPagination(cps.meta);
      setConns(conns);
      setSummary(sum);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    reload().catch((e) => setError(e instanceof ApiClientError ? e.message : "خطا در بارگذاری"));
  }, [reload]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  async function onToggleArchive(cp: CounterpartyDto) {
    setError(null);
    try {
      await updateCounterparty(cp.id, { archived: !cp.archived });
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "خطا");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm text-muted">روابط مالی</p>
        <h1 className="text-3xl font-bold">طرف‌حساب‌ها</h1>
        <p className="mt-1 text-sm text-muted">طلب‌ها، بدهی‌ها و اشخاص متصل</p>
      </header>

      {summary !== null ? (
        <section className="grid gap-4 sm:grid-cols-3">
          <Stat
            title="طلب من"
            value={formatTomanUnit(summary.totalReceivableToman)}
            tone="positive"
          />
          <Stat
            title="بدهی من"
            value={formatTomanUnit(summary.totalPayableToman)}
            tone="negative"
          />
          <Stat
            title="خالص"
            value={
              formatTomanUnit(Math.abs(summary.netToman)) +
              (summary.netToman >= 0 ? " (طلب)" : " (بدهی)")
            }
            tone="neutral"
          />
        </section>
      ) : null}

      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {/* Actions: every creation form lives in a modal, like the Assets and Setar pages. */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setForm("external")}>
          <UserPlus aria-hidden /> طرف حساب جدید
        </Button>
        <Button variant="outline" onClick={() => setForm("connect")}>
          <Link2 aria-hidden /> اتصال به کاربر بتول
        </Button>
      </div>

      <Dialog
        open={form === "external"}
        onOpenChange={(value) => {
          if (!value) closeForm();
        }}
        title="طرف حساب جدید"
        description="یک شخص یا کسب‌وکار بدون حساب بتول."
      >
        <NewCounterpartyForm onDone={reload} onSaved={closeForm} />
      </Dialog>

      <Dialog
        open={form === "connect"}
        onOpenChange={(value) => {
          if (!value) closeForm();
        }}
        title="اتصال به کاربر بتول"
        description="با نام کاربری در همین سامانه ارتباط برقرار کنید."
      >
        <ConnectUserForm onDone={reload} onSaved={closeForm} connections={connections} />
      </Dialog>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4 text-primary" aria-hidden />
              فهرست طرف‌حساب‌ها
            </CardTitle>
            <CardDescription>
              برای دیدن جزئیات روی هر شخص ضربه بزنید. جست‌وجو با نام طرف‌حساب یا نام کاربری اعضای
              بتول انجام می‌شود.
            </CardDescription>
          </div>
          <Badge variant="secondary">{wholeFormat.format(pagination?.total ?? 0)} مورد</Badge>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <label htmlFor="counterparty-search" className="sr-only">
              جست‌وجوی طرف‌حساب
            </label>
            <Input
              id="counterparty-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="جست‌وجو با نام یا نام کاربری…"
              startAddon={<Search className="size-4" aria-hidden />}
            />
          </div>

          {loading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : counterparties.length === 0 ? (
            <EmptyState
              icon={Users}
              title={search.length > 0 ? "نتیجه‌ای پیدا نشد" : "هنوز طرف حسابی ندارید"}
              description={
                search.length > 0
                  ? "نام یا نام کاربری دیگری را جست‌وجو کنید."
                  : "با افزودن طرف حساب خارجی یا اتصال یک کاربر بتول، روابط مالی خود را مدیریت کنید."
              }
            />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {counterparties.map((cp) => (
                <li
                  key={cp.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <CounterpartyName cp={cp} />
                    <span className="block truncate text-xs text-muted">
                      {cp.kind === "USER" ? `کاربر: @${cp.linkedUsername}` : "خارجی"}
                      {cp.archived ? " · بایگانی‌شده" : ""}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <DebtBadge cp={cp} />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onToggleArchive(cp)}
                    >
                      {cp.archived ? "بازگردانی" : "بایگانی"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {pagination !== null && pagination.total > pagination.pageSize ? (
            <Pagination
              className="mt-4"
              meta={pagination}
              onPageChange={setPage}
              label="صفحه‌بندی طرف‌حساب‌ها"
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function NewCounterpartyForm({
  onDone,
  onSaved,
}: {
  onDone: () => Promise<void>;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await createExternalCounterparty(name);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "خطا");
      return;
    } finally {
      setBusy(false);
    }
    setName("");
    onSaved();
    await onDone().catch(() => undefined);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="cp-name">نام</Label>
        <Input
          id="cp-name"
          data-autofocus
          placeholder="مثلاً آقای رضایی"
          maxLength={60}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSaved}>
          انصراف
        </Button>
        <Button type="submit" disabled={busy}>
          <Plus aria-hidden />
          {busy ? "در حال افزودن…" : "افزودن"}
        </Button>
      </div>
    </form>
  );
}

function ConnectUserForm({
  onDone,
  onSaved,
  connections,
}: {
  onDone: () => Promise<void>;
  onSaved: () => void;
  connections: ConnectionDto[];
}) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await connectUser(username);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "خطا");
      return;
    } finally {
      setBusy(false);
    }
    setUsername("");
    onSaved();
    await onDone().catch(() => undefined);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {error !== null ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="cp-username">نام کاربری</Label>
        <Input
          id="cp-username"
          data-autofocus
          dir="ltr"
          placeholder="username"
          maxLength={20}
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSaved}>
          انصراف
        </Button>
        <Button type="submit" disabled={busy}>
          <Link2 aria-hidden />
          {busy ? "در حال اتصال…" : "ارتباط"}
        </Button>
      </div>
      {connections.length > 0 ? (
        <p className="flex flex-wrap items-center gap-1 border-t border-border pt-3 text-sm text-muted">
          متصل:
          {connections.map((c) => (
            <Badge key={c.id} variant="secondary">
              {c.username}
            </Badge>
          ))}
        </p>
      ) : null}
    </form>
  );
}

function CounterpartyName({ cp }: { cp: CounterpartyDto }) {
  const link = (
    <Link
      href={`/dashboard/counterparties/${cp.id}`}
      className="block truncate font-bold text-primary hover:underline"
    >
      {cp.name}
    </Link>
  );

  // اعضای بتول get a read-only preview on hover/focus; external parties have nothing to preview.
  if (cp.kind !== "USER") return link;

  return (
    <HoverCard label={`خلاصه‌ی ${cp.name}`} content={<MemberPreview cp={cp} />}>
      {link}
    </HoverCard>
  );
}

function MemberPreview({ cp }: { cp: CounterpartyDto }) {
  const settled = cp.direction === "SETTLED";
  const owesMe = cp.direction === "OWES_ME";
  const status = settled
    ? "تسویه‌شده"
    : owesMe
      ? `${cp.name} به شما بدهکار است`
      : `شما به ${cp.name} بدهکارید`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold text-foreground">{cp.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted" dir="ltr">
            @{cp.linkedUsername ?? "—"}
          </p>
        </div>
        <Badge variant="brand" className="flex shrink-0 items-center gap-1">
          <UserRound className="size-3" aria-hidden />
          عضو بتول
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
          <Scale className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{status}</span>
        </span>
        {!settled ? (
          <span
            className={cn(
              "shrink-0 text-xs font-semibold tabular-nums",
              owesMe ? "text-accent-dark" : "text-danger",
            )}
          >
            {formatTomanUnit(cp.outstandingToman)}
          </span>
        ) : null}
      </div>

      <p className="flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted">
        <span>ارتباط از {formatJalaliDate(cp.createdAt)}</span>
        <span className="truncate">برای جزئیات روی نام بزنید</span>
      </p>

      {cp.archived ? <p className="text-xs text-muted">این طرف‌حساب بایگانی شده است.</p> : null}
    </div>
  );
}

function DebtBadge({ cp }: { cp: CounterpartyDto }) {
  if (cp.direction === "SETTLED") {
    return <Badge variant="secondary">تسویه</Badge>;
  }
  const owesMe = cp.direction === "OWES_ME";
  return (
    <Badge variant={owesMe ? "success" : "destructive"}>
      {owesMe ? "به من بدهکار" : "من بدهکار"} · {formatTomanUnit(cp.outstandingToman)}
    </Badge>
  );
}

function Stat({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "positive" | "negative" | "neutral";
}) {
  return (
    <Card className="p-6">
      <p className="text-sm text-muted">{title}</p>
      <p
        className={cn(
          "mt-1 text-lg font-bold",
          tone === "positive"
            ? "text-accent-dark"
            : tone === "negative"
              ? "text-danger"
              : "text-ink",
        )}
      >
        {value}
      </p>
    </Card>
  );
}

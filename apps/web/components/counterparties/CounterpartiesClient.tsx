"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Link2, Plus, Users, UserPlus } from "lucide-react";
import type { CounterpartyDto, ConnectionDto, DebtSummaryDto } from "@batool/types";
import { ApiClientError } from "@/lib/api/client";
import {
  connectUser,
  createExternalCounterparty,
  debtSummary,
  listConnections,
  listCounterparties,
  updateCounterparty,
} from "@/lib/api/debts";
import { formatTomanUnit } from "@/lib/formatting/persian";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

const wholeFormat = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });

export function CounterpartiesClient() {
  const [counterparties, setCps] = useState<CounterpartyDto[]>([]);
  const [connections, setConns] = useState<ConnectionDto[]>([]);
  const [summary, setSummary] = useState<DebtSummaryDto | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [cps, conns, sum] = await Promise.all([
      listCounterparties(),
      listConnections(),
      debtSummary(),
    ]);
    setCps(cps);
    setConns(conns);
    setSummary(sum);
  }, []);

  useEffect(() => {
    reload()
      .catch((e) => setError(e instanceof ApiClientError ? e.message : "خطا در بارگذاری"))
      .finally(() => setLoading(false));
  }, [reload]);

  async function onExternal(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createExternalCounterparty(name);
      setName("");
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "خطا");
    }
  }

  async function onConnect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await connectUser(username);
      setUsername("");
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "خطا");
    }
  }

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
          <Stat title="بدهی من" value={formatTomanUnit(summary.totalPayableToman)} tone="negative" />
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

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="size-4 text-primary" aria-hidden />
              طرف حساب جدید (خارجی)
            </CardTitle>
            <CardDescription>یک شخص یا کسب‌وکار بدون حساب بتول.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onExternal} className="flex flex-col gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cp-name">نام</Label>
                <Input
                  id="cp-name"
                  placeholder="مثلاً آقای رضایی"
                  maxLength={60}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <Button type="submit" className="self-start gap-1.5">
                <Plus className="size-4" aria-hidden />
                افزودن
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="size-4 text-primary" aria-hidden />
              اتصال به کاربر بتول
            </CardTitle>
            <CardDescription>با نام کاربری در همین سامانه ارتباط برقرار کنید.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onConnect} className="flex flex-col gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cp-username">نام کاربری</Label>
                <Input
                  id="cp-username"
                  dir="ltr"
                  placeholder="username"
                  maxLength={20}
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <Button type="submit" className="self-start">
                ارتباط
              </Button>
              {connections.length > 0 ? (
                <p className="flex flex-wrap items-center gap-1 text-sm text-muted">
                  متصل:
                  {connections.map((c) => (
                    <Badge key={c.id} variant="secondary">
                      {c.username}
                    </Badge>
                  ))}
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4 text-primary" aria-hidden />
              فهرست طرف‌حساب‌ها
            </CardTitle>
            <CardDescription>برای دیدن جزئیات روی هر شخص ضربه بزنید.</CardDescription>
          </div>
          <Badge variant="secondary">{wholeFormat.format(counterparties.length)} مورد</Badge>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : counterparties.length === 0 ? (
            <EmptyState
              icon={Users}
              title="هنوز طرف حسابی ندارید"
              description="با افزودن طرف حساب خارجی یا اتصال یک کاربر بتول، روابط مالی خود را مدیریت کنید."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {counterparties.map((cp) => (
                <li key={cp.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/counterparties/${cp.id}`}
                      className="block truncate font-bold text-primary hover:underline"
                    >
                      {cp.name}
                    </Link>
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
        </CardContent>
      </Card>
    </div>
  );
}

function DebtBadge({ cp }: { cp: CounterpartyDto }) {
  if (cp.direction === "SETTLED") {
    return <Badge variant="secondary">تسویه</Badge>;
  }
  const owesMe = cp.direction === "OWES_ME";
  return (
    <Badge className={owesMe ? "bg-accent/10 text-accent-dark" : "bg-danger/10 text-danger"}>
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
          tone === "positive" ? "text-accent-dark" : tone === "negative" ? "text-danger" : "text-ink",
        )}
      >
        {value}
      </p>
    </Card>
  );
}
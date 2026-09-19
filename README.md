# بتول / Batool

**Batool** — یک اپلیکیشن وب فارسی (RTL) برای مدیریت دارایی و امور مالی شخصی.
A Persian, RTL personal asset & finance management app.

Monorepo: **Bun workspaces** · **Next.js** (web) · **NestJS** (api) · **PostgreSQL + Prisma** (database) · **Docker Compose**.

> Status: **Phases 0–6 complete.** Foundation + Authentication + Financial Core +
> Income/Expense/Categories + Counterparties & Debts + recurring monthly
> Installments + Gold/USD trading are in place, plus the **Phase 7 Setar** module:
> a fixed 4-session tuition cycle whose payments create a real Phase‑3 Expense +
> ledger movement atomically (server-determined amount, immutable payment
> snapshots, concurrency-safe via a per-profile lock + unique cycle constraint).
> Dashboard/statistics arrive in a later phase.

## Structure

```
apps/
  api/          NestJS API  (dev: bun --watch, runs from source)
  web/          Next.js App Router (Tailwind v4, RTL, Persian)
packages/
  database/     Prisma schema + generated client (single source of truth)
  types/        Shared cross-cutting types (API envelope, ErrorCode)
  config/       Shared env helpers + tsconfig base
docker/         API & web Dockerfiles (optional full-stack profile)
docker-compose.yml
```

## Prerequisites

- [Bun](https://bun.sh) `1.3.x`
- Docker + Docker Compose (for PostgreSQL)

## Setup

```bash
# 1. Install workspace dependencies
bun install

# 2. Start PostgreSQL (host port 5434)
docker compose up -d postgres

# 3. Environment files
cp apps/api/.env.example apps/api/.env
cp packages/database/.env.example packages/database/.env
cp apps/web/.env.example apps/web/.env.local

# 4. Generate the Prisma client + apply migrations
bun run db:generate
bun run db:migrate      # creates the initial migration (Phase 0 has no models)

# 5. Run both apps (api on :4000, web on :3000)
bun run dev
```

- Web: http://localhost:3000
- API health: http://localhost:4000/api/health
- API readiness (DB): http://localhost:4000/api/health/ready

## Scripts (root)

| Script                | Purpose                           |
| --------------------- | --------------------------------- |
| `bun run dev`         | Run api + web in parallel         |
| `bun run build`       | Typecheck api, then build web     |
| `bun run typecheck`   | TypeScript checks across packages |
| `bun run lint`        | ESLint                            |
| `bun run format`      | Prettier write                    |
| `bun run db:generate` | `prisma generate`                 |
| `bun run db:migrate`  | `prisma migrate dev`              |
| `bun run db:deploy`   | `prisma migrate deploy`           |
| `bun run db:status`   | `prisma migrate status`           |
| `bun run db:reset`    | Reset DB (drop + migrate)         |
| `bun run db:seed`     | Run seed                          |

## Full-stack Docker (optional)

```bash
docker compose --profile app up --build
```

## Conventions & financial rules (locked for the MVP)

- **Toman is the only Toman-currency unit** — no Rial, no conversion.
- Monetary amounts are stored **exactly**: Toman as integer (`BigInt`), Gold/USD as
  `Decimal` with fixed scale. Never JS floats.
- **Balances are derived from financial events**; the API rejects any operation that
  would drive an asset negative. Multi-record writes run in a Prisma `$transaction`.
- `Expense`, `Income`, `Transfer`, `Debt Event`, `Debt Settlement` and `Split Expense`
  stay as **distinct domain concepts** — never collapsed into one generic table.
- Gold and USD wallets exist by default, cannot be deleted, and are **never valued in
  Toman**.
- Dates are stored as UTC and rendered in the UI as **Jalali/Shamsi** via `Intl` `fa-IR`
  at the presentation boundary.

## Roadmap

Phase 0 (foundation) ✅ · Phase 1 (auth/users) ✅ · Phase 2 (financial core) ✅ ·
Phase 3 (income/expense/categories) ✅ · Phase 4 (counterparties/debts) ✅ ·
Phase 5 (installments) ✅ · Phase 6 (gold/USD) ✅ · Phase 7 (setar) ✅ ·
Phase 8 (dashboard/statistics) · Phase 9 (polish).

# syntax=docker/dockerfile:1
FROM oven/bun:1.3.14 AS base
WORKDIR /app

# Install workspace dependencies from manifests only (better layer caching).
FROM base AS deps
COPY package.json bunfig.toml ./
COPY apps/api/package.json apps/api/
COPY packages/config/package.json packages/config/
COPY packages/types/package.json packages/types/
COPY packages/database/package.json packages/database/
RUN bun install --frozen-lockfile || bun install

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=4000
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate the Prisma client (schema has no models in Phase 0; still emits the
# client engine + $queryRaw accessors used by the readiness probe).
RUN cd packages/database && bunx --bun prisma generate

WORKDIR /app/apps/api
EXPOSE 4000
CMD ["bun", "src/main.ts"]

# syntax=docker/dockerfile:1
FROM oven/bun:1.3.14 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bunfig.toml ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/config/package.json packages/config/
COPY packages/types/package.json packages/types/
COPY packages/database/package.json packages/database/
RUN bun install --frozen-lockfile || bun install

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_ORIGIN=http://localhost:4000/api
ENV NEXT_PUBLIC_API_ORIGIN=$NEXT_PUBLIC_API_ORIGIN
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd apps/web && bun run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Next.js standalone output keeps the runtime image small.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["bun", "apps/web/server.js"]

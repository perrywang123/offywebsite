# Multi-stage build for a self-hostable standalone Next.js server.
# Builds with Turbopack (`next build --turbopack`) + `output: "standalone"`.

FROM node:20-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:20-slim AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 nextjs \
  && mkdir -p /data \
  && chown nextjs:nodejs /data

# Standalone server + static assets + migration files.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/db/migrations ./db/migrations
COPY --from=builder --chown=nextjs:nodejs /app/db/migrate.mjs ./db/migrate.mjs

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0 DATABASE_URL=/data/offy.db

# Apply migrations, then serve.
CMD ["sh", "-c", "node db/migrate.mjs && exec node server.js"]

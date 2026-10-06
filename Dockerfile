# Multi-stage build for a self-hostable standalone Next.js server.
# Builds with Turbopack (`next build --turbopack`) + `output: "standalone"`.

FROM node:22-slim AS deps
WORKDIR /app
RUN corepack enable
# better-sqlite3 ships a binding.gyp and is allow-listed in pnpm.onlyBuiltDependencies,
# so pnpm runs `node-gyp rebuild` for it, which aborts with "Could not find any Python
# installation to use" because the slim image has no toolchain. Build-only: the runner
# stage below stays toolchain-free.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-slim AS builder
WORKDIR /app
RUN corepack enable
# `corepack enable` 只是装了个 shim:真正执行 `pnpm` 时它才去 registry.npmjs.org 现拉
# 对应版本的 pnpm。deps 阶段已经拉过一次(那份缓存落在 /root/.cache/node/corepack),
# 但每个 stage 的文件系统是独立的,所以 builder 里会**再拉一次** —— 构建机上 DNS 被
# 污染或出网被重置时就直接 ECONNRESET 构建失败(本次真实踩到)。把 deps 那份缓存复制
# 过来,构建期就完全不再依赖外网。
COPY --from=deps /root/.cache/node/corepack /root/.cache/node/corepack
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 构建期环境:`next build` 会预渲染 /products、/collections 与首页,拿不到这些
# 变量就会把**本地兜底目录**烤进 ISR 缓存 —— 现象是刚部署完商品数不对、系列名
# 是本地占位名,要等 60s revalidate 才自愈。这里传进来就一次到位。
# 只放**可公开**的值:Storefront token 本身就是面向浏览器的公开令牌;
# STRIPE_SECRET_KEY / SHOPIFY_ADMIN_TOKEN 绝不进构建参数(会留在镜像 history 里),
# 它们是纯运行时的,由 compose 的 environment 注入。
ARG SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_SITE_NAME=Offy
ARG NEXT_PUBLIC_SITE_URL=https://offy.example.com
ARG SHOPIFY_STORE_DOMAIN=""
ARG SHOPIFY_STOREFRONT_TOKEN=""
ARG SHOPIFY_API_VERSION=2026-07
ARG SHOPIFY_MARKET_COUNTRY=US
ENV SITE_URL=$SITE_URL \
    NEXT_PUBLIC_SITE_NAME=$NEXT_PUBLIC_SITE_NAME \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    SHOPIFY_STORE_DOMAIN=$SHOPIFY_STORE_DOMAIN \
    SHOPIFY_STOREFRONT_TOKEN=$SHOPIFY_STOREFRONT_TOKEN \
    SHOPIFY_API_VERSION=$SHOPIFY_API_VERSION \
    SHOPIFY_MARKET_COUNTRY=$SHOPIFY_MARKET_COUNTRY
RUN pnpm build
# `next build` traces only what the server entrypoint reaches, so drizzle-orm —
# imported by db/migrate.mjs, which CMD runs before the server — is missing from
# the standalone output. Stage a dereferenced copy for the runner to drop in.
# drizzle-orm declares no runtime dependencies of its own.
RUN mkdir -p /migrate-deps \
  && cp -rL node_modules/drizzle-orm /migrate-deps/drizzle-orm

FROM node:22-slim AS runner
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
# Standalone output omits drizzle-orm (see the builder stage note); add it back so
# db/migrate.mjs resolves before the server starts.
COPY --from=builder --chown=nextjs:nodejs /migrate-deps/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder --chown=nextjs:nodejs /app/db/migrations ./db/migrations
COPY --from=builder --chown=nextjs:nodejs /app/db/migrate.mjs ./db/migrate.mjs

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0 DATABASE_URL=/data/offy.db

# Apply migrations, then serve.
CMD ["sh", "-c", "node db/migrate.mjs && exec node server.js"]

#!/usr/bin/env bash
# One-click deploy to a remote Linux server.
#
# Syncs the SOURCE to the server and builds the Docker image there, so native
# modules (better-sqlite3) are compiled for Linux. Requires: rsync + ssh +
# docker compose on the server.
#
# Usage:
#   DEPLOY_SERVER=root@1.2.3.4 DEPLOY_DIR=/opt/offy ./scripts/deploy.sh
#   (optional) DEPLOY_ENV_FILE=.env.production ./scripts/deploy.sh
set -euo pipefail

die() { printf '\033[31m  ✗ %s\033[0m\n' "$*" >&2; exit 1; }

SERVER="${DEPLOY_SERVER:?Set DEPLOY_SERVER (e.g. root@1.2.3.4)}"
APP_DIR="${DEPLOY_DIR:-/opt/offy}"
# Copy .env.production.example → .env.production first (see docs/deployment.md).
ENV_FILE="${DEPLOY_ENV_FILE:-.env.production}"

echo "==> Syncing project to ${SERVER}:${APP_DIR}"
ssh "$SERVER" "mkdir -p $APP_DIR"
rsync -az --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude .pnpm-store \
  --exclude .pnpm-cache \
  --exclude .npm-cache \
  --exclude data \
  --exclude dist \
  --exclude .env \
  --exclude '*.db' \
  ./ "$SERVER:$APP_DIR/"

# 这里以前是 `if [ -f "$ENV_FILE" ]` —— 文件不存在就**静默跳过**,于是服务器上
# 用着上一次的 .env(或者根本没有),而部署照样"成功"。缺 SHOPIFY_* 的表现不是
# 报错,是商品目录悄悄退回本地兜底表,很难从页面上看出来。所以改成硬失败。
[ -n "$ENV_FILE" ] || die "DEPLOY_ENV_FILE 为空;设为 .env.production 或显式传空字符串跳过"
if [ ! -f "$ENV_FILE" ]; then
  die "$ENV_FILE 不存在。先执行: cp .env.production.example $ENV_FILE 并填入真实值
    (缺 SHOPIFY_* 时站点不会报错,而是静默退回本地兜底目录)"
fi

echo "==> Uploading production env ($ENV_FILE)"
scp "$ENV_FILE" "$SERVER:$APP_DIR/.env"

echo "==> Building & starting on server"
ssh "$SERVER" "cd $APP_DIR && docker compose -f docker-compose.prod.yml up -d --build"

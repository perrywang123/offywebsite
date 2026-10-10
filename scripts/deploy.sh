#!/usr/bin/env bash
# One-click deploy to a remote Linux server.
#
# Syncs the SOURCE to the server and builds the Docker image there, so native
# modules (better-sqlite3) are compiled for Linux. Requires: rsync + ssh +
# docker compose on the server.
#
# 配置默认**不经过本脚本** —— 在服务器上手工维护 .env(见下方模式 A/B)。
#
# Usage:
#   DEPLOY_SERVER=root@1.2.3.4 DEPLOY_DIR=/opt/offy ./scripts/deploy.sh
#   # 想从本地推配置时才加:
#   DEPLOY_SERVER=... DEPLOY_ENV_FILE=.env.production ./scripts/deploy.sh
set -euo pipefail

die() { printf '\033[31m  ✗ %s\033[0m\n' "$*" >&2; exit 1; }

SERVER="${DEPLOY_SERVER:?Set DEPLOY_SERVER (e.g. root@1.2.3.4)}"
APP_DIR="${DEPLOY_DIR:-/opt/offy}"
# 配置怎么传,两种模式(默认 A):
#
#   A) 服务器上已有 .env(手工粘贴)—— 什么都不用设。这是默认。
#      本脚本不碰服务器上的 .env,只同步源码;配置由服务器端负责,
#      `deploy/update.sh` 会在部署前校验它(缺失或占位值会直接失败)。
#
#   B) 从本地推上去 —— 显式指定文件:
#          DEPLOY_ENV_FILE=.env.production ./scripts/deploy.sh
#
# **真实配置永远不进 git**: `.env*` 全在 .gitignore 里,仓库只跟踪
# .env.example / .env.production.example 两个模板(内容全是占位符)。
ENV_FILE="${DEPLOY_ENV_FILE:-}"

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

if [ -n "$ENV_FILE" ]; then
  # 模式 B。以前这里是 `if [ -f "$ENV_FILE" ]` —— 文件不存在就**静默跳过**,
  # 服务器继续用旧配置而部署照样"成功"。缺 SHOPIFY_* 的表现不是报错,是商品
  # 目录悄悄退回本地兜底表,很难从页面上看出来,所以这里改成硬失败。
  [ -f "$ENV_FILE" ] || die "$ENV_FILE 不存在。
    要么先创建它: cp .env.production.example $ENV_FILE 并填入真实值
    要么走模式 A(不设 DEPLOY_ENV_FILE),配置由你在服务器上手工维护。"
  echo "==> Uploading production env ($ENV_FILE)"
  scp "$ENV_FILE" "$SERVER:$APP_DIR/.env"
else
  # 模式 A:明确说明"这次没传配置",而不是让它看起来像做了什么。
  echo "==> 未上传配置(模式 A)—— 使用服务器上现有的 $APP_DIR/.env"
  echo "    服务器端会校验它: 缺少或仍是占位值时 deploy/update.sh 会直接失败"
fi

echo "==> Building & starting on server"
ssh "$SERVER" "cd $APP_DIR && docker compose -f docker-compose.prod.yml up -d --build"

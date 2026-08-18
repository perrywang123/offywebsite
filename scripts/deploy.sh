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

if [ -n "$ENV_FILE" ] && [ -f "$ENV_FILE" ]; then
  echo "==> Uploading production env"
  scp "$ENV_FILE" "$SERVER:$APP_DIR/.env"
fi

echo "==> Building & starting on server"
ssh "$SERVER" "cd $APP_DIR && docker compose -f docker-compose.prod.yml up -d --build"

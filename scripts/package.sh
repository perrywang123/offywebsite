#!/usr/bin/env bash
# Package the app into a self-contained tarball that runs with `node server.js`.
#
# IMPORTANT: better-sqlite3 is a native module compiled for THIS platform.
#   - Deploying to a Linux server → run this script ON the server (or in CI), OR
#     use Docker (see docker-compose.prod.yml / docs/deployment.md).
#   - Deploying to the same OS/arch → this tarball works as-is.
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION="$(node -p "require('./package.json').version")"
TARBALL="dist/offy-${VERSION}.tar.gz"

echo "==> Building standalone output"
pnpm build

STAGE="dist/stage"
rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "==> Assembling bundle"
cp -R .next/standalone/. "$STAGE/"
# Next copies the local `.env` into the standalone output — strip it so the
# local dev env never ships; production env is provided at deploy time.
rm -f "$STAGE"/.env "$STAGE"/.env.local "$STAGE"/.env.development "$STAGE"/.env.production
mkdir -p "$STAGE/.next/static"
cp -R .next/static/. "$STAGE/.next/static/"
cp -R public/. "$STAGE/public/"
mkdir -p "$STAGE/db/migrations"
cp -R db/migrations/. "$STAGE/db/migrations/"
cp db/migrate.mjs "$STAGE/db/migrate.mjs"
cp scripts/start.sh "$STAGE/start.sh"
chmod +x "$STAGE/start.sh"
cp .env.example "$STAGE/.env.example"

mkdir -p dist
tar -C "$STAGE" -czf "$TARBALL" .

echo "==> Created $TARBALL"
du -h "$TARBALL"

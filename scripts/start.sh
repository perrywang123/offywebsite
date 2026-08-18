#!/usr/bin/env sh
# Entrypoint for the self-contained standalone bundle (bare-Node deploy).
set -e

# Load .env (KEY=VALUE lines) if present.
if [ -f ./.env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

# Bind host. `HOSTNAME` is often pre-set (e.g. macOS machine name), so use the
# non-reserved `HOST` for overrides and default to all interfaces.
export HOSTNAME="${HOST:-0.0.0.0}"
export PORT="${PORT:-3000}"

# Apply database migrations before serving. Skip with SKIP_MIGRATIONS=1.
if [ "${SKIP_MIGRATIONS:-0}" != "1" ]; then
  node db/migrate.mjs
fi

exec node server.js

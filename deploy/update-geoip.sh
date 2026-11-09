#!/usr/bin/env bash
# Only starts the optional database updater; never builds/restarts commerce services.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export OFFY_GEOIP_SECRET_DIR="$root/.offy-geoip.local"
mkdir -p "$OFFY_GEOIP_SECRET_DIR"
chmod 700 "$OFFY_GEOIP_SECRET_DIR"
if [[ ! -s "$OFFY_GEOIP_SECRET_DIR/account" || ! -s "$OFFY_GEOIP_SECRET_DIR/license" ]]; then
  read -r -p 'MaxMind account ID: ' account
  read -r -s -p 'MaxMind GeoLite2 download license key: ' license
  printf '\n'
  [[ "$account" =~ ^[0-9]+$ && "$license" =~ ^[a-zA-Z0-9_=-]+$ ]] || { printf 'Invalid credentials; nothing started.\n' >&2; exit 1; }
  (umask 077; printf '%s' "$account" > "$OFFY_GEOIP_SECRET_DIR/account"; printf '%s' "$license" > "$OFFY_GEOIP_SECRET_DIR/license")
  unset account license
fi
cd "$root"
docker compose --project-directory "$root" -f docker-compose.prod.yml -f deploy/docker-compose.geoip.yml up -d --no-deps geoipupdate
printf 'GeoLite2 updater started. Application and admin containers were not restarted.\n'

#!/usr/bin/env bash
# SSH stdin only; validate a private candidate before atomically replacing server .env.
set -euo pipefail
umask 077
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FLAGS=()
case "${1:-}" in --kol) FLAGS=(--kol) ;; "") ;; *) printf 'Unsupported env upload option\n' >&2; exit 1 ;; esac
command -v flock >/dev/null
exec 9> "$ROOT/.deploy.lock"
flock -x 9
INCOMING="$(mktemp "$ROOT/.env.upload.XXXXXX")"
trap 'rm -f "$INCOMING"' EXIT
cat > "$INCOMING"
chmod 600 "$INCOMING"
bash "$ROOT/deploy/update.sh" --check --env-file "$INCOMING" ${FLAGS[@]+"${FLAGS[@]}"}
if [ -f "$ROOT/.env" ]; then
 BACKUP="$ROOT/.env.offy-backup-$(date -u +%Y%m%dT%H%M%SZ)-$$.local"
 cp "$ROOT/.env" "$BACKUP"; chmod 600 "$BACKUP"
fi
mv "$INCOMING" "$ROOT/.env"
printf 'Private runtime configuration validated and installed; prior file backed up if present.\n'

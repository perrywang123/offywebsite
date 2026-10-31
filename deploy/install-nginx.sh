#!/usr/bin/env bash
# Only the explicitly selected active site config is managed. No certificate/firewall setup.
set -euo pipefail
umask 077
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="${1:?Private Compose JSON required}"
TARGET="$(python3 "$ROOT/deploy/compose-config.py" value "$CONFIG" --key nginx_config)"
[ -n "$TARGET" ] || { printf 'DEPLOY_NGINX_CONFIG must explicitly select the active site file\n' >&2; exit 1; }
TARGET="$(python3 -c 'from pathlib import Path; import sys; print(Path(sys.argv[1]).resolve())' "$TARGET")"
command -v nginx >/dev/null || { printf 'Nginx is required for proxy installation\n' >&2; exit 1; }
privileged(){ if [ "$(id -u)" = 0 ]; then "$@"; else sudo -n "$@"; fi; }
CANDIDATE="$(mktemp "${TMPDIR:-/tmp}/offy-nginx.XXXXXX")"
trap 'rm -f "$CANDIDATE"' EXIT
python3 "$ROOT/deploy/compose-config.py" render-nginx "$CONFIG" --output "$CANDIDATE"
BACKUP=""
if privileged test -e "$TARGET"; then
 BACKUP="$TARGET.offy-backup-$(date -u +%Y%m%dT%H%M%SZ)-$$"
 privileged cp -p "$TARGET" "$BACKUP"; privileged chmod 600 "$BACKUP"
fi
restore(){
 if [ -n "$BACKUP" ]; then privileged cp "$BACKUP" "$TARGET"; privileged chmod 600 "$TARGET"; else privileged rm -f "$TARGET"; fi
}
privileged install -m 600 "$CANDIDATE" "$TARGET"
if ! privileged nginx -t; then restore; printf 'Nginx validation failed; previous file restored, no reload performed.\n' >&2; exit 1; fi
if ! privileged nginx -s reload || ! bash "$ROOT/deploy/check-ingress.sh" "$CONFIG"; then
 restore
 privileged nginx -t && privileged nginx -s reload || true
 printf 'Nginx reload/HTTPS verification failed; previous site configuration restored.\n' >&2; exit 1
fi
printf 'Explicit Nginx site configuration installed; private backup retained if a prior file existed.\n'

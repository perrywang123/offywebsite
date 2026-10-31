#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="${1:?Private Compose JSON required}"
value(){ python3 "$ROOT/deploy/compose-config.py" value "$CONFIG" --key "$1"; }
CA="$(value ca_file)"
CA_ARGS=()
[ -z "$CA" ] || CA_ARGS=(--cacert "$CA")
probe(){
 local base="$1" path="$2" expected="$3" authority host port status
 authority="${base#https://}"; authority="${authority%%/*}"; host="${authority%%:*}"; port=443
 [[ "$authority" != *:* ]] || port="${authority##*:}"
 status="$(curl --noproxy '*' --silent --show-error --output /dev/null --write-out '%{http_code}' --max-time 15 --connect-to "$host:$port:127.0.0.1:$port" ${CA_ARGS[@]+"${CA_ARGS[@]}"} "${base%/}$path")" || { printf 'HTTPS ingress request failed; check the certificate, Nginx and configured origin.\n' >&2; return 1; }
 [ "$status" = "$expected" ] || { printf 'HTTPS ingress boundary failed: %s returned %s (expected %s)\n' "$path" "$status" "$expected" >&2; return 1; }
}
SITE="$(value site_url)"; ADMIN="$(value admin_origin)"
probe "$SITE" /admin 404
probe "$SITE" /api/admin/kol/state 404
probe "$ADMIN" /admin 200
probe "$ADMIN" /api/admin/kol/state 401
printf 'HTTPS public/admin boundaries verified (certificate validation enabled).\n'

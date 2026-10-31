#!/usr/bin/env bash
# Shared server-side pipeline; admin-only releases never replace the storefront.
set -euo pipefail
umask 077
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
SKIP_PULL=0; EXPLICIT_KOL=0; CHECK_ONLY=0; ADMIN_ONLY=0; ENV_FILE="$ROOT/.env"
while [ "$#" -gt 0 ]; do
 case "$1" in
  --admin-only) ADMIN_ONLY=1; EXPLICIT_KOL=1; shift ;;
  --skip-pull) SKIP_PULL=1; shift ;;
  --kol) EXPLICIT_KOL=1; shift ;;
  --check) CHECK_ONLY=1; shift ;;
  --env-file) ENV_FILE="${2:?Missing runtime env file}"; shift 2 ;;
  --help|-h) printf 'Usage: bash deploy/update.sh [--kol | --admin-only] [--skip-pull] [--check] [--env-file FILE]\n'; exit 0 ;;
  *) printf 'Unknown deployment option: %s\n' "$1" >&2; exit 1 ;;
 esac
done
say(){ printf '\n==> %s\n' "$*"; }
die(){ printf 'Deployment failed: %s\n' "$*" >&2; exit 1; }
for bin in docker python3 curl; do command -v "$bin" >/dev/null || die "$bin is required"; done
[ -f "$ENV_FILE" ] || die 'runtime env file missing; configure the production template first'
docker compose version >/dev/null 2>&1 || die 'Docker Compose plugin is unavailable'
docker info >/dev/null 2>&1 || die 'Docker daemon is not running or inaccessible'
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$ROOT/docker-compose.prod.yml")
OFFY_CONFIG_JSON="$(mktemp "${TMPDIR:-/tmp}/offy-compose.XXXXXX")"
trap 'rm -f "$OFFY_CONFIG_JSON"' EXIT
"${COMPOSE[@]}" --profile kol config --format json > "$OFFY_CONFIG_JSON"
VALIDATE=(); [ "$EXPLICIT_KOL" = 0 ] || VALIDATE=(--kol)
python3 "$ROOT/deploy/compose-config.py" validate "$OFFY_CONFIG_JSON" ${VALIDATE[@]+"${VALIDATE[@]}"}
value(){ python3 "$ROOT/deploy/compose-config.py" value "$OFFY_CONFIG_JSON" --key "$1"; }
KOL="$(value kol)"
NGINX_TARGET="$(value nginx_config)"
if [ "$KOL" = true ] && [ -n "$NGINX_TARGET" ]; then command -v nginx >/dev/null || die 'Nginx is required for the explicitly selected config'; fi
if [ "$CHECK_ONLY" = 1 ]; then say 'Preflight passed; no git pull, build, backup, service update or Nginx change performed'; exit 0; fi
command -v flock >/dev/null || die 'flock (util-linux) is required on the deployment server'
if [ "${OFFY_DEPLOY_LOCK_HELD:-0}" = 1 ]; then
 python3 -c 'import os,sys; a=os.fstat(9); b=os.stat(sys.argv[1]); sys.exit(0 if (a.st_dev,a.st_ino)==(b.st_dev,b.st_ino) else 1)' "$ROOT/.deploy.lock" || die 'invalid inherited deployment lock'
else
 exec 9> "$ROOT/.deploy.lock"
fi
flock -n 9 || die 'another deployment holds this project lock'
if command -v systemctl >/dev/null && systemctl is-active --quiet offy 2>/dev/null; then die 'legacy systemd offy still owns the app port; migrate it to Docker first'; fi
if [ "$SKIP_PULL" = 0 ]; then
 if [ -e .git ]; then
  command -v git >/dev/null || die 'git is required for server updates'
  [ "$(git rev-parse --show-toplevel)" -ef "$ROOT" ] || die 'run from the fixed Offy Git checkout'
  git diff --quiet && git diff --cached --quiet || die 'tracked local edits must be committed or resolved before deployment'
  say 'Fast-forwarding the configured Git upstream'
  git pull --ff-only
  rm -f "$OFFY_CONFIG_JSON"
  MODE=(); [ "$ADMIN_ONLY" = 0 ] || MODE=(--admin-only)
  # Reload new code while retaining the same lock and release scope.
  OFFY_DEPLOY_LOCK_HELD=1 exec bash "$ROOT/deploy/update.sh" --skip-pull ${VALIDATE[@]+"${VALIDATE[@]}"} ${MODE[@]+"${MODE[@]}"} --env-file "$ENV_FILE"
 elif [ "$ADMIN_ONLY" = 1 ]; then
  die 'admin updates require the server Git checkout; use --skip-pull only for deliberately prepared source'
 fi
fi
# A git re-exec reuses the verified inherited lock descriptor without an unlock gap.
ATTEMPTS="${DEPLOY_WAIT_ATTEMPTS:-40}"; DELAY="${DEPLOY_WAIT_SECONDS:-3}"
[[ "$ATTEMPTS" =~ ^[0-9]+$ && "$DELAY" =~ ^[0-9]+$ ]] || die 'invalid deployment wait settings'
[ "$ATTEMPTS" -ge 1 ] && [ "$ATTEMPTS" -le 120 ] && [ "$DELAY" -le 10 ] || die 'deployment wait settings out of range'
if [ "$ADMIN_ONLY" = 1 ]; then
 say 'Verifying the running storefront uses the same KOL settings and data volume'
 storefront_id="$("${COMPOSE[@]}" ps -q app)"
 [ -n "$storefront_id" ] || die 'deploy the KOL-capable storefront once before independent admin updates'
 docker inspect "$storefront_id" | python3 "$ROOT/deploy/compose-config.py" running-storefront "$OFFY_CONFIG_JSON"
fi
TARGET=app; [ "$ADMIN_ONLY" = 0 ] || TARGET=admin
BUILD=("$TARGET"); if [ "$KOL" = true ] && [ "$ADMIN_ONLY" = 0 ]; then BUILD=(app admin); fi
say "Building Linux Docker image(s): ${BUILD[*]}"
"${COMPOSE[@]}" --profile kol build "${BUILD[@]}"
say 'Backing up the shared persistent SQLite database before service replacement'
"${COMPOSE[@]}" --profile kol run --rm --no-deps --entrypoint node "$TARGET" --input-type=module < "$ROOT/deploy/backup-db.mjs"
wait_health(){
 local port="$1" healthy=0
 for ((i=1;i<=ATTEMPTS;i++)); do
  if curl --noproxy '*' --fail --silent --show-error --max-time 5 "http://127.0.0.1:$port/api/health" >/dev/null 2>&1; then healthy=1; break; fi
  [ "$i" = "$ATTEMPTS" ] || sleep "$DELAY"
 done
 [ "$healthy" = 1 ] || die "application health timed out on loopback $port; inspect logs"
}
if [ "$ADMIN_ONLY" = 0 ]; then
 say 'Starting storefront (normal migration and owner bootstrap entrypoint)'
 "${COMPOSE[@]}" up -d --no-build --no-deps app
 wait_health 3000
fi
SINCE="$(python3 -c 'import time; print(time.time_ns() // 1000000)')"
if [ "$KOL" = true ]; then
 say 'Starting independent admin and worker; storefront is not replaced by this step'
 "${COMPOSE[@]}" --profile kol up -d --no-build --no-deps admin
 wait_health 3001
 "${COMPOSE[@]}" --profile kol up -d --no-build --no-deps kol-worker
fi
if [ "$KOL" = true ]; then
 say 'Checking production owner, matching shop and a fresh worker heartbeat'
 ready=0
 for ((i=1;i<=ATTEMPTS;i++)); do
  worker_id="$("${COMPOSE[@]}" --profile kol ps -q kol-worker)"
  if [ -n "$worker_id" ] && [ "$(docker inspect --format '{{.State.Running}}' "$worker_id")" = true ] && "${COMPOSE[@]}" exec -T admin node scripts/kol-deployment-check.mjs --since "$SINCE"; then ready=1; break; fi
  [ "$i" = "$ATTEMPTS" ] || sleep "$DELAY"
 done
 [ "$ready" = 1 ] || die 'KOL owner/worker is not ready; check bootstrap hash, Shopify permissions and worker logs'
 if [ -n "$NGINX_TARGET" ]; then bash "$ROOT/deploy/install-nginx.sh" "$OFFY_CONFIG_JSON"
 else say 'Verifying the existing Nginx setup'; bash "$ROOT/deploy/check-ingress.sh" "$OFFY_CONFIG_JSON"; fi
else
 if [ -n "$("${COMPOSE[@]}" --profile kol ps -q kol-worker)" ]; then "${COMPOSE[@]}" --profile kol stop kol-worker; fi
fi
say 'Deployment verified; persistent volume and backup retained'
"${COMPOSE[@]}" --profile kol ps

#!/usr/bin/env bash
# Shared server-side pipeline with independent storefront and admin release scopes.
set -euo pipefail
umask 077
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
SKIP_PULL=0; EXPLICIT_KOL=0; CHECK_ONLY=0; ADMIN_ONLY=0; STOREFRONT_ONLY=0; ENV_FILE=""
while [ "$#" -gt 0 ]; do
 case "$1" in
  --admin-only) ADMIN_ONLY=1; EXPLICIT_KOL=1; shift ;;
  --storefront-only) STOREFRONT_ONLY=1; shift ;;
  --skip-pull) SKIP_PULL=1; shift ;;
  --kol) EXPLICIT_KOL=1; shift ;;
  --check) CHECK_ONLY=1; shift ;;
  --env-file) ENV_FILE="${2:?Missing runtime env file}"; shift 2 ;;
  --help|-h) printf 'Usage: bash deploy/update.sh [--kol] [--admin-only | --storefront-only] [--skip-pull] [--check] [--env-file FILE]\n--kol/admin-only enable KOL for this invocation; private config is not modified.\n--storefront-only builds/replaces app only, preserving admin/worker/proxy.\nRuntime file: explicit --env-file, otherwise .env, otherwise .env.production.\n'; exit 0 ;;
  *) printf 'Unknown deployment option: %s\n' "$1" >&2; exit 1 ;;
 esac
done
say(){ printf '\n==> %s\n' "$*"; }
die(){ printf 'Deployment failed: %s\n' "$*" >&2; exit 1; }
[ "$ADMIN_ONLY" = 0 ] || [ "$STOREFRONT_ONLY" = 0 ] || die '--admin-only and --storefront-only are mutually exclusive'
for bin in docker python3 curl; do command -v "$bin" >/dev/null || die "$bin is required"; done
if [ -z "$ENV_FILE" ]; then
 if [ -e "$ROOT/.env" ] || [ -L "$ROOT/.env" ]; then ENV_FILE="$ROOT/.env"
 else ENV_FILE="$ROOT/.env.production"; fi
fi
[ -f "$ENV_FILE" ] || die "runtime env file missing: $ENV_FILE; configure the production template or select --env-file FILE"
# Resolve once so Git re-exec keeps exactly the same runtime-file selection.
ENV_FILE="$(python3 -c 'import os,sys; print(os.path.abspath(sys.argv[1]))' "$ENV_FILE")"
say "Runtime configuration file: $ENV_FILE"
# The operator explicitly selected this scope. Apply it to every Compose call,
# including check-only and Git re-exec, without editing the private env file.
if [ "$EXPLICIT_KOL" = 1 ]; then
 export KOL_ENABLED=true
 say 'KOL enabled for this command; settlement settings and private config unchanged'
fi
docker compose version >/dev/null 2>&1 || die 'Docker Compose plugin is unavailable'
docker info >/dev/null 2>&1 || die 'Docker daemon is not running or inaccessible'
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$ROOT/docker-compose.prod.yml")
OFFY_CONFIG_JSON="$(mktemp "${TMPDIR:-/tmp}/offy-compose.XXXXXX")"
OFFY_SECRETS_JSON="$(mktemp "${TMPDIR:-/tmp}/offy-auth.XXXXXX")"
OFFY_BUILDER_JSON="$(mktemp "${TMPDIR:-/tmp}/offy-builder.XXXXXX")"
trap 'rm -f "$OFFY_CONFIG_JSON" "$OFFY_SECRETS_JSON" "$OFFY_BUILDER_JSON"' EXIT
"${COMPOSE[@]}" --profile kol config --format json > "$OFFY_CONFIG_JSON"
if [ "$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["services"]["app"]["environment"].get("KOL_ENABLED", "false"))' "$OFFY_CONFIG_JSON")" = true ]; then
 PREPARE=(); [ "$CHECK_ONLY" = 0 ] || PREPARE=(--check)
 python3 "$ROOT/deploy/runtime-secrets.py" "$OFFY_CONFIG_JSON" --env-file "$ENV_FILE" --output "$OFFY_SECRETS_JSON" ${PREPARE[@]+"${PREPARE[@]}"}
 # Values are read as data into fixed variable names; never source/eval runtime files.
 export KOL_INGRESS_SECRET="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["KOL_INGRESS_SECRET"])' "$OFFY_SECRETS_JSON")"
 export KOL_SIGNING_SECRET="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["KOL_SIGNING_SECRET"])' "$OFFY_SECRETS_JSON")"
 export KOL_WORKER_SECRET="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["KOL_WORKER_SECRET"])' "$OFFY_SECRETS_JSON")"
 "${COMPOSE[@]}" --profile kol config --format json > "$OFFY_CONFIG_JSON"
fi
VALIDATE=(); [ "$EXPLICIT_KOL" = 0 ] || VALIDATE=(--kol)
if ! python3 "$ROOT/deploy/compose-config.py" validate "$OFFY_CONFIG_JSON" ${VALIDATE[@]+"${VALIDATE[@]}"}; then
 printf 'Check the named configuration keys in %s. Private credentials are not supplied by Git.\n' "$ENV_FILE" >&2
 exit 1
fi
value(){ python3 "$ROOT/deploy/compose-config.py" value "$OFFY_CONFIG_JSON" --key "$1"; }
KOL="$(value kol)"
NGINX_TARGET="$(value nginx_config)"
if [ "$KOL" = true ] && [ "$STOREFRONT_ONLY" = 0 ] && [ -n "$NGINX_TARGET" ]; then command -v nginx >/dev/null || die 'Nginx is required for the explicitly selected config'; fi
if [ "$CHECK_ONLY" = 1 ]; then
 python3 "$ROOT/deploy/build-limits.py" "$OFFY_CONFIG_JSON" --output "$OFFY_BUILDER_JSON" --check
 say 'Preflight passed; no git pull, builder creation/start, build, backup, service update or Nginx change performed'
 exit 0
fi
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
  rm -f "$OFFY_CONFIG_JSON" "$OFFY_SECRETS_JSON" "$OFFY_BUILDER_JSON"
  MODE=(); [ "$ADMIN_ONLY" = 0 ] || MODE=(--admin-only)
  [ "$STOREFRONT_ONLY" = 0 ] || MODE=(--storefront-only)
  # Reload new code while retaining the same lock and release scope.
  OFFY_DEPLOY_LOCK_HELD=1 exec bash "$ROOT/deploy/update.sh" --skip-pull ${VALIDATE[@]+"${VALIDATE[@]}"} ${MODE[@]+"${MODE[@]}"} --env-file "$ENV_FILE"
 elif [ "$ADMIN_ONLY" = 1 ] || [ "$STOREFRONT_ONLY" = 1 ]; then
  die 'independent service updates require the server Git checkout; use --skip-pull only for deliberately prepared source'
 fi
fi
# A git re-exec reuses the verified inherited lock descriptor without an unlock gap.
ATTEMPTS="${DEPLOY_WAIT_ATTEMPTS:-40}"; DELAY="${DEPLOY_WAIT_SECONDS:-3}"
[[ "$ATTEMPTS" =~ ^[0-9]+$ && "$DELAY" =~ ^[0-9]+$ ]] || die 'invalid deployment wait settings'
[ "$ATTEMPTS" -ge 1 ] && [ "$ATTEMPTS" -le 120 ] && [ "$DELAY" -le 10 ] || die 'deployment wait settings out of range'
if [ "$ADMIN_ONLY" = 1 ]; then
 say 'Verifying the running storefront uses the same KOL settings and data volume'
 storefront_id="$("${COMPOSE[@]}" ps -q app)"
 [ -n "$storefront_id" ] || die 'deploy storefront first: bash deploy/update-storefront.sh --kol; then retry the admin update'
 docker inspect "$storefront_id" | python3 "$ROOT/deploy/compose-config.py" running-storefront "$OFFY_CONFIG_JSON"
elif [ "$STOREFRONT_ONLY" = 1 ]; then
 say 'Verifying any running admin uses compatible shared settings and the same data volume'
 admin_id="$("${COMPOSE[@]}" --profile kol ps -q admin)"
 if [ -n "$admin_id" ]; then
  docker inspect "$admin_id" | python3 "$ROOT/deploy/compose-config.py" running-admin "$OFFY_CONFIG_JSON"
 fi
fi
TARGET=app; [ "$ADMIN_ONLY" = 0 ] || TARGET=admin
BUILD=("$TARGET"); if [ "$KOL" = true ] && [ "$ADMIN_ONLY" = 0 ] && [ "$STOREFRONT_ONLY" = 0 ]; then BUILD=(app admin); fi
python3 "$ROOT/deploy/build-limits.py" "$OFFY_CONFIG_JSON" --output "$OFFY_BUILDER_JSON"
OFFY_BUILD_BUILDER="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["name"])' "$OFFY_BUILDER_JSON")"
say "Building Linux Docker image(s): ${BUILD[*]}"
"${COMPOSE[@]}" --profile kol build --builder "$OFFY_BUILD_BUILDER" "${BUILD[@]}"
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
if [ "$KOL" = true ] && [ "$STOREFRONT_ONLY" = 0 ]; then
 say 'Starting independent admin and worker; storefront is not replaced by this step'
 "${COMPOSE[@]}" --profile kol up -d --no-build --no-deps admin
 wait_health 3001
 "${COMPOSE[@]}" --profile kol up -d --no-build --no-deps kol-worker
fi
if [ "$KOL" = true ] && [ "$STOREFRONT_ONLY" = 0 ]; then
 say 'Checking production owner, matching shop and a fresh worker heartbeat'
 ready=0
 for ((i=1;i<=ATTEMPTS;i++)); do
  worker_id="$("${COMPOSE[@]}" --profile kol ps -q kol-worker)"
  if [ -n "$worker_id" ] && [ "$(docker inspect --format '{{.State.Running}}' "$worker_id")" = true ] && "${COMPOSE[@]}" exec -T admin node scripts/kol-deployment-check.mjs --since "$SINCE"; then ready=1; break; fi
  [ "$i" = "$ATTEMPTS" ] || sleep "$DELAY"
 done
 [ "$ready" = 1 ] || die 'KOL owner/worker is not ready; check owner startup initialization, Shopify permissions and worker logs'
 if [ -n "$NGINX_TARGET" ]; then bash "$ROOT/deploy/install-nginx.sh" "$OFFY_CONFIG_JSON"
 else say 'Verifying the existing Nginx setup'; bash "$ROOT/deploy/check-ingress.sh" "$OFFY_CONFIG_JSON"; fi
elif [ "$STOREFRONT_ONLY" = 0 ]; then
 if [ -n "$("${COMPOSE[@]}" --profile kol ps -q kol-worker)" ]; then "${COMPOSE[@]}" --profile kol stop kol-worker; fi
fi
if [ "$STOREFRONT_ONLY" = 1 ]; then say 'Storefront-only release verified; admin, worker and Nginx were not updated'; fi
say 'Deployment verified; persistent volume and backup retained'
"${COMPOSE[@]}" --profile kol ps

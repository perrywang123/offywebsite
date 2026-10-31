#!/usr/bin/env bash
# Source sync -> one shared server-side Docker pipeline. Does not run during local validation.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KOL=0; DRY_RUN=0
while [ "$#" -gt 0 ]; do
 case "$1" in
  --kol) KOL=1; shift ;;
  --dry-run) DRY_RUN=1; shift ;;
  --help|-h) printf 'Usage: DEPLOY_SERVER=user@host [DEPLOY_DIR=/opt/offy] [DEPLOY_ENV_FILE=private.env] bash scripts/deploy.sh [--kol] [--dry-run]\n'; exit 0 ;;
  *) printf 'Unknown deployment option: %s\n' "$1" >&2; exit 1 ;;
 esac
done
die(){ printf 'Deployment failed: %s\n' "$*" >&2; exit 1; }
SERVER="${DEPLOY_SERVER:-}"; APP_DIR="${DEPLOY_DIR:-/opt/offy}"; ENV_FILE="${DEPLOY_ENV_FILE:-}"
[[ "$SERVER" =~ ^([A-Za-z0-9_.-]+@)?[A-Za-z0-9_][A-Za-z0-9_.-]*$ ]] || die 'DEPLOY_SERVER must be an SSH alias or user@IPv4/DNS host'
[[ "$APP_DIR" =~ ^/[A-Za-z0-9_-][A-Za-z0-9._-]*/[A-Za-z0-9._/-]+$ ]] || die 'DEPLOY_DIR must be a dedicated absolute project directory, e.g. /opt/offy'
[[ "$APP_DIR/" != *'/../'* && "$APP_DIR/" != *'/./'* && "$APP_DIR" != *'//'* ]] 2>/dev/null || die 'DEPLOY_DIR cannot contain traversal or empty path segments'
[ -z "$ENV_FILE" ] || [ -f "$ENV_FILE" ] || die 'DEPLOY_ENV_FILE does not exist; no connection or source transfer performed'
for bin in ssh rsync; do command -v "$bin" >/dev/null || die "$bin is required"; done
REMOTE_FLAGS=(--skip-pull); [ "$KOL" = 0 ] || REMOTE_FLAGS+=(--kol)
if [ "$DRY_RUN" = 1 ]; then
 printf 'Dry run only: source -> %s:%s; Docker app%s; shared deploy/update.sh pipeline.\n' "$SERVER" "$APP_DIR" "$([ "$KOL" = 0 ] || printf ' + kol-worker')"
 printf 'Private env upload: %s. No SSH, file transfer or service change performed.\n' "$([ -z "$ENV_FILE" ] && printf 'disabled (keep server config)' || printf 'explicitly selected file')"
 exit 0
fi
# Refuse rsync --delete into an unrelated nonempty folder. No app secrets are read or printed.
ssh "$SERVER" "python3 - '$APP_DIR'" <<'PY'
from pathlib import Path
import json,sys
root=Path(sys.argv[1])
if root.exists():
    entries=[p for p in root.iterdir() if not p.name.startswith('.env') and p.name!='.offy-deploy-root']
    known=(root/'.offy-deploy-root').is_file()
    if not known and (root/'docker-compose.prod.yml').is_file() and (root/'package.json').is_file():
        try:known=json.loads((root/'package.json').read_text()).get('name')=='offy'
        except (ValueError,OSError):pass
    if entries and not known:raise SystemExit('Refusing to synchronize into an unrelated nonempty directory')
root.mkdir(parents=True,exist_ok=True)
(root/'.offy-deploy-root').touch(mode=0o600,exist_ok=True)
PY
printf 'Syncing source to %s:%s (private env/data/caches excluded)\n' "$SERVER" "$APP_DIR"
rsync -az --delete --rsync-path="flock -x '$APP_DIR/.deploy.lock' rsync" --include='/.env.example' --include='/.env.production.example' --exclude-from="$ROOT/deploy/source-excludes.txt" "$ROOT/" "$SERVER:$APP_DIR/"
REMOTE_SUFFIX=""; [ "$KOL" = 0 ] || REMOTE_SUFFIX=" --kol"
if [ -n "$ENV_FILE" ]; then
 printf 'Validating the explicitly selected private runtime file on the server before replacing .env\n'
 ssh "$SERVER" "bash '$APP_DIR/deploy/upload-env.sh'$REMOTE_SUFFIX" < "$ENV_FILE"
else
 printf 'Using existing server .env; no local runtime configuration uploaded.\n'
fi
ssh "$SERVER" "bash '$APP_DIR/deploy/update.sh' --skip-pull$REMOTE_SUFFIX"

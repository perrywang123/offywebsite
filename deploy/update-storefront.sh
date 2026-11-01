#!/usr/bin/env bash
# Run on the server in the original Git checkout/Compose project.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
case "${1:-}" in
 --help|-h)
  printf 'Usage: bash deploy/update-storefront.sh [--kol] [--check] [--skip-pull] [--env-file FILE]\nDefault: git pull --ff-only, build app, back up shared DB, update storefront only.\nKOL follows runtime config unless --kol is specified. Admin/worker/Nginx are not updated.\n'
  exit 0 ;;
esac
exec bash "$ROOT/deploy/update.sh" --storefront-only "$@"

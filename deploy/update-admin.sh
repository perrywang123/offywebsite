#!/usr/bin/env bash
# Run ON the server, in the same Git checkout/Compose project as the storefront.
# No SSH target, server IP, or manual source upload is needed.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
case "${1:-}" in
 --help|-h)
  printf 'Usage: bash deploy/update-admin.sh [--prebuilt] [--check] [--skip-pull] [--env-file FILE]\nDefault: git pull --ff-only, build admin, back up shared DB, update admin + worker only.\n--prebuilt uses loaded revision-verified Linux images without building on the server.\n'
  exit 0 ;;
esac
exec bash "$ROOT/deploy/update.sh" --admin-only "$@"

#!/usr/bin/env bash
# Portable source only: build Linux native dependencies with Docker on the target.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT"
OUTPUT="$ROOT/dist/offy-source.tar.gz"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --source) SOURCE="${2:?Missing source directory}"; shift 2 ;;
    --output) OUTPUT="${2:?Missing output archive}"; shift 2 ;;
    --help|-h) printf 'Usage: bash scripts/package-source.sh [--source DIR] [--output FILE]\n'; exit 0 ;;
    *) printf 'Unknown option: %s\n' "$1" >&2; exit 1 ;;
  esac
done
command -v rsync >/dev/null || { printf 'rsync is required\n' >&2; exit 1; }
[ -f "$SOURCE/Dockerfile" ] && [ -f "$SOURCE/docker-compose.prod.yml" ] || { printf 'Source must contain Dockerfile and Compose configuration\n' >&2; exit 1; }
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/offy-source.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT
rsync -a --include='/.env.example' --include='/.env.production.example' --exclude-from="$ROOT/deploy/source-excludes.txt" "$SOURCE/" "$STAGE/"
mkdir -p "$(dirname "$OUTPUT")"
tar -C "$STAGE" -czf "$OUTPUT" .
printf 'Source archive ready: %s\nPrivate env, databases and host-native build output excluded.\n' "$OUTPUT"

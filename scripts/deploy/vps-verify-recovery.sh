#!/usr/bin/env bash
set -euo pipefail

ROOT="${REHABMIND_ROOT:-$HOME/rehabmind}"
BASE_URL="${REHABMIND_BASE_URL:-https://66.154.101.204}"
APP_URL="${REHABMIND_APP_URL:-$BASE_URL/RehabMind/}"
CURRENT="$(readlink -f "$ROOT/current")"
ACTIVATOR="$CURRENT/scripts/deploy/vps-activate-release.sh"
PREVIOUS="$(find "$ROOT/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | awk -v current="$CURRENT" '$2 != current { print $2; exit }')"
[ -d "$CURRENT" ] || { echo "current release missing"; exit 1; }
[ -d "$PREVIOUS" ] || { echo "previous release missing"; exit 1; }

BACKUP_OUTPUT="$(PILOT_SQLITE_PATH="$ROOT/data/rehabmind.sqlite" PILOT_BACKUP_DIR="$ROOT/backups/recovery-test" bash "$CURRENT/scripts/deploy/vps-backup-sqlite.sh")"
echo "$BACKUP_OUTPUT"
BACKUP="$(printf '%s\n' "$BACKUP_OUTPUT" | sed -n 's/^backup_path=//p' | tail -1)"
[ -f "$BACKUP" ] || { echo "recovery backup missing"; exit 1; }
RESTORE_DIR="$(mktemp -d "$ROOT/recovery-test.XXXXXX")"
RESTORED_DB="$RESTORE_DIR/restored.sqlite"
cleanup() {
  bash "$ACTIVATOR" "$CURRENT" >/dev/null 2>&1 || true
  rm -rf "$RESTORE_DIR"
}
trap cleanup EXIT
cp "$BACKUP" "$RESTORED_DB"
PILOT_SQLITE_PATH="$RESTORED_DB" node "$CURRENT/scripts/data/check-sqlite-health.mjs"

if [ "${ALLOW_LIVE_ROLLBACK_TEST:-0}" = "1" ]; then
  bash "$ACTIVATOR" "$PREVIOUS"
  sleep 4
  curl -sf -o /dev/null "$APP_URL" || { echo "previous release rollback probe failed"; exit 1; }
  bash "$ACTIVATOR" "$CURRENT"
  sleep 4
  curl -sf -o /dev/null "$APP_URL" || { echo "forward restore probe failed"; exit 1; }
  echo "live_code_rollback=passed"
else
  echo "live_code_rollback=not_run set ALLOW_LIVE_ROLLBACK_TEST=1"
fi

echo "backup_restore=passed backup=$BACKUP previous=$PREVIOUS current=$CURRENT"

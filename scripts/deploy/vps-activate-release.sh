#!/usr/bin/env bash
# Point current at one release and recreate PM2 so its real cwd follows the symlink target.
set -euo pipefail

ROOT="${REHABMIND_ROOT:-$HOME/rehabmind}"
TARGET="$(readlink -f "${1:?release directory is required}")"
[ -d "$TARGET" ] || { echo "release target missing: $TARGET"; exit 1; }
[ -f "$TARGET/ecosystem.config.cjs" ] || { echo "release process config missing: $TARGET"; exit 1; }

ln -sfn "$TARGET" "$ROOT/current"
pm2 delete rehabmind >/dev/null 2>&1 || true
cd "$TARGET"
pm2 start ecosystem.config.cjs --only rehabmind --update-env >/dev/null

PID="$(pm2 pid rehabmind)"
[ -n "$PID" ] && [ "$PID" != "0" ] || { echo "rehabmind PM2 process did not start"; exit 1; }
ACTUAL_CWD="$(readlink -f "/proc/$PID/cwd")"
[ "$ACTUAL_CWD" = "$TARGET" ] || { echo "PM2 cwd mismatch: expected=$TARGET actual=$ACTUAL_CWD"; exit 1; }
PORT="$(sed -n 's/^PORT=//p' "$TARGET/.env" | tail -1)"
PORT="${PORT:-3100}"
for _ in $(seq 1 20); do
  if curl -sf -o /dev/null "http://127.0.0.1:$PORT/"; then break; fi
  sleep 1
done
curl -sf -o /dev/null "http://127.0.0.1:$PORT/" || { echo "activated process did not become ready on port $PORT"; exit 1; }
echo "pm2_activation=passed target=$TARGET pid=$PID"

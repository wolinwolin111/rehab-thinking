#!/usr/bin/env bash
# RehabMind VPS 发布脚本（服务器侧执行）。
#
# 用法：先把两个产物上传到 ~/rehabmind/incoming/
#   - rehabmind-code.tar
#   - rehabmind-dist.tar.gz
# 两个产物均由绑定当前质量运行身份的 `npm run release:package` 产出。
# 然后：ssh rehabdeploy@66.154.101.204 'bash -s' < scripts/deploy/vps-release.sh
#
# 行为：发布到独立时间戳目录 → 备份/副本 canary → 迁移 → 原子切换 current 软链 → pm2 重载 →
#       健康探针失败自动回滚到上一版；仅保留最近 3 个版本。
set -euo pipefail

ROOT="$HOME/rehabmind"
INCOMING="$ROOT/incoming"
RELEASES="$ROOT/releases"
STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="$RELEASES/$STAMP"
DB="$ROOT/data/rehabmind.sqlite"
CANARY_PORT="${CANARY_PORT:-3101}"

[ -f "$INCOMING/rehabmind-code.tar" ] || { echo "missing incoming/rehabmind-code.tar"; exit 1; }
[ -f "$INCOMING/rehabmind-dist.tar.gz" ] || { echo "missing incoming/rehabmind-dist.tar.gz"; exit 1; }

echo "=== 1. extract release $STAMP ==="
mkdir -p "$DEST"
tar -xf "$INCOMING/rehabmind-code.tar" -C "$DEST"
mkdir -p "$DEST/dist"
tar -xzf "$INCOMING/rehabmind-dist.tar.gz" -C "$DEST"

echo "=== 2. env + node_modules ==="
# .env 与 node_modules 常驻于上一版；首版部署时从 app-src 引导。
PREV="$(readlink -f "$ROOT/current" 2>/dev/null || true)"
if [ -n "$PREV" ] && [ -f "$PREV/.env" ]; then cp "$PREV/.env" "$DEST/.env";
elif [ -f "$ROOT/app-src/.env" ]; then cp "$ROOT/app-src/.env" "$DEST/.env";
else echo ".env missing — put secrets before first deploy"; exit 1; fi
chmod 600 "$DEST/.env"
# 邀请门已经退出产品；只清理候选目录，上一版本环境保持可回滚。
sed -i '/^PILOT_INVITE_/d' "$DEST/.env"
if ! grep -q '^PILOT_TRUSTED_PROXY=' "$DEST/.env"; then
  printf '%s\n' 'PILOT_TRUSTED_PROXY=nginx' >> "$DEST/.env"
fi
if [ ! -d "$DEST/node_modules" ]; then
  if [ -n "$PREV" ] && [ -d "$PREV/node_modules" ] && cmp -s "$DEST/package-lock.json" "$PREV/package-lock.json" && [ -z "${FORCE_NPM_CI:-}" ]; then
    echo "reuse node_modules from previous release with the same lock file"
    cp -al "$PREV/node_modules" "$DEST/node_modules" 2>/dev/null || cp -r "$PREV/node_modules" "$DEST/node_modules"
  elif [ -d "$ROOT/app-src/node_modules" ] && cmp -s "$DEST/package-lock.json" "$ROOT/app-src/package-lock.json" && [ -z "${FORCE_NPM_CI:-}" ]; then
    echo "reuse node_modules from app-src with the same lock file"
    cp -al "$ROOT/app-src/node_modules" "$DEST/node_modules" 2>/dev/null || cp -r "$ROOT/app-src/node_modules" "$DEST/node_modules"
  else
    (cd "$DEST" && npm ci --no-audit --no-fund 2>&1 | tail -2)
  fi
fi

echo "=== 3. backup + restored-copy canary ==="
BACKUP_OUTPUT="$(PILOT_SQLITE_PATH="$DB" PILOT_BACKUP_DIR="$ROOT/backups/pre-release" bash "$DEST/scripts/deploy/vps-backup-sqlite.sh")"
echo "$BACKUP_OUTPUT"
BACKUP="$(printf '%s\n' "$BACKUP_OUTPUT" | sed -n 's/^backup_path=//p' | tail -1)"
[ -n "$BACKUP" ] && [ -f "$BACKUP" ] || { echo "pre-release backup missing"; exit 1; }
CANARY_DB="$DEST/canary.sqlite"
cp "$BACKUP" "$CANARY_DB"
PILOT_SQLITE_PATH="$CANARY_DB" node "$DEST/scripts/data/migrate-sqlite.mjs"
PILOT_SQLITE_PATH="$CANARY_DB" node "$DEST/scripts/data/check-sqlite-health.mjs"
if ss -ltn "sport = :$CANARY_PORT" | grep -q LISTEN; then
  echo "canary port already in use: $CANARY_PORT"
  exit 1
fi
setsid node "$DEST/scripts/deploy/start-canary.mjs" "$DEST" "$CANARY_PORT" "$CANARY_DB" >"$DEST/canary.log" 2>&1 &
CANARY_PID=$!
cleanup_canary() {
  kill -TERM -- "-$CANARY_PID" 2>/dev/null || true
  wait "$CANARY_PID" 2>/dev/null || true
  rm -f "$CANARY_DB" "$CANARY_DB-wal" "$CANARY_DB-shm"
}
trap cleanup_canary EXIT
for _ in $(seq 1 20); do
  if ! kill -0 "$CANARY_PID" 2>/dev/null; then
    echo "canary process exited before readiness"
    tail -50 "$DEST/canary.log"
    exit 1
  fi
  if curl -sf -o /dev/null "http://127.0.0.1:$CANARY_PORT/"; then break; fi
  sleep 1
done
kill -0 "$CANARY_PID" 2>/dev/null || { echo "canary process is not alive"; exit 1; }
curl -sf -o /dev/null "http://127.0.0.1:$CANARY_PORT/" || { echo "canary page probe failed"; exit 1; }
CANARY_BOUNDARY=$(curl -s -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:$CANARY_PORT/api/pilot/cases" -H 'content-type: application/json' -d '{}')
[ "$CANARY_BOUNDARY" = "400" ] || { echo "canary source/consent boundary failed: $CANARY_BOUNDARY"; exit 1; }
cleanup_canary
trap - EXIT

echo "=== 4. migrate production database ==="
cd "$DEST"
PILOT_SQLITE_PATH="$DB" node scripts/data/migrate-sqlite.mjs
PILOT_SQLITE_PATH="$DB" node scripts/data/check-sqlite-health.mjs

echo "=== 5-6. switch current and activate pm2 cwd ==="
if ! bash "$DEST/scripts/deploy/vps-activate-release.sh" "$DEST"; then
  echo "activation FAILED — rolling back"
  if [ -n "${PREV:-}" ] && [ -d "${PREV%/}" ]; then
    bash "$DEST/scripts/deploy/vps-activate-release.sh" "${PREV%/}" || true
  fi
  exit 1
fi
sleep 5

echo "=== 7. health probe ==="
if ! REHABMIND_ROOT="$ROOT" PILOT_SQLITE_PATH="$DB" bash "$DEST/scripts/deploy/vps-verify-release.sh"; then
  echo "probe FAILED — rolling back"
  if [ -n "${PREV:-}" ] && [ -d "${PREV%/}" ]; then
    bash "$DEST/scripts/deploy/vps-activate-release.sh" "${PREV%/}"
    echo "rolled back to ${PREV%/}"
  else
    echo "no previous release to roll back to"
  fi
  exit 1
fi
echo "full release verification OK"

echo "=== 8. prune old releases (keep 3) ==="
ACTIVE_PID="$(pm2 pid rehabmind)"
[ "$(readlink -f "/proc/$ACTIVE_PID/cwd")" = "$DEST" ] || { echo "refusing to prune while PM2 cwd is not the new release"; exit 1; }
rm -f "$INCOMING"/*.tar "$INCOMING"/*.tar.gz
ls -1dt "$RELEASES"/*/ | tail -n +4 | xargs -r rm -rf
echo "=== RELEASE DONE: $DEST ==="

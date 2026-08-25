#!/usr/bin/env bash
# RehabMind VPS 发布脚本（服务器侧执行）。
#
# 用法：先把两个产物上传到 ~/rehabmind/incoming/
#   - rehabmind-code.tar   （本地 `git archive HEAD` 产出）
#   - rehabmind-dist.tar.gz（本地 `tar -czf` dist/ 产出）
# 然后：ssh rehabdeploy@66.154.101.204 'bash -s' < scripts/vps-release.sh
#
# 行为：发布到独立时间戳目录 → 迁移 → 原子切换 current 软链 → pm2 重载 →
#       健康探针失败自动回滚到上一版；仅保留最近 3 个版本。
set -euo pipefail

ROOT="$HOME/rehabmind"
INCOMING="$ROOT/incoming"
RELEASES="$ROOT/releases"
STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="$RELEASES/$STAMP"
DB="$ROOT/data/rehabmind.sqlite"

[ -f "$INCOMING/rehabmind-code.tar" ] || { echo "missing incoming/rehabmind-code.tar"; exit 1; }
[ -f "$INCOMING/rehabmind-dist.tar.gz" ] || { echo "missing incoming/rehabmind-dist.tar.gz"; exit 1; }

echo "=== 1. extract release $STAMP ==="
mkdir -p "$DEST"
tar -xf "$INCOMING/rehabmind-code.tar" -C "$DEST"
mkdir -p "$DEST/dist"
tar -xzf "$INCOMING/rehabmind-dist.tar.gz" -C "$DEST"

echo "=== 2. env + node_modules ==="
# .env 与 node_modules 常驻于上一版；首版部署时从 app-src 引导。
PREV="$(ls -1dt "$RELEASES"/*/ 2>/dev/null | grep -v "$DEST" | head -1 || true)"
if [ -f "$PREV.env" ]; then cp "$PREV.env" "$DEST/.env";
elif [ -f "$ROOT/app-src/.env" ]; then cp "$ROOT/app-src/.env" "$DEST/.env";
else echo ".env missing — put secrets before first deploy"; exit 1; fi
chmod 600 "$DEST/.env"
if [ ! -d "$DEST/node_modules" ]; then
  if [ -d "$ROOT/app-src/node_modules" ] && [ -z "${FORCE_NPM_CI:-}" ]; then
    echo "reuse node_modules from app-src (FORCE_NPM_CI=1 强制重装)"
    cp -al "$ROOT/app-src/node_modules" "$DEST/node_modules" 2>/dev/null || cp -r "$ROOT/app-src/node_modules" "$DEST/node_modules"
  else
    (cd "$DEST" && npm ci --no-audit --no-fund 2>&1 | tail -2)
  fi
fi

echo "=== 3. migrate ==="
cd "$DEST"
PILOT_SQLITE_PATH="$DB" node scripts/migrate-sqlite.mjs

echo "=== 4. switch current ==="
ln -sfn "$DEST" "$ROOT/current"
cd "$ROOT/current"

echo "=== 5. reload pm2 ==="
pm2 delete rehabmind 2>/dev/null || true
pm2 start ecosystem.config.cjs >/dev/null
sleep 5

echo "=== 6. health probe ==="
OK=1
curl -sf -o /dev/null https://66.154.101.204/RehabMind/ || OK=0
GATE=$(curl -s -o /dev/null -w '%{http_code}' -X POST https://66.154.101.204/api/pilot/cases -H 'content-type: application/json' -d '{}' || true)
[ "$GATE" = "403" ] || OK=0
if [ "$OK" != "1" ]; then
  echo "probe FAILED — rolling back"
  pm2 delete rehabmind 2>/dev/null || true
  if [ -n "${PREV:-}" ] && [ -d "${PREV%/}" ]; then
    ln -sfn "${PREV%/}" "$ROOT/current"
    cd "$ROOT/current"
    PILOT_SQLITE_PATH="$DB" pm2 start ecosystem.config.cjs >/dev/null
    echo "rolled back to ${PREV%/}"
  else
    echo "no previous release to roll back to"
  fi
  exit 1
fi
echo "probes OK"

echo "=== 7. prune old releases (keep 3) ==="
rm -f "$INCOMING"/*.tar "$INCOMING"/*.tar.gz
ls -1dt "$RELEASES"/*/ | tail -n +4 | xargs -r rm -rf
echo "=== RELEASE DONE: $DEST ==="

#!/usr/bin/env bash
# RehabMind SQLite 在线备份（.backup API，不阻塞读写），保留最近 7 份。
# 服务器上由 /etc/cron.d/rehabmind-backup 每日 03:20 调用。
set -euo pipefail
DB="${PILOT_SQLITE_PATH:-$HOME/rehabmind/data/rehabmind.sqlite}"
DEST="${PILOT_BACKUP_DIR:-$HOME/backups/rehabmind}"
STAMP="$(date +%Y%m%d-%H%M)"
mkdir -p "$DEST"
cd "$HOME/rehabmind/current" 2>/dev/null || cd "$HOME/rehabmind/app-src"
BACKUP="$DEST/rehabmind-$STAMP.sqlite"
node -e "
const Database = require('better-sqlite3');
const src = new Database(process.argv[1], { readonly: true });
src.backup(process.argv[2]).then(() => { src.close(); console.log('backup ok'); }).catch((e) => { console.error(e); process.exit(1); });
" "$DB" "$BACKUP"
CHECK_SCRIPT="$HOME/rehabmind/current/scripts/data/check-sqlite-health.mjs"
if [ -f "$CHECK_SCRIPT" ]; then
  PILOT_SQLITE_PATH="$BACKUP" node "$CHECK_SCRIPT"
fi
ls -1t "$DEST"/rehabmind-*.sqlite | tail -n +8 | xargs -r rm -f
echo "kept: $(ls -1 "$DEST" | wc -l) files"
echo "backup_path=$BACKUP"

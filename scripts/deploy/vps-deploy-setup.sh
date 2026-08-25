set -e
set -u
cd "$HOME/rehabmind"

echo "=== 1. extract ==="
rm -rf app-src dist
mkdir -p app-src data
tar -xf incoming/rehabmind-code.tar -C app-src
mkdir -p app-src/dist
tar -xzf incoming/rehabmind-dist.tar.gz -C app-src
ls app-src | head -8

echo "=== 2. env file ==="
cat > app-src/.env <<'ENVEOF'
PILOT_DB_DRIVER=sqlite
PILOT_TRUSTED_PROXY=nginx
NODE_ENV=production
ENVEOF
echo "base env written (secrets injected separately)"

echo "=== 3. npm ci ==="
cd app-src
npm ci --no-audit --no-fund 2>&1 | tail -3

echo "=== 4. better-sqlite3 sanity on server ==="
node -e "const db=require('better-sqlite3')(':memory:');db.exec('create table t(a)');console.log('native ok')"

echo "=== 5. migrations ==="
cd "$HOME/rehabmind/app-src"
PILOT_SQLITE_PATH="$HOME/rehabmind/data/rehabmind.sqlite" node scripts/data/migrate-sqlite.mjs

echo "=== DONE-SETUP ==="

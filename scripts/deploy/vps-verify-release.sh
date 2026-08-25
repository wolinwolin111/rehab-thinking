#!/usr/bin/env bash
set -euo pipefail

ROOT="${REHABMIND_ROOT:-$HOME/rehabmind}"
BASE_URL="${REHABMIND_BASE_URL:-https://66.154.101.204}"
APP_URL="${REHABMIND_APP_URL:-$BASE_URL/RehabMind/}"
DB="${PILOT_SQLITE_PATH:-$ROOT/data/rehabmind.sqlite}"
CURRENT="$(readlink -f "$ROOT/current")"
[ -d "$CURRENT" ] || { echo "current release missing"; exit 1; }

HEADERS="$(mktemp)"
trap 'rm -f "$HEADERS"' EXIT
curl -sfD "$HEADERS" -o /dev/null "$APP_URL"
grep -Eiq '^content-security-policy:.*frame-ancestors' "$HEADERS" || { echo "content security policy missing"; exit 1; }
grep -Eiq '^x-content-type-options:[[:space:]]*nosniff' "$HEADERS" || { echo "nosniff header missing"; exit 1; }
grep -Eiq '^x-frame-options:[[:space:]]*DENY' "$HEADERS" || { echo "frame denial header missing"; exit 1; }
grep -Eiq '^strict-transport-security:[[:space:]]*max-age=' "$HEADERS" || { echo "strict transport security header missing"; exit 1; }
grep -Eiq '^referrer-policy:[[:space:]]*no-referrer' "$HEADERS" || { echo "referrer policy missing"; exit 1; }
grep -Eiq '^x-robots-tag:[[:space:]]*noindex' "$HEADERS" || { echo "page noindex policy missing"; exit 1; }
grep -Eiq '^cache-control:[[:space:]]*no-store' "$HEADERS" || { echo "page no-store policy missing"; exit 1; }
node "$CURRENT/scripts/quality/check-deployed-assets.mjs" "$APP_URL" "$BASE_URL"

ROOT_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/")
[ "$ROOT_STATUS" = "308" ] || [ "$ROOT_STATUS" = "301" ] || [ "$ROOT_STATUS" = "302" ] || { echo "root redirect failed: $ROOT_STATUS"; exit 1; }
CREATE_BOUNDARY_STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/pilot/cases" -H 'content-type: application/json' -d '{}')
[ "$CREATE_BOUNDARY_STATUS" = "400" ] || { echo "source/consent boundary failed: $CREATE_BOUNDARY_STATUS"; exit 1; }
ADMIN_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/pilot/admin/cases")
[ "$ADMIN_STATUS" = "401" ] || { echo "admin boundary failed: $ADMIN_STATUS"; exit 1; }
API_HEADERS="$(mktemp)"
trap 'rm -f "$HEADERS" "$API_HEADERS"' EXIT
curl -sfD "$API_HEADERS" -o /dev/null "$BASE_URL/api/pilot/admin/cases" || true
grep -Eiq '^x-robots-tag:[[:space:]]*noindex' "$API_HEADERS" || { echo "API noindex policy missing"; exit 1; }
grep -Eiq '^cache-control:[[:space:]]*no-store' "$API_HEADERS" || { echo "API no-store policy missing"; exit 1; }

PILOT_SQLITE_PATH="$DB" node "$CURRENT/scripts/data/check-sqlite-health.mjs"
PM2_HEALTH="$(pm2 jlist | node -e '
let data=""; process.stdin.on("data", (chunk) => data += chunk); process.stdin.on("end", () => {
  const app=JSON.parse(data).find((item) => item.name === "rehabmind");
  if (!app || app.pm2_env?.status !== "online") process.exit(1);
  const rss=Number(app.monit?.memory ?? 0);
  if (rss > Number(process.env.REHABMIND_MAX_RSS_BYTES ?? 419430400)) process.exit(2);
  process.stdout.write(JSON.stringify({status: app.pm2_env.status, rssBytes: rss, pid: app.pid}));
});')"
echo "pm2=$PM2_HEALTH"
PM2_PID="$(pm2 pid rehabmind)"
PROCESS_CWD="$(readlink -f "/proc/$PM2_PID/cwd")"
[ "$PROCESS_CWD" = "$CURRENT" ] || { echo "PM2 cwd mismatch: expected=$CURRENT actual=$PROCESS_CWD"; exit 1; }
node "$CURRENT/scripts/deploy/vps-verify-http.mjs" "$CURRENT" "$BASE_URL"

FREE_KB=$(df -Pk "$ROOT" | awk 'NR==2 {print $4}')
[ "${FREE_KB:-0}" -ge "${REHABMIND_MIN_FREE_KB:-262144}" ] || { echo "disk free space below threshold"; exit 1; }

if [ -n "${EXPECTED_BUILD_ID:-}" ]; then
  grep -Fq "\"buildId\": \"$EXPECTED_BUILD_ID\"" "$CURRENT/src/infrastructure/pilot/release/release.generated.ts" || { echo "deployed build id mismatch"; exit 1; }
fi

LOG_PATHS="$(pm2 jlist | node -e '
let data=""; process.stdin.on("data", (chunk) => data += chunk); process.stdin.on("end", () => {
  const app=JSON.parse(data).find((item) => item.name === "rehabmind");
  for (const path of [app?.pm2_env?.pm_out_log_path, app?.pm2_env?.pm_err_log_path]) if (path) console.log(path);
});')"
while IFS='=' read -r key value; do
  case "$key" in PILOT_ADMIN_KEY)
    if [ "${#value}" -ge 8 ]; then
      while IFS= read -r log; do
        [ -f "$log" ] && ! grep -Fq -- "$value" "$log" || { echo "secret value found in application log"; exit 1; }
      done <<< "$LOG_PATHS"
    fi
  esac
done < "$CURRENT/.env"

echo "release_health=passed current=$CURRENT process_cwd=$PROCESS_CWD free_kb=$FREE_KB"

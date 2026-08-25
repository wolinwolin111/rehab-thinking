#!/usr/bin/env bash
# Idempotently apply RehabMind-only security headers without changing co-hosted applications.
set -euo pipefail

CONFIG="${REHABMIND_NGINX_CONFIG:-/etc/nginx/sites-enabled/combined.conf}"
SNIPPET="${REHABMIND_NGINX_SECURITY_SNIPPET:-/etc/nginx/snippets/rehabmind-security.conf}"
ARCHIVE_DIR="/etc/nginx/sites-available/archived-baks"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ARCHIVE_DIR/combined.conf.pre-rehabmind-security-$STAMP"

[ -f "$CONFIG" ] || { echo "nginx config missing: $CONFIG"; exit 1; }
sudo mkdir -p "$ARCHIVE_DIR"
sudo cp "$CONFIG" "$BACKUP"

# Files under sites-enabled are all loaded, regardless of their suffix.
find /etc/nginx/sites-enabled -maxdepth 1 -type f -name 'combined.conf.bak-*' -print0 |
  while IFS= read -r -d '' file; do sudo mv "$file" "$ARCHIVE_DIR/"; done

TMP_SNIPPET="$(mktemp)"
cat > "$TMP_SNIPPET" <<'NGINXEOF'
add_header Strict-Transport-Security "max-age=31536000" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'" always;
add_header Referrer-Policy "no-referrer" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Resource-Policy "same-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
add_header Cache-Control "no-store, max-age=0" always;
add_header X-Robots-Tag "noindex, nofollow, noarchive" always;
NGINXEOF
sudo install -o root -g root -m 0644 "$TMP_SNIPPET" "$SNIPPET"
rm -f "$TMP_SNIPPET"

sudo python3 - "$CONFIG" "$SNIPPET" <<'PY'
from pathlib import Path
import sys

config = Path(sys.argv[1])
snippet = sys.argv[2]
text = config.read_text()
include = f"        include {snippet};\n"
for marker in ("    location /RehabMind/ {\n", "    location /api/pilot/   {\n"):
    if text.count(marker) != 1:
        raise SystemExit(f"expected exactly one nginx marker: {marker.strip()}")
    start = text.index(marker)
    end = text.index("\n    }", start)
    block = text[start:end]
    if include.strip() not in block:
        text = text[:start + len(marker)] + include + text[start + len(marker):]
asset_location = """    location /_next/ {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
    }
"""
if "    location /_next/ {\n" not in text:
    marker = "    # App-absolute references resolve from either entry.\n"
    if text.count(marker) != 1:
        raise SystemExit("expected exactly one app-absolute nginx marker")
    text = text.replace(marker, marker + asset_location, 1)
config.write_text(text)
PY

if ! sudo nginx -t; then
  sudo cp "$BACKUP" "$CONFIG"
  echo "nginx validation failed; restored $BACKUP"
  exit 1
fi
sudo systemctl reload nginx
sleep 1
echo "nginx_security=applied backup=$BACKUP snippet=$SNIPPET"

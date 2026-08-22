set -e
echo "=== upload marker: extract fresh dist ==="
cd "$HOME/rehabmind"
rm -rf app-src/dist
mkdir -p app-src/dist
tar -xzf incoming/rehabmind-dist.tar.gz -C app-src
ls app-src/dist | head -4

echo "=== restart app ==="
cd "$HOME/rehabmind/app-src"
pm2 restart rehabmind --update-env
sleep 5
curl -s -o /dev/null -w "local-root:%{http_code}\n" http://127.0.0.1:3100/

echo "=== nginx: add /RehabMind/ alias (prefix-strip) ==="
sudo cp /etc/nginx/sites-enabled/combined.conf "/etc/nginx/sites-enabled/combined.conf.bak-$(date +%Y%m%d-%H%M2)"
sudo tee /etc/nginx/sites-enabled/combined.conf > /dev/null <<'NGINXEOF'
server {
    listen 80;
    server_name _;

    location ^~ /.well-known/acme-challenge/ {
        alias /var/www/letsencrypt/.well-known/acme-challenge/;
        default_type text/plain;
    }

    location = /mobile { return 308 https://66.154.101.204/mobile/; }
    location /mobile/  { return 308 https://66.154.101.204$request_uri; }
    location = /api    { return 308 https://66.154.101.204/clinic/api/; }
    location /api/     { return 308 https://66.154.101.204/clinic$request_uri; }
    location = /clinic { return 308 https://66.154.101.204/clinic/; }
    location /clinic/  { return 308 https://66.154.101.204/clinic$request_uri; }

    # Bare HTTP root funnels into the suffixed RehabMind entry.
    location / { return 308 https://66.154.101.204/RehabMind/; }
}

server {
    listen 443 ssl;
    server_name 66.154.101.204;
    client_max_body_size 4m;

    ssl_certificate /etc/letsencrypt/live/rehabguide-ip/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rehabguide-ip/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_timeout 1d;
    ssl_session_cache shared:RehabGuideSSL:10m;
    ssl_session_tickets off;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_http_version 1.1;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;

    set $rehab_upstream http://127.0.0.1:3100;

    # Suffixed entry (product-facing URL).
    location = /RehabMind { return 308 /RehabMind/; }
    location /RehabMind/ {
        proxy_pass http://127.0.0.1:3100/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # App-absolute references resolve from either entry.
    location /assets/      { proxy_pass http://127.0.0.1:3100; proxy_http_version 1.1; }
    location /api/pilot/   {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /og-rehabmind-complete.png { proxy_pass http://127.0.0.1:3100; }
    location /favicon.svg               { proxy_pass http://127.0.0.1:3100; }

    # --- Clinic Management System (Gunicorn 8080) ---
    location = /clinic { return 308 /clinic/; }
    location /clinic/ {
        expires -1;
        add_header Cache-Control "no-cache, must-revalidate" always;
        add_header Strict-Transport-Security "max-age=31536000" always;
        add_header X-Content-Type-Options "nosniff" always;
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location = /mobile { return 308 /mobile/; }
    location /mobile/ {
        alias /var/www/mobile/;
        index index.html;
        expires -1;
        add_header Cache-Control "no-cache, must-revalidate" always;
        add_header Strict-Transport-Security "max-age=31536000" always;
        add_header X-Content-Type-Options "nosniff" always;
        try_files $uri $uri/ =404;
    }

    # Bare root still serves the app for existing bookmarks.
    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINXEOF
sudo nginx -t 2>&1 | tail -1
sudo systemctl reload nginx
echo "=== probes ==="
for u in "/RehabMind/" "/RehabMind" "/" "/assets/" "/api/pilot/x" "/clinic/" "/mobile/"; do
  printf "%-18s %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code}' https://66.154.101.204$u)"
done


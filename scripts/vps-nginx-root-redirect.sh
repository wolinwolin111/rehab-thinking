set -e
echo "=== backup ==="
sudo cp /etc/nginx/sites-enabled/combined.conf "/etc/nginx/sites-enabled/combined.conf.bak-$(date +%Y%m%d-%H%M3)"

echo "=== write root-redirect variant ==="
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

# RehabMind pilot (canonical suffixed entry) + Clinic/mobile coexistence.
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

    # --- Canonical suffixed entry ---
    location = /RehabMind { return 308 /RehabMind/; }
    location /RehabMind/ {
        proxy_pass http://127.0.0.1:3100/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # --- App-absolute pipelines (shared by both historical entries) ---
    location /assets/    { proxy_pass http://127.0.0.1:3100; proxy_http_version 1.1; }
    location = /og-rehabmind-complete.png { proxy_pass http://127.0.0.1:3100; }
    location = /favicon.svg               { proxy_pass http://127.0.0.1:3100; }

    location /api/pilot/ {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Root no longer serves the app; single canonical content entry.
    location / { return 308 https://66.154.101.204/RehabMind/; }

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
}
NGINXEOF
sudo nginx -t 2>&1 | tail -1
sudo systemctl reload nginx
echo "=== probes ==="
printf "%-28s %s\n" "/(bare root)" "$(curl -s -o /dev/null -w '%{http_code}' https://66.154.101.204/)"
curl -s -D - -o NUL https://66.154.101.204/ | grep -i "^location" || true
printf "%-28s %s\n" "/RehabMind/" "$(curl -s -o /dev/null -w '%{http_code}' https://66.154.101.204/RehabMind/)"
printf "%-28s %s\n" "/assets/(real css)" "$(curl -s -o /dev/null -w '%{http_code}' https://66.154.101.204/assets/index-Dg5mSCCW.css)"
printf "%-28s %s\n" "/api/pilot gate" "$(curl -s -o /dev/null -w '%{http_code}' -X POST https://66.154.101.204/api/pilot/cases -H 'content-type: application/json' -d '{}')"
printf "%-28s %s\n" "/clinic/" "$(curl -s -o /dev/null -w '%{http_code}' https://66.154.101.204/clinic/)"
printf "%-28s %s\n" "/mobile/" "$(curl -s -o /dev/null -w '%{http_code}' https://66.154.101.204/mobile/)"


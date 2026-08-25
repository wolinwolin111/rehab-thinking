set -u
echo "---combined.conf FULL---"
sudo cat /etc/nginx/sites-enabled/combined.conf
echo "---services-listening---"
ss -tlnp 2>/dev/null | grep -E "LISTEN" | awk '{print $4, $6}'
echo "---pm2/systemd node-ish---"
systemctl list-units --type=service --state=running 2>/dev/null | grep -iE "node|gunicorn|clinic|shop|rehab|python" || true
echo "---webroots---"
ls /var/www 2>/dev/null
echo "---certs---"
sudo ls /etc/letsencrypt/live 2>/dev/null

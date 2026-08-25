set -u
echo "---nginx-combined-head---"
sudo sed -n '1,60p' /etc/nginx/sites-enabled/combined.conf
echo "---ufw-full---"
sudo ufw status numbered | head -20
echo "---npm-global-prefix---"
npm prefix -g
echo "---existing-rehab-dir---"
ls -la ~/rehabmind 2>/dev/null || echo "no ~/rehabmind"
ls -d ~/*/package.json 2>/dev/null | head -5

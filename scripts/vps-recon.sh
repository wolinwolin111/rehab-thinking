set -u
echo "USER=$(whoami)"
echo "HOST=$(hostname)"
lsb_release -ds 2>/dev/null || head -1 /etc/os-release
echo "NODE=$(node -v 2>/dev/null || echo none)"
echo "NPM=$(npm -v 2>/dev/null || echo none)"
echo "GIT=$(git --version 2>/dev/null || echo none)"
echo "PM2=$(pm2 -v 2>/dev/null || echo none)"
echo "---mem---"
free -m | head -2
echo "---disk---"
df -h / | tail -1
echo "---ports---"
ss -tln | awk '{print $4}' | grep -E ':(80|443|8080|3098|3000|3100)$' | sort -u
echo "---nginx-sites---"
ls /etc/nginx/sites-enabled 2>/dev/null
echo "---sudo---"
sudo -n true 2>&1 && echo SUDO_OK || echo SUDO_NEEDS_PW
echo "---ufw---"
sudo -n ufw status 2>/dev/null | head -5
echo "---build-tools---"
which make g++ python3 2>/dev/null | wc -l

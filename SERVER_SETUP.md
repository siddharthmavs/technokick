# TechnoKick — Server Setup & Deployment Guide

**Target:** Ubuntu (AWS EC2 `ip-172-31-40-165`)
**Domain:** `technokick.mav-s.com`
**Deploy path:** `/var/www/technokick`
**Repo path:** `/opt/repos/technokick`

---

## 1. Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install core dependencies
sudo apt install -y git curl nginx ufw python3 python3-pip python3-venv

# Install Node.js 20 (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Yarn
sudo npm install -g yarn

# Install PM2
sudo npm install -g pm2

# Install MongoDB (Community Edition)
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl enable mongod && sudo systemctl start mongod
```

---

## 2. Clone & Directory Setup

```bash
# Create directories
sudo mkdir -p /opt/repos /var/www/technokick
sudo chown -R $USER:$USER /opt/repos /var/www/technokick

# Clone repo
cd /opt/repos
git clone <your-repo-url> technokick
cd technokick
```

---

## 3. Backend Setup

```bash
cd /opt/repos/technokick/backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env   # or create from scratch (see Section 4)
nano .env
```

### Start backend with PM2

```bash
cd /opt/repos/technokick/backend

pm2 start "source venv/bin/activate && uvicorn server:app --host 127.0.0.1 --port 8001" \
  --name technokick-backend \
  --interpreter bash

pm2 save
pm2 startup   # follow the printed sudo command
```

---

## 4. Environment Variables

### Backend — `/opt/repos/technokick/backend/.env`

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017
DB_NAME=technokick

# JWT — generate with: python3 -c "import secrets; print(secrets.token_hex(64))"
JWT_SECRET=<generate-a-strong-64-char-hex-secret>

# Admin credentials
ADMIN_EMAIL=admin@technokick.com
ADMIN_PASSWORD=<strong-password-min-12-chars>

# Google OAuth — from Google Cloud Console
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com

# Web Push (VAPID) — generate with: python3 -c "from py_vapid import Vapid; v=Vapid(); v.generate_keys(); print(v.private_key.decode(), v.public_key.decode())"
VAPID_PRIVATE_KEY=<your-vapid-private-key>
VAPID_PUBLIC_KEY=<your-vapid-public-key>
VAPID_SUBJECT=mailto:admin@technokick.com

# Set to "true" only on first run to seed demo data
SEED_DB=false

# Environment
ENV=production
```

### Frontend — `/opt/repos/technokick/frontend/.env`

```env
REACT_APP_GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
REACT_APP_API_URL=https://technokick.mav-s.com/api
```

---

## 5. Frontend Build

```bash
cd /opt/repos/technokick/frontend

# Install dependencies
yarn install

# Build production bundle
yarn build

# Copy build output to web root
sudo cp -r build/* /var/www/technokick/
```

---

## 6. Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/technokick
```

Paste the following:

```nginx
server {
    listen 80;
    server_name technokick.mav-s.com;

    # Redirect HTTP to HTTPS (uncomment after SSL is set up)
    # return 301 https://$host$request_uri;

    root /var/www/technokick;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # React SPA — serve index.html for all non-file routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to FastAPI backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable the site
sudo ln -sf /etc/nginx/sites-available/technokick /etc/nginx/sites-enabled/technokick

# Remove default site if present
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

---

## 7. SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate (Nginx plugin handles config automatically)
sudo certbot --nginx -d technokick.mav-s.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

After Certbot runs, your nginx config will be updated with HTTPS. Confirm the redirect block is active:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 8. Firewall (UFW)

```bash
# Allow SSH, HTTP, HTTPS only
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

> Backend port 8001 is **not** opened — it's only accessible via nginx proxy on localhost.

---

## 9. PM2 Process Management

```bash
# View running processes
pm2 list

# View backend logs
pm2 logs technokick-backend

# Restart backend (after code changes)
pm2 restart technokick-backend

# Stop / delete
pm2 stop technokick-backend
pm2 delete technokick-backend
```

---

## 10. Deploy Script

Save as `/opt/repos/technokick/deploy.sh` and make executable with `chmod +x deploy.sh`.

```bash
#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/opt/repos/technokick"
WEB_ROOT="/var/www/technokick"

echo "==> Pulling latest code..."
cd "$REPO_DIR"
git pull origin main

echo "==> Installing backend dependencies..."
cd "$REPO_DIR/backend"
source venv/bin/activate
pip install -r requirements.txt --quiet

echo "==> Restarting backend..."
pm2 restart technokick-backend

echo "==> Installing frontend dependencies..."
cd "$REPO_DIR/frontend"
yarn install --frozen-lockfile --silent

echo "==> Building frontend..."
yarn build

echo "==> Deploying frontend build..."
sudo rm -rf "$WEB_ROOT"/*
sudo cp -r build/* "$WEB_ROOT/"

echo "==> Reloading nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "Deploy complete. Site: https://technokick.mav-s.com"
```

Run a deploy:

```bash
cd /opt/repos/technokick
./deploy.sh
```

> Tip: Add your deploy user to sudoers for passwordless `nginx` and `cp` if you want to run this non-interactively (e.g. from CI).

---

## 11. Troubleshooting

### Backend not responding

```bash
pm2 logs technokick-backend --lines 50
# Check if process is running
pm2 list
# Manually test
curl http://127.0.0.1:8001/health
```

### Nginx 502 Bad Gateway

```bash
# Backend may be down
pm2 restart technokick-backend
# Check nginx error log
sudo tail -n 50 /var/log/nginx/error.log
```

### Frontend shows blank page / old version

```bash
# Rebuild and redeploy
cd /opt/repos/technokick/frontend
yarn build
sudo cp -r build/* /var/www/technokick/
# Hard-refresh browser (Ctrl+Shift+R)
```

### MongoDB connection refused

```bash
sudo systemctl status mongod
sudo systemctl start mongod
# Check mongo is listening
ss -tlnp | grep 27017
```

### SSL certificate renewal issues

```bash
sudo certbot renew --dry-run
sudo systemctl status certbot.timer
```

### Check all service statuses

```bash
pm2 list
sudo systemctl status nginx mongod
sudo ufw status
```

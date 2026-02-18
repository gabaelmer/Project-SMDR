#!/bin/bash

# SMDR Insight - Universal Production Installer (v1.3)
# High-stability installer with dynamic user detection and root support.

set -e

REPO_URL="https://github.com/gabaelmer/Project-SMDR.git"
INSTALL_DIR="/opt/smdr-insight"

echo "--- SMDR Insight Discovery & Installation ---"

# 1. Root & User Detection
if [ "$EUID" -ne 0 ]; then
  echo "Error: Please run as root or with sudo."
  exit 1
fi

# Detect the real user if running under sudo, otherwise use root
if [ -n "$SUDO_USER" ]; then
    SERVICE_USER="$SUDO_USER"
    echo "Detected sudo user: $SERVICE_USER. Service will run under this account."
else
    SERVICE_USER="root"
    echo "Running as root user directly. Service will run as root."
fi

# 2. System Check & Dependencies
echo "[1/6] Installing system dependencies..."
apt-get update
apt-get install -y git build-essential curl

# 3. Node.js Environment
if ! command -v node &> /dev/null; then
    echo "[2/6] Node.js not found. Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# 4. Preparation
echo "[3/6] Stopping existing services and preparing directory..."
systemctl stop smdr-insight || true

if [ -d "$INSTALL_DIR" ]; then
    echo "Updating existing installation at $INSTALL_DIR..."
    chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR
    cd $INSTALL_DIR
    sudo -u $SERVICE_USER git pull || (rm -rf .git && sudo -u $SERVICE_USER git clone $REPO_URL .)
else
    mkdir -p $INSTALL_DIR
    chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR
    sudo -u $SERVICE_USER git clone $REPO_URL $INSTALL_DIR
    cd $INSTALL_DIR
fi

# 5. Native-Targeted Build
echo "[4/6] Building project for system Node..."
# Force clear node_modules to ensure native parity
rm -rf node_modules dist

sudo -u $SERVICE_USER npm install
sudo -u $SERVICE_USER npm run build

echo "Rebuilding native modules for $(node -v) as $SERVICE_USER..."
sudo -u $SERVICE_USER npm rebuild better-sqlite3

# Final ownership check before starting service
chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR

# 6. Systemd Service Integration
echo "[5/6] Configuring universal systemd service..."
SERVICE_FILE="/etc/systemd/system/smdr-insight.service"
NODE_PATH=$(which node)

cat <<EOF > $SERVICE_FILE
[Unit]
Description=SMDR Insight Logger Service (Node)
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$NODE_PATH dist/main/main/node-server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# 7. Final Deployment
echo "[6/6] Starting SMDR Insight service..."
systemctl daemon-reload
systemctl enable smdr-insight
systemctl reset-failed smdr-insight || true
systemctl restart smdr-insight

echo "--------------------------------------------------"
echo "SMDR Insight installed successfully!"
echo "Service running as: $SERVICE_USER"
echo "Service status: $(systemctl is-active smdr-insight)"
echo "Web Interface: http://$(hostname -I | awk '{print $1}'):3000"
echo "--------------------------------------------------"

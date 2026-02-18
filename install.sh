#!/bin/bash

# SMDR Insight - Production-Ready Node Installer (v1.2)
# High-stability installer for pure Node.js background services.

set -e

REPO_URL="https://github.com/gabaelmer/Project-SMDR.git"
INSTALL_DIR="/opt/smdr-insight"
SERVICE_USER="elmer" # Targeted service user

echo "--- SMDR Insight Production Installer ---"

# 1. System Check & Dependencies
echo "[1/6] Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y git build-essential curl

# 2. Node.js Environment
if ! command -v node &> /dev/null; then
    echo "[2/6] Node.js not found. Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 3. Preparation
echo "[3/6] Stopping existing services and preparing directory..."
sudo systemctl stop smdr-insight || true

if [ -d "$INSTALL_DIR" ]; then
    echo "Using existing installation at $INSTALL_DIR..."
    sudo chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR
    cd $INSTALL_DIR
    sudo -u $SERVICE_USER git pull || (sudo rm -rf .git && sudo -u $SERVICE_USER git clone $REPO_URL .)
else
    sudo mkdir -p $INSTALL_DIR
    sudo chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR
    sudo -u $SERVICE_USER git clone $REPO_URL $INSTALL_DIR
    cd $INSTALL_DIR
fi

# 4. Native-Targeted Build
echo "[4/6] Building project for system Node..."
# Force clear node_modules to ensure native parity
sudo rm -rf node_modules dist

sudo -u $SERVICE_USER npm install
sudo -u $SERVICE_USER npm run build

echo "Rebuilding native modules for $(node -v) as $SERVICE_USER..."
sudo -u $SERVICE_USER npm rebuild better-sqlite3

# Final ownership check before starting service
sudo chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR

# 5. Systemd Service Integration
echo "[5/6] Configuring high-stability systemd service..."
SERVICE_FILE="/etc/systemd/system/smdr-insight.service"
NODE_PATH=$(which node)

cat <<EOF | sudo tee $SERVICE_FILE
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

# 6. Final Deployment
echo "[6/6] Starting SMDR Insight service..."
sudo systemctl daemon-reload
sudo systemctl enable smdr-insight
sudo systemctl reset-failed smdr-insight || true
sudo systemctl restart smdr-insight

echo "--------------------------------------------------"
echo "SMDR Insight installed successfully!"
echo "Service status: $(sudo systemctl is-active smdr-insight)"
echo "Web Interface: http://$(hostname -I | awk '{print $1}'):3000"
echo "--------------------------------------------------"

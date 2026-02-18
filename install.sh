#!/bin/bash

# SMDR Insight - Robust Node Installer
# This script clones the repo, builds the project, and sets up a pure Node.js systemd service.

set -e

REPO_URL="https://github.com/gabaelmer/Project-SMDR.git"
INSTALL_DIR="/opt/smdr-insight"
SERVICE_USER=$USER
if [ "$SERVICE_USER" == "root" ]; then
    SERVICE_USER="elmer" # Fallback to common user
fi

echo "--- SMDR Insight Installer ---"

# 1. Install System Dependencies
echo "Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y git build-essential curl

# 2. Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 3. Setup Install Directory
echo "Setting up installation directory: $INSTALL_DIR"
if [ -d "$INSTALL_DIR" ]; then
    echo "Updating existing installation..."
    cd $INSTALL_DIR
    sudo git pull || (sudo chown -R $USER:$USER $INSTALL_DIR && git pull)
else
    sudo mkdir -p $INSTALL_DIR
    sudo git clone $REPO_URL $INSTALL_DIR
fi

# Ensure correct ownership before building
sudo chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR
cd $INSTALL_DIR

# 4. Build Project (ONCE during installation)
echo "Installing dependencies and building project..."
sudo -u $SERVICE_USER npm install
sudo -u $SERVICE_USER npm run build

# 5. Setup Systemd Service
echo "Configuring systemd service..."
SERVICE_FILE="/etc/systemd/system/smdr-insight.service"
NPM_PATH=$(which npm)

cat <<EOF | sudo tee $SERVICE_FILE
[Unit]
Description=SMDR Insight Logger Service (Node)
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$NPM_PATH run serve:node
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# 6. Start Service
echo "Starting SMDR Insight service..."
sudo systemctl daemon-reload
sudo systemctl enable smdr-insight
sudo systemctl restart smdr-insight

echo "--------------------------------------------------"
echo "SMDR Insight installed successfully!"
echo "Service status: $(sudo systemctl is-active smdr-insight)"
echo "Web Interface: http://$(hostname -I | awk '{print $1}'):3000"
echo "--------------------------------------------------"

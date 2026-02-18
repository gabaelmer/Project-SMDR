#!/bin/bash

# SMDR Insight - Pure Node Installer
# This script clones the repo, builds the project, and sets up a pure Node.js systemd service.

set -e

REPO_URL="https://github.com/gabaelmer/Project-SMDR.git"
INSTALL_DIR="/opt/smdr-insight"
SERVICE_USER=$USER
if [ "$SERVICE_USER" == "root" ]; then
    SERVICE_USER="elmer" # Fallback to common user if run as sudo but need a non-root user
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
    sudo chown -R $USER:$USER $INSTALL_DIR
    cd $INSTALL_DIR
    git pull
else
    sudo mkdir -p $INSTALL_DIR
    sudo chown -R $USER:$USER $INSTALL_DIR
    git clone $REPO_URL $INSTALL_DIR
    cd $INSTALL_DIR
fi

# 4. Build Project
echo "Installing dependencies and building project..."
npm install
npm run build
npm run rebuild:native

# 5. Setup Systemd Service
echo "Configuring systemd service..."
SERVICE_FILE="/etc/systemd/system/smdr-insight.service"

cat <<EOF | sudo tee $SERVICE_FILE
[Unit]
Description=SMDR Insight Logger Service (Node)
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$(which npm) run serve:node
Restart=always
Environment=NODE_ENV=production
# No DISPLAY environment needed for pure Node mode

[Install]
WantedBy=multi-user.target
EOF

# 6. Start Service
echo "Starting SMDR Insight service..."
sudo systemctl daemon-reload
sudo systemctl enable smdr-insight
sudo systemctl restart smdr-insight # Use restart to ensure fresh start

echo "--------------------------------------------------"
echo "SMDR Insight installed successfully!"
echo "Service status: $(sudo systemctl is-active smdr-insight)"
echo "Web Interface: http://$(hostname -I | awk '{print $1}'):3000"
echo "--------------------------------------------------"

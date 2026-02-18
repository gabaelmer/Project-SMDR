#!/bin/bash

# SMDR Insight - Installation Script
# This script downloads and installs the latest version of SMDR Insight from GitHub.

set -e

REPO="gabaelmer/Project-SMDR"
LATEST_RELEASE_URL="https://api.github.com/repos/$REPO/releases/latest"

echo "Checking for the latest release of SMDR Insight..."

# Get the latest deb package URL
DEB_URL=$(curl -s $LATEST_RELEASE_URL | grep "browser_download_url.*deb" | cut -d '"' -f 4 | head -n 1)

if [ -z "$DEB_URL" ]; then
    echo "Error: Could not find a .deb package in the latest release."
    exit 1
fi

PACKAGE_NAME=$(basename "$DEB_URL")
TMP_DEB="/tmp/$PACKAGE_NAME"

echo "Downloading $PACKAGE_NAME..."
curl -L -o "$TMP_DEB" "$DEB_URL"

echo "Installing SMDR Insight..."
sudo dpkg -i "$TMP_DEB" || sudo apt-get install -f -y

echo "SMDR Insight has been installed successfully!"
echo "You can launch it from your application menu or by running 'smdr-insight'."

# Clean up
rm "$TMP_DEB"

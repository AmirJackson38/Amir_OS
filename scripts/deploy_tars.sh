#!/bin/bash

# TARS Deployment Helper Script
# Requirements:
# - Connect using: admin@tars.local
# - Never use hardcoded IP addresses.
# - Fail gracefully if Pi unreachable, SSH fails, or Docker service unavailable.

set -e

echo "Starting TARS deployment to Pi..."
echo "Attempting to connect via mDNS (admin@tars.local)..."

ssh admin@tars.local << 'EOF'
  set -e
  echo "✓ Connected"
  
  cd /home/admin/tars-face || { echo "TARS directory not found! Failing gracefully."; exit 1; }
  
  git fetch origin master || { echo "Git fetch failed! Failing gracefully."; exit 1; }
  git reset --hard FETCH_HEAD || { echo "Git reset failed! Failing gracefully."; exit 1; }
  echo "✓ Repository synchronized"
  
  docker restart tars_backend || { echo "Docker service unavailable or restart failed! Failing gracefully."; exit 1; }
  echo "✓ Containers restarted"
EOF

if [ $? -eq 0 ]; then
  echo "Deployment successful."
else
  echo "Deployment failed."
  exit 1
fi

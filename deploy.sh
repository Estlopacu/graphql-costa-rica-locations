#!/usr/bin/env bash
set -euo pipefail

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd "$(dirname "$0")"
git pull --ff-only

cd server
npm ci
npm run codegen
npm run build

sudo systemctl restart cr-locations
sudo systemctl status cr-locations --no-pager | head -5

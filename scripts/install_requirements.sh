#!/bin/sh
# TEDI-2026/scripts/install_requirements.sh

# creates the backend virtual environment and installs both sides' packages
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# setup backend  
cd "$ROOT/backend"
python3 -m venv venv
venv/bin/pip install --upgrade pip
venv/bin/pip install -r requirements.txt

# setup frontend
cd "$ROOT/frontend"
npm install

# create the self-signed certificates for SSL/TLS
"$ROOT/scripts/make_certs.sh"

echo "The installation and the creation of certificates is done - now activate the venv:  source backend/venv/bin/activate"

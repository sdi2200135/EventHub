#!/bin/sh
# TEDI-2026/scripts/make_certs.sh

# creates the self-signed certificate used to serve the app over HTTPS for 1 year
mkdir -p "$(dirname "$0")/../certs"
openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -keyout "$(dirname "$0")/../certs/localhost-key.pem" \
  -out    "$(dirname "$0")/../certs/localhost.pem" \
  -subj "/C=GR/ST=Attica/L=Athens/O=EventHub/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:127.0.0.1,IP:127.0.0.1"

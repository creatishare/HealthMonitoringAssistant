#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
NGINX_CONF="$ROOT_DIR/nginx/default.conf"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

require_file() {
  [ -f "$1" ] || fail "missing file: $1"
}

require_match() {
  local file="$1"
  local pattern="$2"
  local message="$3"

  grep -Eq "$pattern" "$file" || fail "$message"
}

for path in "$COMPOSE_FILE" "$NGINX_CONF"; do
  require_file "$path"
done

require_match "$COMPOSE_FILE" '"80:80"' "docker-compose.yml must expose HTTP port 80 for redirects and ACME challenges"
require_match "$COMPOSE_FILE" '"443:443"' "docker-compose.yml must expose HTTPS port 443"
require_match "$COMPOSE_FILE" './nginx/default\.conf:/etc/nginx/conf\.d/default\.conf:ro' "nginx/default.conf must be mounted into the nginx container"
require_match "$COMPOSE_FILE" './nginx/ssl:/etc/nginx/ssl:ro' "TLS certificate directory must be mounted read-only"
require_match "$COMPOSE_FILE" './nginx/www:/var/www/certbot:ro' "ACME webroot directory must be mounted read-only"

require_match "$NGINX_CONF" 'listen[[:space:]]+80;' "nginx must listen on port 80"
require_match "$NGINX_CONF" 'return[[:space:]]+301[[:space:]]+https://\$host\$request_uri;' "HTTP must redirect to HTTPS"
require_match "$NGINX_CONF" 'location[[:space:]]+/\.\well-known/acme-challenge/' "ACME challenge path must stay on HTTP"
require_match "$NGINX_CONF" 'listen[[:space:]]+443[[:space:]]+ssl[[:space:]]+http2;' "nginx must listen on HTTPS"
require_match "$NGINX_CONF" 'ssl_certificate[[:space:]]+/etc/nginx/ssl/fullchain\.pem;' "nginx must load the fullchain certificate"
require_match "$NGINX_CONF" 'ssl_certificate_key[[:space:]]+/etc/nginx/ssl/privkey\.pem;' "nginx must load the private key"
require_match "$NGINX_CONF" 'Strict-Transport-Security' "HSTS header must be enabled"
require_match "$NGINX_CONF" 'Content-Security-Policy[^\n]*upgrade-insecure-requests' "CSP must upgrade insecure requests"
require_match "$NGINX_CONF" 'location[[:space:]]+/api/' "API proxy location must exist"
require_match "$NGINX_CONF" 'proxy_pass[[:space:]]+http://backend:3001/;' "API proxy must strip the /api/ prefix before forwarding"
require_match "$NGINX_CONF" 'X-Forwarded-Proto[[:space:]]+\$scheme' "nginx must forward the original scheme"

if grep -Eq 'proxy_pass[[:space:]]+http://backend:3001/api' "$NGINX_CONF"; then
  fail "API proxy must not forward the /api prefix to the backend"
fi

if grep -R "http://" "$ROOT_DIR/src/frontend/src" "$ROOT_DIR/src/frontend/index.html" >/dev/null 2>&1; then
  fail "frontend source contains hard-coded http:// URLs that may cause mixed content"
fi

echo "HTTPS nginx configuration checks passed."

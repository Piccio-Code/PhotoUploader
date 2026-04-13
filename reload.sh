#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/root/PhotoUploader}"
API_SERVICE="${API_SERVICE:-photouploader-api}"
FRONTEND_SERVICE="${FRONTEND_SERVICE:-photouploader-admin-frontend}"

log() {
  printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd git
require_cmd go
require_cmd npm
require_cmd systemctl

if [[ ! -d "$PROJECT_ROOT" ]]; then
  echo "Project root not found: $PROJECT_ROOT" >&2
  exit 1
fi

cd "$PROJECT_ROOT"

log "Pull latest changes"
git pull --ff-only

log "Build API binary"
mkdir -p bin
go build -o bin/api ./cmd/api/main.go

log "Install frontend dependencies"
cd "$PROJECT_ROOT/fronted"
npm ci

log "Build frontend"
npm run build

log "Restart services"
sudo systemctl restart "$API_SERVICE"
sudo systemctl restart "$FRONTEND_SERVICE"

log "Service status"
sudo systemctl --no-pager --full status "$API_SERVICE"
sudo systemctl --no-pager --full status "$FRONTEND_SERVICE"

log "Reload completed"

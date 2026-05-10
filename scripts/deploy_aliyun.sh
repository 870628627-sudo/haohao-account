#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/www/haohao-account}"
APP_NAME="${APP_NAME:-haohao-account}"
BRANCH="${BRANCH:-main}"
REPO_URL="${REPO_URL:-https://github.com/870628627-sudo/haohao-account.git}"
BACKUP_DIR="${BACKUP_DIR:-/backup/haohao-account}"
DEPLOY_SHA="${DEPLOY_SHA:-}"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required. Install it first: apt install -y git"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node.js 22 first."
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "Node.js 22+ is required because this app uses node:sqlite. Current: $(node -v)"
  exit 1
fi

mkdir -p "$(dirname "$APP_DIR")"

if [ ! -d "$APP_DIR/.git" ]; then
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

if [ -f data/haohudget.sqlite ]; then
  mkdir -p "$BACKUP_DIR"
  TS="$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BACKUP_DIR/$TS"
  cp -f data/haohudget.sqlite "$BACKUP_DIR/$TS/" || true
  cp -f data/haohudget.sqlite-wal "$BACKUP_DIR/$TS/" 2>/dev/null || true
  cp -f data/haohudget.sqlite-shm "$BACKUP_DIR/$TS/" 2>/dev/null || true
  echo "Database backup created: $BACKUP_DIR/$TS"
fi

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [ -n "$DEPLOY_SHA" ]; then
  CURRENT_SHA="$(git rev-parse HEAD)"
  if [ "$CURRENT_SHA" != "$DEPLOY_SHA" ]; then
    echo "Warning: deployed $CURRENT_SHA, expected $DEPLOY_SHA"
  fi
fi

if [ -f package-lock.json ]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi

if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 reload "$APP_NAME" --update-env || pm2 restart "$APP_NAME" --update-env
else
  pm2 start ecosystem.config.cjs
fi

pm2 save

if command -v curl >/dev/null 2>&1; then
  curl -fsS http://127.0.0.1:5177 >/dev/null
fi

echo "Deploy finished for $APP_NAME at $(date -Is)"

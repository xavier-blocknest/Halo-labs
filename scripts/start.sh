#!/bin/sh
# Container entry point: make sure packages match package-lock.json, build the browser app once, then keep both
# halves live: vite rebuilds dist/ when src/ changes, node restarts the server when server/ changes.
set -e
cd /app
want=$(sha256sum package-lock.json)
if [ ! -f node_modules/.lock-hash ] || [ "$(cat node_modules/.lock-hash)" != "$want" ]; then
  echo "start: installing packages (package-lock.json changed)…"
  npm ci --no-audit --no-fund
  echo "$want" > node_modules/.lock-hash
fi
echo "start: building the app…"
npx vite build --logLevel warn || echo "start: browser build failed; fix the error above (the server still starts)"
npx vite build --watch --logLevel warn &
exec node --watch-path=server server/index.ts

# Halo Labs: one container running the app server, the background syncs and the inbox watcher.
# The code folder is mounted over /app by docker-compose.yml, so edits on the Mac go live without a rebuild
# (scripts/start.sh watches both the server and the browser code). The copy below makes the image work on its own too.
FROM node:24-bookworm-slim

# pdftotext (lab, DEXA and VO₂ PDFs), unzip (zipped exports), tar (backups)
RUN apt-get update \
 && apt-get install -y --no-install-recommends poppler-utils unzip tar ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund && sha256sum package-lock.json > node_modules/.lock-hash
COPY . .
RUN npm run build && chown -R node:node /app

USER node
ENV HOST=0.0.0.0 PORT=8787 NODE_ENV=production
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
  CMD node -e "fetch('http://127.0.0.1:8787/api/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["sh", "scripts/start.sh"]

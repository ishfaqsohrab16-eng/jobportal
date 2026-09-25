# DigiBizz Jobs - API + web in ONE service (for Hostinger VPS / Easypanel).
#
# Express serves /api/* and the built React app from the same origin, so a single
# container, a single domain and a single port (3000) are all that's needed.
# MongoDB runs as its own Easypanel service; point MONGODB_URI at it.

# ---------------------------------------------------------------- build
FROM node:22-alpine AS build
WORKDIR /app
# mongodb-memory-server is a dev/test dependency; stop it downloading a ~600 MB mongod.
ENV MONGOMS_DISABLE_POSTINSTALL=1

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --no-audit --no-fund

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/web apps/web
RUN npm run build -w @digibizz/jobs-web && npm run build -w @digibizz/jobs-api

# --------------------------------------------------- runtime dependencies
FROM node:22-alpine AS deps
WORKDIR /app
ENV MONGOMS_DISABLE_POSTINSTALL=1
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# Only the API's production dependencies (the web app is static files by now).
RUN npm ci --omit=dev --workspace @digibizz/jobs-api --include-workspace-root=false --no-audit --no-fund \
 && npm cache clean --force

# ---------------------------------------------------------------- runtime
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    WEB_DIST_DIR=/app/web \
    UPLOAD_DIR=/data/uploads

COPY --from=deps /app/node_modules ./node_modules
# Provides "type": "module" for the ESM bundle in dist/.
COPY apps/api/package.json ./package.json
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/web/dist ./web

# Uploaded resumes live here - mount a persistent volume at /data in Easypanel.
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node

EXPOSE 3000
# Use the port the app actually listens on - Easypanel may inject PORT (e.g. 80).
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/api/health" > /dev/null || exit 1

CMD ["node", "dist/index.js"]

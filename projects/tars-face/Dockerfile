# TARS Node backend container — Phase 9.1
# Runs the TARS face runtime server (static frontend + REST + WebSocket event bus).
# Non-root container, isolated network, single published port 8080.
#
# Build context: projects/tars-face (the repo subtree root)
FROM node:20-alpine

# --- Runtime non-root user -------------------------------------------------
# node:20-alpine already provides a `node` user/group with UID 1000.
USER node

# --- Static deps first for layer caching ---
WORKDIR /srv/tars
COPY --chown=node:node pi-server/package.json pi-server/package-lock.json ./pi-server/
RUN npm ci --omit=dev --prefix ./pi-server \
    && npm cache clean --force 2>/dev/null || true

# --- Application code ---
# server.js computes ROOT = path.resolve(__dirname, "..") so the frontend
# assets must live one level above pi-server: /srv/tars/tars_face_v1.html
COPY --chown=node:node pi-server/ ./pi-server/
COPY --chown=node:node tars_face_v1.html ./tars_face_v1.html
COPY --chown=node:node three.module.js ./three.module.js
COPY --chown=node:node config/ ./config/
COPY --chown=node:node assets/ ./assets/

USER node
WORKDIR /srv/tars/pi-server
EXPOSE 8080

# Graceful shutdown + no DB/network deps required at boot.
CMD ["node", "server.js"]
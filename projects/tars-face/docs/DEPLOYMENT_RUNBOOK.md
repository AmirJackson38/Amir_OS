# TARS Node — Deployment Runbook

**Phase**: 9.1 (artifacts ready) → **9.2 execution** (manual, on the Pi node `tars`)
**Device**: `admin@192.168.0.102` (Pi 4, Debian 13, Docker `restart: unless-stopped` model)
**Scope**: Deploy ONLY the `projects/tars-face` subtree. No CI/CD, no auto-update.

---

## 1. Pre-Deployment Checks (on the node, read-only)

```bash
# 1. Confirm existing homelab services are untouched (baseline)
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
#   Expect: worldmonitor(:3000), tse_fastapi_backend(:8000), tse_postgres_db(:5432),
#           worldmonitor-redis, worldmonitor-ais-relay, worldmonitor-redis-rest, duckdns  -- ALL STILL UP

# 2. Confirm :8080 is free (TARS slot)
ss -tlnp | grep ':8080' && echo "8080 BUSY - ABORT" || echo "8080 FREE"

# 3. Confirm swap/RAM headroom (4GB Pi)
free -h
```

---

## 2. Fetch the subtree (deploy only `projects/tars-face`)

```bash
cd /home/admin

# Option B (approved): git sparse checkout of just projects/tars-face
git clone --depth 1 https://github.com/AmirJackson38/Amir_OS.git tars-face
cd tars-face
git sparse-checkout init --cone
git sparse-checkout set projects/tars-face

# Verify tree
ls projects/tars-face
#   expect: Dockerfile docker-compose.yml .dockerignore config pi-server tars_face_v1.html three.module.js
```

> If you instead already have a full clone, prune to the subtree:
> ```bash
> git sparse-checkout init --cone && git sparse-checkout set projects/tars-face
> ```

---

## 3. Build & Start (Phase 9.2)

```bash
cd /home/admin/tars-face/projects/tars-face

# Build the image
docker build -t tars-backend:1.0.0 .

# Bring up (creates isolated network tars_net; publishes 8080 only)
docker compose up -d

# Health + logs
docker compose ps                 # expect: tars_backend  healthy
docker compose ps --format "table {{.Name}}\t{{.Status}}"
curl -s http://127.0.0.1:8080/health
docker compose logs -f --tail=50
```

### Expected `/health`
```json
{ "status": "ok", "uptime": N, ... "services": [ ... "tars.runtime":"up" ... ] }
```

---

## 4. Validation checklist (post-up)

| Check | Command | Pass |
|-------|---------|------|
| Container healthy | `docker compose ps` | `tars_backend` `healthy` |
| REST health | `curl -s http://127.0.0.1:8080/health` | `ok` |
| Frontend served | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/` | `200` |
| Local Three.js served | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/three.module.js` | `200` |
| No CDN in served page | `curl -s http://127.0.0.1:8080/ \| grep -c cdn.jsdelivr` | `0` |
| Offline render | load page with network dropped / CDN blocked | page renders (local module) |
| Restart policy | `sudo docker restart tars_backend` → status after 5s | comes back `healthy` |
| Only :8080 published | `docker ps --filter name=tars_backend --format '{{.Ports}}'` | `8080->8080` only |

---

## 5. Rollback (TARS only, homelab untouched)

```bash
# L2 — stop TARS backend, keep image for diagnostics
docker compose stop tars-backend

# L3 — full TARS removal
docker compose down                  # removes container + tars_net network
rm -rf /home/admin/tars-face        # remove deployment (PIs change not touched)

# Fallback to pre-Phase-9 manual runtime (nvm node, workstation-style)
cd /home/admin/tars-face/projects/tars-face/pi-server
export NVM_DIR=/home/admin/.nvm && . "$NVM_DIR/nvm.sh" && node server.js
```

**Invariant**: none of the commands above touch `worldmonitor`, `tse-production-lab`, `duckdns`, Postgres, or Ollama.

---

## 6. Kiosk / display — NOT in this phase

Touchscreen/Chromium kiosk is deferred (hardware-gated: no display attached). The backend is fully deployable without it; the face may be opened in any browser pointing at `http://<node>:8080`.
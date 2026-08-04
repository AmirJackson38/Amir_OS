# Phase 9.2 — TARS Node Deployment Result

**Date**: 2026-08-04
**Status**: ✅ SUCCESS — TARS backend + frontend running on the Pi node
**Node**: `tars` (`admin@192.168.0.102`)
**Commit deployed**: `6687c4e` ("Fix Phase 9.2 deployment runbook documentation")
**Image**: `tars-backend:1.0.0` (built on node)

---

## 1. Deployment Timeline

| Step | Result |
|------|--------|
| 1. SSH preflight | ✅ hostname `tars`, aarch64, Debian 13, docker 29.6.1 |
| 2. Before-state snapshot | ✅ recorded (see §3) |
| 3. Subtree deploy | ✅ sparse clone of `projects/tars-face` only (full Amir_OS NOT deployed) |
| 4. `docker compose build` | ✅ `tars-backend:1.0.0` built (arm64) |
| 5. `docker compose up -d` | ✅ `tars_backend` created on isolated `tars_net` network |
| 6. Validation | ✅ all checks pass (see §4) |
| 7. Coexistence verify | ✅ existing services unchanged (see §5) |
| 8. Report | ✅ this document |

---

## 2. Container Status

```
NAME          STATUS                PORTS
tars_backend  Up (healthy)          0.0.0.0:8080->8080/tcp
```

| Property | Value |
|----------|-------|
| Container name | `tars_backend` |
| Restart policy | `unless-stopped` ✅ |
| Health state | `healthy` ✅ |
| Published ports | `8080` only ✅ |
| Network | `tars_net` (bridge, isolated) ✅ |
| Non-root user | `node` (UID 1000) ✅ |
| Docker monitor (in-container) | self-disabled (no socket mount — by design) |

---

## 3. Before-State (recorded pre-deployment)

```
hostname : tars
arch     : aarch64
kernel   : 6.12.47+rpt-rpi-v8
disk     : / 115G total, 18G used, 93G avail (16%)
mem      : 3.7Gi total, 848Mi used, 2.9Gi available
net      : eth0 192.168.0.102 (gigabit), wlan0 10.0.0.231
:8080    : FREE
```

### Existing containers (before == after)

| Container | Before | After |
|-----------|--------|-------|
| worldmonitor | Up 11 days (healthy) | Up (healthy) — unchanged |
| worldmonitor-ais-relay | Up 11 days (healthy) | Up (healthy) — unchanged |
| worldmonitor-redis-rest | Up 11 days | Up — unchanged |
| worldmonitor-redis | Up 11 days | Up — unchanged |
| duckdns | Up 2 weeks | Up — unchanged |
| tse_fastapi_backend | Up 2 weeks | Up — unchanged |
| tse_postgres_db | Up 2 weeks | Up — unchanged |

---

## 4. Validation Results

| Check | Command | Result |
|-------|---------|--------|
| Container running | `docker compose ps` | `tars_backend` `Up (healthy)` ✅ |
| Restart policy active | `docker inspect` | `Restart=unless-stopped` ✅ |
| Healthcheck passing | `curl :8080/health` | `{"status":"ok",...}` all services `up` ✅ |
| Frontend HTTP | `curl :8080/` | **HTTP 200** ✅ |
| Local Three.js served | `curl :8080/three.module.js` | **HTTP 200**, 1,280,747 bytes ✅ |
| No CDN dependency | `grep -c cdn.jsdelivr` on served page | **0** ✅ |
| WS bridge | `curl :8080/ws` (plain GET) | 404 (expected non-upgrade); `wsbridge` `up` in /health ✅ |
| Network isolation | `docker network ls` | `tars_net` bridge created; no host net ✅ |
| Port exclusivity | `docker port tars_backend` | `8080/tcp -> 0.0.0.0:8080` only ✅ |

---

## 5. Coexistence Verification

All pre-existing services remain **unchanged and healthy**:

- **World Monitor** `:3000` — healthy
- **TSE FastAPI** `:8000` — healthy
- **Postgres** `:5432` — healthy
- **Ollama** `:11434` — healthy (untouched; not part of deploy)
- **DuckDNS** — healthy
- No existing container stopped, restarted, removed, or modified.

TARS occupies **only** `:8080` on the isolated `tars_net` bridge. No interference.

---

## 6. Deployment Path on Node

```
/home/admin/tars-face/            ← git clone (sparse: projects/tars-face only)
└── projects/tars-face/           ← deployed subtree (HEAD 6687c4e)
    ├── Dockerfile
    ├── docker-compose.yml
    ├── .dockerignore
    ├── config/tars-config.json
    ├── pi-server/                ← backend (server.js, event-bus, ws-bridge, services)
    ├── tars_face_v1.html
    └── three.module.js           ← local r161 (no CDN)
```

---

## 7. Rollback Instructions (TARS only — homelab untouched)

```bash
cd /home/admin/tars-face/projects/tars-face

# L2 — stop TARS backend, keep image for diagnostics
docker compose stop tars-backend

# L3 — full TARS removal
docker compose down               # removes container + tars_net network
cd /home/admin
rm -rf /home/admin/tars-face      # remove deployment (Pi's other services untouched)
```

> Manual fallback (pre-Phase-9 runtime) only applies while `/home/admin/tars-face` still exists:
> ```bash
> cd /home/admin/tars-face/projects/tars-face/pi-server
> export NVM_DIR=/home/admin/.nvm && . "$NVM_DIR/nvm.sh" && node server.js
> ```

**None of the above touches** World Monitor, TSE, Postgres, Ollama, or DuckDNS.

---

## 8. Notes / Known Behavior

- In-container Docker monitor reports "Docker socket not available — monitor disabled" — expected (no socket mounted; this is host-side observability only and does not affect TARS).
- Network monitor reports the `tars` host via `localhost`, which resolves to the container itself — harmless observability detail (documented in Phase 9.2 checklist).
- **Chromium, display packages, and touchscreen were NOT installed.** Kiosk is a later phase (display-gated).
- The TARS brain/world engine has officially "moved houses" to the Pi node: autonomy, world, physics, persistence, and the full frontend are now running on `tars` at `:8080`.

---

*Deployment completed. No application architecture modified. No features added. No existing Pi service modified.*

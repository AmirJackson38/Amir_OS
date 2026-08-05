# Phase 9.1 — TARS Node Deployment Preparation Plan

**Date**: 2026-08-04
**Status**: **SUPERSEDED BY EXECUTION** — Phase 9.1 artifacts created/validated, then deployed (Phase 9.2) and recovery-validated (Phase 9.3). See `PHASE_9_2_DEPLOYMENT_RESULT.md` and `PHASE_9_3_RECOVERY_TEST_REPORT.md`. This plan is retained as the historical design; Phase 9.4 is now in progress with kiosk service verification complete and display/touch/hardware reliability validation still open.
**Base commit**: `d32d81f` (Phase 8.5)
**Node reality**: `docs/PI_NODE_AUDIT.md` (verified live 2026-08-04)

---

## 0. Scope & Guardrails

This plan defines **where and how** TARS will be deployed onto the Pi node (`tars` @ `192.168.0.102`) WITHOUT disturbing the existing homelab. It deliberately:

- **Does not** publish on any port in use (3000, 8000, 5432, 11434).
- **Does not** modify `/home/admin/{worldmonitor,tse-production-lab,duckdns}` or their containers.
- **Does not** remove or restart Ollama / Postgres / TSE backend / DuckDNS.
- **Does not** require the touchscreen (which is **not physically attached** — see §6).
- Produces **zero runtime code changes** to `tars_face_v1.html` beyond a single, reversible import-line repoint (documented, not executed here).

Key reality driving this plan (from `PI_NODE_AUDIT.md`):
- TARS face is **greenfield on the node** — nothing to migrate.
- Port **8080 is free**; that is TARS' slot.
- Node.js exists only via `nvm` (not a system service) → **run TARS backend in Docker** for restart policy + dependency ordering.
- No Chromium/X11 → kiosk layer is **hardware-gated** until a display is attached.

---

## 1. Target Filesystem Layout

The repo already lives at `projects/tars-face` on the dev workstation. On the Pi it will sit under the existing per-project home convention.

### 1.1 Proposed Pi layout

```
/home/admin/tars-face/                  ← git checkout (shallow clone)
│
├── pi-server/
│   ├── server.js                       (unchanged backend)
│   ├── event-bus.js
│   ├── ws-bridge.js
│   ├── package.json                    (unchanged)
│   ├── Dockerfile                      (NEW — Phase 9.2 build artifact)
│   ├── .dockerignore                   (NEW)
│   └── services/
│       ├── alert-manager.js
│       ├── health-monitor.js
│       ├── status-reporter.js
│       └── infra/{docker-monitor,network-monitor}.js
│
├── config/
│   └── tars-config.json                (unchanged; port 8080 already default)
│
├── tars_face_v1.html                   (frontend — CDN import repointed locally)
├── three.module.js                     (r161, LOCAL Three.js — now referenced)
│
├── docker-compose.yml                  (NEW — Phase 9.2)
│
└── kiosk/
    └── tars-kiosk.service              (NEW — systemd template, install-gated)
```

### 1.2 Why this layout

- Mirrors `/home/admin/{worldmonitor,tse-production-lab,duckdns}` — one repo per project, `docker compose up -d` from each.
- `server.js` serves from `ROOT = path.resolve(__dirname, "..")` = `projects/tars-face` → `tars_face_v1.html` and `three.module.js` are already in the served root. **No change to serving logic.**
- `config/tars-config.json` sits adjacent and is read at startup (already expects port 8080).
- New deployment artifacts are **add-only files** (Dockerfile, compose, .dockerignore, kiosk service) — none alter existing runtime code.

---

## 2. Git Deployment Strategy

### 2.1 Single source of truth = the existing repo

The workstation repo (`Amir_OS`, origin `github.com/AmirJackson38/Amir_OS.git`) is the single source. The Pi **clones/pulls** it; it does not hand-edit.

### 2.2 Recommended (Phase 9.2) flow

```
[dev workstation]  commit + push  →  [GitHub]
                                        │  git clone / git pull (cron or manual)
                                        ▼
[Pi /home/admin/tars-face]  code + config + docker-compose.yml
                                        │  docker compose build && compose up -d
                                        ▼
                            container tars-backend :8080
```

```bash
# On Pi (post-approval, documented here only)
cd /home/admin
git clone https://github.com/AmirJackson38/Amir_OS.git tars-face
# or, for an existing checkout:
cd /home/admin/tars-face && git pull origin master
```

### 2.2.1 Which subtree to deploy

Options (choose in approval):

| Option | What ships to Pi | Pro | Con |
|--------|------------------|-----|-----|
| **A. Full repo** | entire `Amir_OS` | simple `git clone` | pulls unrelated dirs; large; scratch files present |
| **B. `projects/tars-face` subtree** | only the TARS project | clean, focused | still contains scratch test html files |
| **C. Filament / sparse filtered** | `projects/tars-face` minus scratch/dev files | cleanest | needs a deploy manifest |

**Recommendation: B**, dressed with a `.dockerignore` + explicit copy so scratch files (`test*.html`, `minimal_test.html`, etc.) never enter the image. Keep deployment via tag/branch, not SHA-unpinned master.

### 2.3 Reproducibility

- Pin images to a release tag (`tars-backend:1.0.0`) rather than `latest` for rollback.
- Commit the repo `HEAD` into the backend `/health` payload (chaotic; add a version file) so fleet can confirm which commit is running.
- `.gitignore` on Pi excludes runtime-only state (config secrets, compose overrides).

---

## 3. Frontend Serving Method

### 3.1 Decision matrix

| Method | Offline? | Pros | Cons |
|--------|----------|------|------|
| **A. Served by tars-backend container (:8080)** | ✅ (local module) | One process to run; reuses existing `server.js` static + REST + WS; kiosk points at same origin | Backend must be up to show the face |
| B. Static nginx container | ✅ | decoupled from backend | **No nginx installed today**; adds a dependency; would need to proxy WS + REST |
| C. `file://` | ❌ ties | zero-server | breaks REST/WS telemetry; breaks module import in Chromium for many configs |
| D. Dev-server (`vite`/`npm run`) | ❌ | dev convenience | requires `nvm` node on runtime; kiosk/fullscreen untested |

**Recommendation: A.** The face, autonomy, and persistence are client-side and offline-capable; the backend is the smallest viable HTTP+WS host. Serving the HTML and the local Three.js module together keeps **one failure domain**, and the kiosk points at `http://127.0.0.1:8080` (never `file://`).

### 3.2 The one code change (blocker, reversible)

`tars_face_v1.html` (dev WS; change ships in a normal commit):

```
FROM:  import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";
TO  :  import * as THREE from "/three.module.js";   // local, served by tars-backend
```

- Local `three.module.js` (r161) is **already committed** to the repo and **already servable** at `/three.module.js` (server `ROOT` includes it).
- Fully reversible: one line.
- Validation: load the page with backend stopped / no network → the face must still render (proves zero CDN dependency).

---

## 4. Backend Container Design

### 4.1 Container spec (target)

| Attribute | Value |
|-----------|-------|
| Image name | `tars-backend` |
| Base | `node:20-alpine` (arm64 via multi-arch / `linux/arm64` implicit on Pi) |
| Workdir | `/app` |
| Copy | `package.json`, `package-lock.json` → `npm ci --omit=dev` → copy `server.js`, `ws-bridge.js`, `event-bus.js`, `services/`, `config/`, `tars_face_v1.html`, `three.module.js` |
| Expose | `8080` (container-internal) |
| CMD | `["node", "server.js"]` |
| Restart | `unless-stopped` (set via compose) |
| Health | HTTP `GET /health` → `wget -q --spider http://127.0.0.1:8080/health` |
| User | run as non-root `node` user (alpine default) |

### 4.2 Frontend assets inside image

The image serves `tars_face_v1.html` and `three.module.js` from `/app` so kiosk only needs the backend URL.

### 4.3 Compose (top-level)

```yaml
services:
  tars-backend:
    build: ./deploy
    image: tars-backend:1.0.0
    container_name: tars_backend
    restart: unless-stopped
    ports:
      - "8080:8080"
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://127.0.0.1:8080/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    networks:
      - tars_net

networks:
  tars_net:
    driver: bridge
```

> Backend has **no external container deps** (no DB, no mqtt). It may be bridged to the homelab networks later; for now isolated on `tars_net`.

---

## 5. Port Assignments

### 5.1 Port inventory (verified live)

| Port | Owner (existing) | Keep | TARS uses |
|------|------------------|------|-----------|
| 22 | SSH | ✅ | — |
| 3000 | worldmonitor | ✅ | — |
| 8000 | TSE FastAPI | ✅ | — |
| 5432 | Postgres | ✅ | — |
| 8079 | worldmonitor redis-rest (loopback) | ✅ | — |
| 11434 | Ollama | ✅ | — (optional future hook) |
| **8080** | **FREE** | — | **TARS backend** |

### 5.2 Upstream/optional (future, not now)

| Port | Service | When |
|------|---------|------|
| 1883/8883 | MQTT broker | Phase 9+, only if a pub/sub consumer is added |
| 9000+ | Prometheus/Grafana | Phase 9+, only if monitoring stack adopted |

**Rule**: TARS grabs **8080** only; everything else is additive and gated behind actual need.

---

## 6. Interaction with Existing Docker Services

### 6.1 Byzantine-safe coexistence (verified)

| Existing container | TARS impact | Assurance |
|--------------------|-------------|-----------|
| worldmonitor (3000) | none | different port, isolated network |
| tse_fastapi_backend (8000) | none | different port |
| tse_postgres_db (5432) | none | TARS uses no DB; localStorage only |
| duckdns | none | unrelated |
| ollama (11434) | none (future: optional hinge) | TARS reads it, never controls it |
| docker0 (DOWN) | none | TARS on `tars_net` bridge, not `bridge` |

### 6.2 Adjacencies & shared hosts

- **Duplicate hostnames** `optiplex`/`truenas` in `tars-config.json` point at `192.168.0.100` (TrueNAS) — harmless to backend monitors; they fail gracefully if offline.
- **Resource budget**: Pi 4 / 4 GB. TARS backend is tiny (+~50–100 MB RSS). Ample headroom (currently 2.9 GiB free). No OOM-clash with postgres/worldmonitor.

### 6.3 Do NOT touch

- `/home/admin/worldmonitor`, `/home/admin/tse-production-lab`, `/home/admin/duckdns`.
- Running containers, their volumes, their networks.
- `phi3:mini` / Ollama.

---

## 7. Rollback Plan

### 7.1 Rollback levels

| Level | Trigger | Action | Down-time |
|-------|---------|--------|-----------|
| **L1 — frontend** | import repoint breaks rendering | revert the single line to CDN; rebuild+redeploy image | seconds (image rebuild) |
| **L2 — backend** | container error/crash-loop | `docker compose stop tars-backend`; run bare `nvm`node server.js` as before; or use pinned image `tars-backend:1.0.0` prevTag |
| **L3 — full** | any regression | `docker compose down` (removes tars-backend only); delete `/home/admin/tars-face/deploy` artifacts; existing workflow (`/:node server.js` + manual browser) is intact |
| **L4 — homelab safety** | unexpected intolerance | TARS never modifies worldmonitor/TSE/duckdns — nothing to restore; `docker inspect` diff on those is empty |

### 7.2 Rollback invariant

> Phase 9 adds deployment artifacts only (Dockerfile, compose, .dockerignore, kiosk service, local-import line). No autonomy/physics/persistence code is rewritten. The pre-Phase-9 manual run (`node server.js` + browser) remains valid as the fallback at every point.

### 7.3 Image version discipline

- Never tag `latest`-only on the node. Keep `tars-backend:1.0.0`, `:1.0.1`, etc. `docker compose` pins to a tag, so rollback = point compose at old tag and `up -d`.
- `/health` returns backend version + (future) git commit for traceability.

---

## 8. Sequencing & Verification (read-only until approval)

Order once approved (this doc does not execute):

1. **Frontend import repoint** → commit → verify offline render on another machine.
2. **Dockerfile + .dockerignore + compose** → commit.
3. **Kiosk service template** → commit (not installed yet).
4. **On-node bring-up** (clone, compose up, health curl) — deferred until a display is attached for the kiosk part.
5. **Validation** table below.

### Validation (post-approval, on node)

| Check | Expected |
|-------|----------|
| `docker compose up -d` healthchecks green | `tars_backend` state `healthy` |
| `curl http://127.0.0.1:8080/health` | `{"status":"ok",...}` |
| `curl http://127.0.0.1:8080/` | serves `tars_face_v1.html` |
| offline test (drop network / stop docker's CDN) | page renders from local module |
| service restart test | `docker restart tars_backend` → comes back `unless-stopped` |
| reboot test (future, hardware-gated) | container not auto-boot until host reboot logged |

---

## 8. Open Decisions for Approval

1. **Repo scope on Pi**: full clone vs `projects/tars-face` subtree vs spawn filtered? (Recommend: subtree B.)
2. **Deploy trigger**: manual `git pull`+`compose up` vs a lightweight cron watcher (recommend manual + a tiny docs runbook now; automation later).
3. **Display gating**: proceed now with build artifacts for the software backend, and **sequence the kiosk/physical** separately until the Hosyond screen is attached (recommend this split).
4. **nvm vs container**: keep backend container-only on the Pi (recommend), reserve `nvm` node for dev/tooling only.
5. **Naming**: container `tars_backend` + network `tars_net` + image tag scheme acceptable?

---

*This document describes the approved plan. Phase 9.1 implemented it (Dockerfile, docker-compose.yml, .dockerignore, local Three.js serving; all validated). Phase 9.2 executes the runbook in `DEPLOYMENT_RUNBOOK.md` on the Pi node. No Pi changes have been made.*

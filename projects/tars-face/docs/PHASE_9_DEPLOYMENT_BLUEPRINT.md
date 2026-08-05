# Phase 9 — T.A.R.S. Appliance Deployment Layer

**Date**: 2026-08-03
**Status**: HISTORICAL DESIGN WITH EXECUTION UPDATES. Steps 1–3 were completed through Phase 9.3. Phase 9.4 physical embodiment is now in progress: kiosk service verification has been completed, while display/touch validation and hardware reliability remain open. Current truth is maintained in root `HEAD.md` and `RELEASE_STATE.md`.
**Base commit**: `d32d81f` (Phase 8.5 Embodied Interaction Layer)
**Target**: Raspberry Pi 4 (future production node); current development on Windows

---

## 0. Executive Summary

At the time this blueprint was written, TARS was a fully functional **development project** but was not yet a **self-booting appliance**. That original state has been superseded by later Phase 9 execution: Docker deployment, local Three.js serving, deployment provenance, recovery validation, and kiosk service verification now exist. Preserve this blueprint as historical design context, not current runtime truth.

The goal of Phase 9 is: power on → TARS boots → screen shows TARS → state restored → runs unattended, surviving power loss, reboot, WiFi loss, service crashes, and Docker restarts.

This blueprint is **audit + design only**. It does not modify runtime code.

---

## 1. Current Deployment Reality (Verified)

### 1.1 Repository inventory (audit results)

| Item | Exists? | Verified location |
|------|---------|-------------------|
| Docker Compose files (`*.yml` / `*.yaml`) | **NO** | none anywhere in repo |
| Dockerfiles | **NO** | none anywhere in repo |
| systemd unit files (`*.service`) | **NO** | none anywhere in repo |
| Shell scripts (`*.sh`) | **NO** | none anywhere in repo |
| MQTT / Mosquitto config | **NO** | only doc mentions, no implementation |
| Home Assistant bridge | **NO** | documented as "Not implemented" in CURRENT_STATE.md |
| Database (SQLite/MySQL/Postgres) | **NO** | persistence is browser localStorage only |
| Monitoring stack (Prometheus/Grafana) | **NO** | replaced by lightweight in-process monitors |
| Raspberry Pi boot/kiosk files | **NO** | CURRENT_STATE.md: "Not started" |
| Frontend build system | **NO** | single-file `tars_face_v1.html`, no bundler |

### 1.2 What actually runs today

| Component | How it starts | Requires manual action? |
|-----------|--------------|--------------------------|
| Backend `pi-server/server.js` | `npm start` / `node server.js` | **YES** — must open terminal |
| Frontend `tars_face_v1.html` | served by server.js at `http://<host>:8080/` | **YES** — must open browser |
| Docker/network/health/alert monitors | started inside server.js | NO (once server runs) |
| World persistence | browser localStorage (`WorldPersistence`, v3) | NO — automatic |
| Event bus (in-process) | started inside server.js | NO (once server runs) |

### 1.3 Boot dependencies today

```
Manual terminal          Manual browser
     │                         │
     ▼                         ▼
node pi-server/server.js → serves tars_face_v1.html
     │                              │
     ├── HTTP :8080  ←─────────────┘  (html, js, health, api)
     └── WS :8080/ws ────────────────→  TARS_EVENTS client (degradable)
```

**Critical finding — CDN dependency at module parse time:**

`tars_face_v1.html:418`
```js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";
```

- This is a **static module import**. If the CDN is unreachable, the entire script **fails before any line runs** — no face, no engine, blank screen.
- A **local `three.module.js` (r161) already exists** in the repo (`projects/tars-face/three.module.js`, ~1.28 MB) but is **not referenced** by the frontend. It is also currently **untracked** by git.
- The server serves from `ROOT = projects/tars-face`, so the local file is already servable at `/three.module.js` if the import line is repointed.

**Golden rule #1 (frontend runs independently) is currently violated at the module layer.** The autonomy engine, physics, and persistence are all client-side and offline-capable; only the Three.js import is remote.

### 1.4 Good news (verified offline behavior)

- The event bus WebSocket client **silently degrades** and reconnects with backoff (`tars_face_v1.html:8921-8996`).
- All 10 REST fetches (alerts, events, health) use `.catch(() => {})` — silent no-op when server is down.
- No model/texture/font assets are loaded from disk or network — the scene is fully procedural.
- Persistence (v3) saves to localStorage on interval + `beforeunload`.
- Backend monitors (docker/network) self-disable gracefully when the socket/ping target is unavailable.

---

## 2. Service Dependency Graph

### 2.1 Today (implemented)

```
[Linux/Windows host]
    └── node server.js                     (single process)
        ├── HTTP server :8080               serves tars_face_v1.html + /health + /api/*
        ├── WebSocket server :8080/ws       pushes events → browser
        ├── EventBus (in-process pub/sub)
        ├── HealthMonitor    (10s)
        ├── StatusReporter   (30s heartbeat)
        ├── AlertManager     (event-driven)
        ├── DockerMonitor    (15s, graceful disable)
        └── NetworkMonitor   (30s, graceful disable)

[browser]
    └── tars_face_v1.html (module script)
        ├── THREE           ← CDN (REMOTE — the only external dep)
        ├── autonomy engine (client-side)
        ├── world/physics/interaction (client-side)
        └── WorldPersistence → localStorage
```

### 2.2 Target (Phase 9 end state)

```
[Power ON → Linux boot (systemd)]
    ├── docker.service  (enabled)
    │     └── tars backend container (restart: unless-stopped)
    │           └── node server.js :8080
    └── tars-kiosk.service (enabled, After=docker.service)
          └── Chromium --kiosk --start-fullscreen http://127.0.0.1:8080
                 └── tars_face_v1.html (THREE from LOCAL module)
                      └── WorldPersistence → localStorage
```

### 2.3 Key architectural truth

The frontend is the **autonomy brain**. The backend is an **optional observability/alerting companion**. This means the critical boot path (screen shows TARS + state restores + autonomy runs) requires **only three things**:

1. Linux boots (systemd)
2. Something serves the HTML + local Three.js (either Docker container or bare `node`)
3. Chromium opens the URL in kiosk mode

Docker is the natural fit for the backend because it provides **restart policy + dependency ordering + log rotation** with near-zero systemd coupling. The frontend (Chromium) stays a **systemd unit** because it is a GUI process, not a container workload.

---

## 3. Boot Sequence Diagram

### 3.1 Target sequence

```
 POWER ON
   │
   ▼
 ┌────────────────────────────┐
 │ Raspberry Pi bootloader    │
 └───────────┬────────────────┘
             ▼
 ┌────────────────────────────┐   systemd target: multi-user
 │ Linux kernel + initramfs   │
 └───────────┬────────────────┘
             ▼
 ┌────────────────────────────┐   enabled units start in dependency order
 │ systemd (PID 1)            │
 │  ├─ docker.service         │
 │  └─ networking             │
 └───────────┬────────────────┘
             ▼
 ┌────────────────────────────┐   docker restart policy handles crash/reboot
 │ tars-backend container     │
 │  └─ node server.js :8080   │   health gate: /health returns ok
 └───────────┬────────────────┘
             ▼
 ┌────────────────────────────┐   tars-kiosk.service (After=docker, Wants=docker)
 │ Chromium kiosk             │
 │  └─ file:/// or :8080      │   ──► loads LOCAL three.module.js
 └───────────┬────────────────┘
             ▼
 ┌────────────────────────────┐
 │ TARS online                │
 │  ├─ autonomy engine        │
 │  ├─ world/physics          │
 │  ├─ state restore (v3)     │
 │  └─ Observatory telemetry  │
 └────────────────────────────┘
```

### 3.2 Failure recovery matrix

| Failure | Recovery | Mechanism |
|---------|----------|-----------|
| Power loss | Full reboot → sequence replays | systemd + docker `restart: unless-stopped` |
| Service crash (backend) | Container restarts automatically | docker restart policy |
| Chromium crash/exit | Restart automatically | `Restart=always` on kiosk unit |
| WiFi loss | TARS keeps running (all core deps local) | LOCAL three.js + client-side engine; WS reconnects when back |
| Docker daemon restart | Containers restart per policy | `unless-stopped` |
| Screen blank/hang | Kiosk watchdog restarts Chromium | optional `RestartSec` + idle reload |
| Browser state corruption | Fresh load restores from localStorage v3 | WorldPersistence |

---

## 4. Missing Components (Gap Analysis)

### 4.1 Infrastructure gaps

| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| G1 | **Local Three.js import** | **BLOCKER** | Repoint `tars_face_v1.html:418` from CDN → `/three.module.js` (file already exists locally, currently untracked). Smallest change, largest impact. Must preserve graceful fallback. |
| G2 | **Dockerfile for backend** | High | `pi-server/` → Node 20 slim container; copy package.json + install `ws` + copy services + config; `EXPOSE 8080`; `CMD ["node","server.js"]` |
| G3 | **docker-compose.yml** | High | Single service (`tars-backend`), `restart: unless-stopped`, healthcheck on `/health`, port 8080, optional volume for config |
| G4 | **systemd unit: tars-kiosk** | High | Launch Chromium in kiosk mode at `http://127.0.0.1:8080`, `Restart=always`, `After=docker.service` |
| G5 | **Boot-time enablement** | High | `systemctl enable docker`, `systemctl enable tars-kiosk` (on-Pi provisioning step) |
| G6 | **three.module.js tracked in git** | Medium | Currently untracked scratch file — must be committed for reproducible deploys |
| G7 | **Kiosk watchdog** | Medium | Optional; reload page on crash/blank (Chromium flag or lightweight systemd timer) |
| G8 | **Config provenance** | Medium | `config/tars-config.json` served read-only; container should mount it or bake it in |
| G9 | **Health check for backend** | Medium | Already exists (`/health`); wire into docker healthcheck + kiosk pre-connect wait |
| G10 | **Log persistence** | Low | Docker json-file driver + journald; optional log rotation config |

### 4.2 What does NOT need building (do not build)

| Item | Reason |
|------|--------|
| SQLite persistence | Browser localStorage v3 already survives reboot/refresh; server buffers are ephemeral by design |
| MQTT broker | No publisher/subscriber topology exists yet; HA bridge is out of scope |
| Home Assistant bridge | Out of scope for self-boot goal |
| Prometheus/Grafana | In-process monitors + Observatory cover the need |
| Database | None needed; localStorage is the single source of truth for TARS state |

---

## 5. Recommended Implementation Order

Approved and executed in order (each step independently verifiable):

### Step 1 — Offline-enable the frontend (BLOCKER)
- Repoint the Three.js import to a local module path.
- Keep a documented offline note: no other external deps exist.
- **Verify**: open the HTML directly / with server stopped → face still renders.

### Step 2 — Containerize the backend
- Add `pi-server/Dockerfile` (Node 20-alpine or slim, copy code, `npm install --omit=dev`, expose 8080, `node server.js`).
- Add `.dockerignore` (exclude node_modules, scratch html tests).
- **Verify**: `docker build` succeeds; `docker run` serves `/health` and the page.

### Step 3 — Compose + restart policy
- Add `docker-compose.yml` with `tars-backend`, `restart: unless-stopped`, healthcheck on `/health`, port `8080:8080`.
- **Verify**: `docker compose up -d`; kill the process → container restarts.

### Step 4 — Kiosk systemd unit (templates, not yet installed)
- Provide `tars-kiosk.service` template (Chromium `--kiosk --noerrdialogs --disable-infobars --start-fullscreen http://127.0.0.1:8080`, `Restart=always`, `After=docker.service`, `Wants=docker.service`).
- Provide `tars-backend.service` **alternative** (bare-node) in case Docker is not desired — kept as rollback path.
- **Verify**: unit file syntax (`systemd-analyze verify`) on a Linux host or CI.

### Step 5 — Provisioning runbook
- Document on-Pi steps: install Docker, enable units, copy repo to `/opt/tars`, set config, first-boot check.
- **Verify**: documented, not executed (no Pi hardware yet).
- **UPDATE (Phase 9.2/9.3, executed 2026-08-04)**: Steps 1–3 (Dockerfile, compose, restart policy) and the deployment were **completed and validated** on the Pi node; see `docs/PHASE_9_1_TARS_NODE_DEPLOYMENT_PLAN.md`, `docs/PHASE_9_2_DEPLOYMENT_RESULT.md`, `docs/PHASE_9_3_RECOVERY_TEST_REPORT.md`.
- **UPDATE (Phase 9.4, post-release stabilization)**: kiosk service verification has been completed. Phase 9.4 remains open until display detection, touch validation, cold visual startup evidence, and hardware reliability are documented.

### Step 6 — Windows-side dev harness (optional)
- A `dev-start.ps1`/`dev-start.sh` helper that starts server + opens the browser — **development convenience only**, not a dependency.

---

## 6. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| CDN repoint breaks module path | Low | High | Local file already at expected path; verify with server stopped before commit |
| Untracked `three.module.js` lost | Medium | High | Commit it in the same change as the import repoint |
| Chromium kiosk flags vary by version | Medium | Medium | Pin Chromium/flags in unit file; test on Pi |
| Docker ARM64 image mismatch | Medium | Medium | Use multi-arch or `arm64` base; verify on Pi |
| Frontend served from file:// loses API/REST | Low | Low | Keep serving via localhost backend; kiosk points at `http://127.0.0.1:8080`, never `file://` |
| Backend restart loses server event history | Certain-by-design | Low | Server buffers are ephemeral; TARS state is in localStorage (unchanged) |
| WiFi outage during first CDN load (pre-fix) | — | Critical | Eliminated by Step 1 (local Three.js) |
| Screen sleeps / DPMS off in kiosk | Medium | Low | Disable blanking in unit or `xset s off` |

---

## 7. Rollback Strategy

| Scenario | Action |
|----------|--------|
| Frontend import change breaks rendering | Revert the single-line import change; app returns to CDN behavior |
| Docker container misbehaves | `docker compose down` → start bare node (`node pi-server/server.js`) as before; systemd alternative unit covers this |
| Kiosk unit fails | Disable unit, open browser manually — identical to today's workflow |
| Full rollback | Keep Phase 8.5 commit `d32d81f` untouched; all Phase 9 additions are **new files** (Dockerfile, compose, .service) + one-line import change. No runtime logic rewritten. |

**Rollback invariant**: Phase 9 adds deployment artifacts and does not modify autonomy/physics/persistence code. The existing `node server.js` + manual browser workflow remains valid at all times.

---

## 8. Persistence Audit (What Survives)

| Store | Survives reboot? | Survives browser restart? | Survives power loss? | Survives container restart? | Notes |
|-------|------------------|---------------------------|----------------------|-----------------------------|-------|
| localStorage `worldState` v3 (needs, fatigue, activity, preferences, session, environment, **objects**) | ✅ | ✅ | ✅ | ✅ | Client-side; independent of server/container |
| Server event history (last 1000) | ❌ | n/a | ❌ | ❌ | In-memory circular buffer — ephemeral by design |
| Active alerts / alert history | ❌ | n/a | ❌ | ❌ | In-memory server state |
| Service registry | ❌ | n/a | ❌ | ❌ | In-memory |
| `config/tars-config.json` | ✅ | n/a | ✅ | ✅ | Static file |
| Chat conversation history | ❌ | ❌ | ❌ | ❌ | In-memory browser array |

**Gap**: no durable telemetry/alert history across restarts. **Decision**: acceptable for Phase 9 (self-boot) — does not affect TARS autonomy. SQLite telemetry remains a future phase and is explicitly out of scope here.

---

## 9. Screen / Touch Integration Preparation (architecture only)

No hardware integration performed. Architecture reserved as follows:

### 9.1 Display
- Chromium kiosk mode, fullscreen, pointing at `http://127.0.0.1:8080` (served backend, never file://).
- Compatible with HDMI or DSI touchscreen — Chromium handles both; input is standard pointer events.

### 9.2 Touch separation (preserves Phase 8.5 isolation)
- **UI touch** (menus/settings/chat): DOM elements above the canvas (`#tars-overlay`, `#tars-chat`). The Phase 8.5 `TARS_INPUT_CLASSIFIER` already **self-suspends** while these are open — this isolation is preserved and must not be weakened.
- **World touch** (objects/environment): canvas-only pointer events → `TARS_INPUT_CLASSIFIER` → `TARS_WORLD_SENSOR` → `world.interaction` events → `TARS_WORLD_AGENT`.
- No kiosk-layer changes required to this boundary; only verify it behaves with touch (pointer events) rather than mouse.

### 9.3 Required verify-on-Pi (post-approval, not now)
- Pointer events from a resistive/capacitive DSI touchscreen map correctly to tap/flick gestures.
- Fullscreen canvas resize (`window.addEventListener("resize", ...)` at `tars_face_v1.html:7612`) works under Chromium kiosk.

---

## 10. Decision Log (this audit)

| Decision | Rationale |
|----------|-----------|
| Keep browser localStorage as TARS state source | Already survives all four failure modes; server DB adds complexity without boot benefit |
| Backend in Docker, frontend in systemd | Container restart policy + healthcheck for the server; GUI must be a systemd unit |
| Kiosk points at `http://127.0.0.1:8080` not `file://` | Preserves REST/WS telemetry feeds; single failure domain |
| Do not build SQLite/MQTT/HA now | Out of scope for self-boot objective; avoids new dependencies per rules |
| Commit `three.module.js` | Required for reproducible offline deploys; currently untracked |

---

*Steps 1–2 of this blueprint are implemented by Phase 9.1. Execution on the node is documented in `DEPLOYMENT_RUNBOOK.md` and is scheduled for Phase 9.2.*

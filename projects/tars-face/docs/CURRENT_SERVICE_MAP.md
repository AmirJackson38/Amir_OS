# TARS — Current Service Map

**Date**: 2026-08-03
**Type**: Audit snapshot (Phase 9 pre-implementation). Verified against repository, not assumed.
**Base commit**: `d32d81f`

---

## Runtime Services (implemented)

| Service | Purpose | Location | Startup method | Dependencies | Required for TARS boot? |
|---------|---------|----------|----------------|--------------|-------------------------|
| TARS backend (HTTP + WS) | Serves frontend HTML/JS; REST `/health`, `/api/events`, `/api/alerts`; WebSocket push to browser | `projects/tars-face/pi-server/server.js` | **Manual**: `node server.js` / `npm start` | Node.js, `ws` package, `config/tars-config.json` | **Yes** (hosts the page) |
| Event bus | In-process pub/sub, history (1000), heartbeat | `pi-server/event-bus.js` | Started inside server.js | none | **Yes** (started with server) |
| WebSocket bridge | Pushes events to all browser clients | `pi-server/ws-bridge.js` | Started inside server.js | EventBus | **Yes** (started with server) |
| Health monitor | CPU/mem/disk/temp/uptime, 10s | `pi-server/services/health-monitor.js` | Started inside server.js | EventBus, config | **No** (observability only) |
| Status reporter | Service registry + staleness detection, 30s | `pi-server/services/status-reporter.js` | Started inside server.js | EventBus | **No** (observability only) |
| Alert manager | Threshold evaluation on health events | `pi-server/services/alert-manager.js` | Started inside server.js | EventBus | **No** (observability only) |
| Docker monitor | Reads `/var/run/docker.sock`, 15s | `pi-server/services/infra/docker-monitor.js` | Started inside server.js; self-disables without socket | Docker socket | **No** (observability only) |
| Network monitor | Pings config hosts, 30s | `pi-server/services/infra/network-monitor.js` | Started inside server.js; self-disables on failure | ICMP, config hosts | **No** (observability only) |

## Browser-Side Capabilities (implemented)

| Capability | Purpose | Location | Startup | Required for TARS boot? |
|------------|---------|----------|---------|-------------------------|
| TARS frontend | Face, autonomy engine, needs, scoring, fatigue | `projects/tars-face/tars_face_v1.html` | **Manual**: open browser at `http://<host>:8080/` | **Yes** (it IS TARS) |
| Three.js (r161) | 3D rendering | **REMOTE**: `https://cdn.jsdelivr.net/npm/three@0.161.0/...` (import at `tars_face_v1.html:418`) | Module import at parse time | **Yes** — **currently requires internet (GAP G1)** |
| World/autonomy/physics | Engine, world objects, collision, input layer | inside `tars_face_v1.html` | Part of page load | **Yes** |
| WorldPersistence (v3) | Save/restore needs, fatigue, activity, preferences, session, environment, objects | inside `tars_face_v1.html` | Automatic (interval + beforeunload) | **Yes** — client-side localStorage |
| Event bus client | Receives server events via WS | `TARS_EVENTS` in `tars_face_v1.html:8921` | Automatic; silent reconnect | **No** (degrades gracefully) |

## Local Assets

| Asset | Purpose | Location | Servable? | Required? |
|-------|---------|----------|-----------|-----------|
| `three.module.js` (r161, ~1.28 MB) | Local Three.js (currently **unreferenced**) | `projects/tars-face/three.module.js` | Yes — server ROOT is `projects/tars-face` | Would satisfy G1 if imported |
| `config/tars-config.json` | Backend port/host/monitor config | `projects/tars-face/config/tars-config.json` | Read by server.js at startup | Yes (backend) |
| Model/texture/font assets | — | **NONE** (scene fully procedural) | n/a | n/a |

## Infrastructure Services (referenced in docs but NOT implemented)

| Service | Purpose | Status |
|---------|---------|--------|
| Docker Compose / Dockerfile | Containerized backend | **Not implemented** (no compose, no Dockerfile in repo) |
| systemd units | Auto-start backend + kiosk | **Not implemented** (no `.service` files) |
| Chromium kiosk | Auto-launch fullscreen frontend | **Not implemented** |
| MQTT broker | IoT messaging | **Not implemented** |
| Home Assistant bridge | Smart-home integration | **Not implemented** |
| SQLite database | Durable telemetry/event history | **Not implemented** (localStorage only) |
| Monitoring stack (Prometheus/Grafana) | Metrics | **Not implemented** (in-process monitors cover this) |

## Startup Scripts

| Script | Exists? | Notes |
|--------|---------|-------|
| Root/system `*.sh` | **NO** | none in repo |
| `npm start` | **YES** | `pi-server/package.json` → `node server.js` (manual) |
| `npm run dev` | **YES** | `node --watch server.js` (manual, dev only) |
| systemd auto-start | **NO** | GAP |
| Docker restart policy | **NO** | GAP |

## Boot-Readiness Summary

| Requirement | Ready? | Blocker |
|-------------|--------|---------|
| Backend starts without human | ❌ | No systemd/Docker (G2–G5) |
| Frontend launches fullscreen | ❌ | No kiosk unit (G4) |
| Frontend loads offline | ❌ | CDN Three.js import (G1 — **BLOCKER**) |
| State restores after reboot | ✅ | localStorage v3 |
| Autonomy continues offline | ✅ | Client-side engine |
| Survives service crash | ❌ | No restart policy (G3/G4) |
| Survives Docker restart | ❌ | No Docker (G2/G3) |

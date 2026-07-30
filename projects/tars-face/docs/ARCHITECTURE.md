# TARS Face Architecture

## Overview

TARS Face is a browser-based 3D face/animation system with a Node.js runtime server. The face runs in the browser (Three.js), the brain runs on the server.

## Architecture Layers

### 1. Frontend (`tars_face_v1.html`)
- **Three.js 3D Scene**: Face mesh, eyes, gestures, environment
- **TARS World State** (`worldState`): Client-side state representing TARS activity, needs, fatigue, location, autonomy decisions
- **TARS_UI**: Right-side toolbar panel system (home, infra, observatory, brain, system)
- **Event Bus Client** (`TARS_EVENTS`): WebSocket client receiving server events
- **Autonomy Simulator** (`TARS_AUTONOMY`): Activity selection, decision engine, need-based behavior

### 2. Runtime Server (`pi-server/server.js`)
- HTTP + WebSocket server
- **Event Bus**: In-process pub/sub event system
- **Status Reporter**: Service registry with heartbeat/staleness detection
- **Health Monitor**: CPU, memory, disk, temperature, uptime
- **Docker Monitor**: Reads /var/run/docker.sock (read-only GET operations)
- **Network Monitor**: Pings configured hosts
- **Alert Manager**: Threshold evaluation from health events

### 3. Communications
- WebSocket: Server pushes events to browser (health updates, alerts, docker/network data)
- REST API: `/health`, `/api/events`, `/api/alerts` endpoints

## Data Pipeline
```
health-monitor.js (tick every 10s)
  → eventBus.publish({ type: "health.cpu", data: { percent, load1, load5, load15 } })
  → EventBus stores in history + delivers to all subscribers
  → WsBridge subscribed to ALL events (filter: null)
  → WebSocket.send(JSON.stringify(event)) to every connected client
  → TARS_EVENTS onmessage → dispatchEvent(new CustomEvent("tars-event", { detail: event }))
  → TARS_UI.renderInfra handler → document.getElementById("tars-infra-cpu").querySelector(".tars-data-value")
```

## Monitors and Their Events

| Monitor | Events Published | Interval | Notes |
|---------|-----------------|----------|-------|
| health-monitor | health.cpu, health.memory, health.disk, health.uptime | 10s | Temperature embedded in health.cpu as tempC |
| docker-monitor | infra.docker.summary, infra.docker.container | 15s | Disabled on Windows (no socket) |
| network-monitor | infra.network.summary, infra.network.host | 30s | Pings config hosts |
| alert-manager | alert.system.cpu, alert.system.memory, alert.system.disk, alert.system.temp, alert.service.offline | event-driven | Threshold evaluation on health events |
| status-reporter | system.heartbeat | 30s | Service registry snapshot |

## UI Component Map

| Component | Renderer | Data Source | Status |
|-----------|----------|-------------|--------|
| 3D Face | animate() + renderer.render() | worldState + Three.js | PASS |
| Weather | weatherVisualEngine.updateFromWeatherState() | worldState.environment.weather | PASS |
| Autonomy | TARS_AUTONOMY loop | worldState.tars | PASS |
| Persistence | WorldPersistence.save/load | localStorage | PASS |
| Status Header | TARS_UI.updateStatusHeader() | worldState.tars | PASS |
| Home Panel | TARS_UI.renderHome/refreshHomeLive | connection-dot state | PASS |
| INFRA Panel | TARS_UI.renderInfra | health.* events + /api/events | PASS |
| Observatory | TARS_UI.renderObservatory | worldState.tars | PASS |
| Brain | TARS_UI.renderBrain | worldState.tars autonomy | PASS |
| Journal | TARS_UI.renderJournal | worldState.tars autonomyHistory | PASS |
| System Panel | TARS_UI.renderSystem | /health API | PASS |
| Settings | TARS_UI.renderSettings | worldState + DOM actions | PASS |
| Connection Dot | standalone IIFE | tars-events events | PASS |
| Alert Badge | standalone IIFE | /api/alerts + alert.* events | PASS |

## Key Principles
- **Monitors produce facts, never control**: Monitors publish events; consumers (alert-manager, UI) evaluate
- **One data source per panel**: No duplicated dashboards
- **Pi readiness**: All monitors degrade gracefully on Windows (no /var/run/docker.sock, ping fallback)

## File Map
- `tars_face_v1.html` — complete frontend (HTML + CSS + JS, ~6900 lines)
- `pi-server/server.js` — runtime server entry point
- `pi-server/event-bus.js` — in-process event bus
- `pi-server/ws-bridge.js` — WebSocket event broadcast
- `pi-server/services/status-reporter.js` — service heartbeat registry
- `pi-server/services/health-monitor.js` — system health polling
- `pi-server/services/alert-manager.js` — threshold-based alert evaluation
- `pi-server/services/infra/docker-monitor.js` — read-only Docker API polling
- `pi-server/services/infra/network-monitor.js` — host ping monitoring
- `config/tars-config.json` — runtime configuration
- `docs/` — architecture, phase history, event schema, current state, lessons learned

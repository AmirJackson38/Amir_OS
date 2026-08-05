# TARS Face Architecture

## Overview

TARS Face is a browser-based 3D face/animation system with a Node.js runtime server. In the current legacy mode, the browser owns the simulation and the server provides infrastructure and observability. A Phase 10.1 canonical runtime shell now defines the future identity/snapshot/renderer contract without moving authority.

## Development and Deployment Topology

```
Windows workstation (development) → Git repository (source of truth) → tars.local (production Pi)
edit / inspect / commit / push                                      Docker / Node / Face / kiosk / hardware
```

- **Development:** Windows is for source edits, code inspection, commits, and local development checks.
- **Production:** Raspberry Pi host `tars.local` runs the Docker container, Node server, served frontend, physical display, kiosk mode, and future touch/sensor hardware.
- **Validation rule:** `localhost` on Windows is not the production environment and Windows Docker is not assumed. Before runtime testing, identify the development environment, deployment target, and live production status.
- **Deploy path:** commit and push on Windows; SSH to `tars.local`; pull the intended commit; rebuild/restart Docker when required; validate on the Pi and its physical hardware.

## Architecture Layers

### 1. Frontend (`tars_face_v1.html`)
- **Three.js 3D Scene**: Face mesh, eyes, gestures, environment
- **TARS World State** (`worldState`): Client-side state representing TARS activity, needs, fatigue, location, autonomy decisions
- **TARS_UI**: Right-side toolbar panel system (home, infra, observatory, brain, system)
- **Event Bus Client** (`TARS_EVENTS`): WebSocket client receiving server events
- **Autonomy Simulator** (`TARS_AUTONOMY`): Activity selection, decision engine, need-based behavior

### 2. Runtime Server (`pi-server/server.js`)
- HTTP + WebSocket server
- **Canonical runtime shell (Phase 10.1)**: server-owned runtime identity, placeholder snapshot, renderer registry, version tracker, and `renderer.hello` protocol validation. It is non-authoritative while `TARS_RUNTIME_MODE=legacy`.
- **Event Bus**: In-process pub/sub event system
- **Status Reporter**: Service registry with heartbeat/staleness detection
- **Health Monitor**: CPU, memory, disk, temperature, uptime
- **Docker Monitor**: Reads /var/run/docker.sock (read-only GET operations)
- **Network Monitor**: Pings configured hosts
- **Alert Manager**: Threshold evaluation from health events

### 3. Behavioral Memory (`behavioral-memory.js`)
- Derived from selected frontend runtime events only.
- Stores versioned session and daily summaries in a separate two-slot localStorage namespace.
- Carries memory classification and provenance for derived entries.
- Exposes inspection/export APIs and a behavioral-memory health receipt.
- Mirrors selected summaries to the backend for inspection only; the frontend remains authoritative.

### 4. Communications
- WebSocket: Server pushes events to browser (health updates, alerts, docker/network data)
- REST API: `/health`, `/api/events`, `/api/alerts`, and non-authoritative `/api/behavioral-memory` inspection endpoint

### 5. Deployment Layer (Phase 9+)
- **Docker**: `tars_backend` container (image `tars-backend:1.0.0`, non-root `node` user, `/srv/tars`, `EXPOSE 8080`, healthcheck) on isolated `tars_net` bridge, `restart: unless-stopped`, published port `8080` only.
- **Layered isolation**: Frontend (browser) → Backend (container :8080) → Cognition (LLM, separate, not wired) → Deployment (Docker/kiosk). Recovery-gated so container restart / daemon restart / reboot / network loss all self-heal (Phase 9.3).
- **Offline-capable**: Three.js served locally from `/three.module.js`; zero CDN dependency.
- **Deployment provenance**: `/health` reports the Git SHA, Docker image digest, UTC deployment timestamp, and validation status injected by the deployment workflow.
- See `docs/PHASE_9_2_DEPLOYMENT_RESULT.md`, `docs/PHASE_9_3_RECOVERY_TEST_REPORT.md`, `docs/PI_NODE_AUDIT.md`, `docs/CURRENT_SERVICE_MAP.md`.

## Phase 10.1 Canonical Runtime Shell

```text
Pi server
  └── CanonicalRuntimeShell
      ├── RuntimeIdentityProvider
      ├── SnapshotProvider (canonical:false, authority:frontend)
      ├── RendererRegistry (connection metadata only)
      ├── VersionTracker (runtimeEpoch, worldVersion)
      └── ProtocolValidator (renderer.hello)
```

The shell is an empty contract layer. It does not read or write browser
`worldState`, autonomy, weather, persistence, or behavioral memory. The
current mode is explicitly:

```text
TARS_RUNTIME_MODE=legacy
authority=frontend
```

Renderer connections receive a placeholder `world.snapshot` after a valid
handshake. The placeholder is marked `canonical: false` and `status: shadow`.
Future migration phases may relocate authority only after their acceptance
gates pass.

## Phase 10 Current State

- Phase 10.1 shell implementation is complete locally.
- `TARS_RUNTIME_MODE=legacy` is the active mode and defaults when unset.
- Frontend remains authoritative for worldState, autonomy, needs, activity and
  location selection, weather, persistence, behavioral memory, and rendering.
- The Pi shell is infrastructure only: identity, placeholder snapshots,
  renderer metadata, version ordering, and protocol validation.
- Runtime mode guards reject canonical persistence/world mutation attempts.
- `ShadowStateObserver`, `FrontendObservationAdapter`, and `ComparisonEngine`
  are diagnostic-only interfaces; live frontend observation is not activated.
- Canonical migration has not started and canonical mode is not enabled.

## Phase 10.2 Shadow Mode

Phase 10.2 adds an observation-only foundation:

```text
FrontendObservationAdapter
        ↓ read-only observation
ShadowStateObserver (bounded memory)
        ↓ normalized state
ComparisonEngine (diagnostic only)
        ↓
/health.shadow
```

The adapter reads the existing frontend world state but does not call
autonomy, trigger updates, mutate rendering, or write persistence. A separate
1 Hz timer sends observations; it is not part of the requestAnimationFrame
loop or simulation clock. The Pi accepts only `source: "frontend"`
observations over the diagnostic WebSocket message path; observations are
bounded in memory and are never used to create world state, behavioral memory,
or canonical snapshots.

Comparison categories are behavioral (activity, location, emotion, needs),
environment (weather, time of day, lighting), objects, and metadata versions.
Camera, FPS, particles, interpolation, and visual effects are intentionally
ignored. A missing shadow observation produces `status: "waiting"` rather than
inventing a comparison.

`GET /health.shadow` reports `authority: "frontend"`, observer status, bounded
observation count, comparison count, and last-observation metadata. It is a
diagnostic receipt, not an authority or persistence API.

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

Behavioral memory is a separate derived path:

```text
selected frontend lifecycle events
  → BehavioralMemory session accumulator
  → two-slot localStorage session/daily summaries
  → optional selected WebSocket mirror
  → backend bounded inspection mirror (/api/behavioral-memory)
```

This path never writes world state and does not participate in autonomy selection.

## Monitors and Their Events

| Monitor | Events Published | Interval | Notes |
|---------|-----------------|----------|-------|
| health-monitor | health.cpu, health.memory, health.disk, health.uptime | 10s | Temperature embedded in health.cpu as tempC |
| docker-monitor | infra.docker.summary, infra.docker.container | 15s | Disabled on Windows (no socket) |
| network-monitor | infra.network.summary, infra.network.host | 30s | Pings config hosts |
| alert-manager | alert.system.cpu, alert.system.memory, alert.system.disk, alert.system.temp, alert.service.offline | event-driven | Threshold evaluation on health events |
| status-reporter | system.heartbeat | 30s | Service registry snapshot |

## UI Ownership Map

### Toolbar (primary navigation)

| Button | Icon | Tab ID | Renderer | Data Source | Status | Notes |
|--------|------|--------|----------|-------------|--------|-------|
| Home | 🏠 | `home` | `TARS_UI.renderHome()` | `#tars-connection-dot` className + `tars-events-connected`/`disconnected` events | **Working** | Shows event bus connection status + HA placeholder |
| INFRA | ◈ | `infra` | `TARS_UI.renderInfra()` | REST `/api/events` (initial) + `tars-event` DOM events (live) + 10s polling | **Working** | CPU, mem, disk, temp, uptime, services, Docker, network, alerts |
| Observatory | 📊 | `observatory` | `TARS_UI.renderObservatory()` | `ObservatoryDataLayer` (projected state + emitted events) | **Working** | Needs bars, scores, fatigue, decisions, stats, behavior patterns; full-screen overlay via **F3 / Ctrl+Shift+D** |
| Brain | 🧠 | `brain` | `TARS_UI.renderBrain()` | `worldState.tars.autonomy` (scoreComponents, alternatives) | **Working** | Activity, score breakdown, runner-up, fatigue |
| Journal | 📜 | `journal` | `TARS_UI.renderJournal()` | `worldState.tars.autonomyHistory` | **Working** | Activity timeline with expand/collapse |
| System | ⚙ | `system` | `TARS_UI.renderSystem()` | `GET /health` (runtime version, event bus stats) | **Working** | Version, uptime, event bus stats, dev tool nav buttons |
| Creator Console | 🎛 | `settings` | `TARS_UI.renderSettings()` + 400ms `refreshSettingsLive()` | `worldState.tars` + DOM actions | **Working** | 7-section control center (see below) |

### Conversation (separate panel)

| Component | ID | Handler | Data Source | Status | Notes |
|-----------|-----|---------|-------------|--------|-------|
| Chat | `tars-chat` | `TARS_CHAT.send()` | `TARS_CHAT.history[]` | **Working but stub** | Replies "cognitive system offline". No LLM. |

### Creator Console Sections (Settings Tab)

| Section | Collapsible | Controls | Handler Actions |
|---------|-------------|----------|-----------------|
| System Controls | ✅ | Status grid, PAUSE/RESUME/FORCE/WANDER/RESET, LIVE/DEMO, AUTO/LLM/RELEASE | `pause`, `resume`, `force-decision`, `trigger-wander`, `reset-state`, `set-mode`, `set-control`, `release-control` |
| Behavior | ✅ | 14 emotion presets, 7 activity tests, 5 gesture tests | `trigger-behavior`, `test-behavior`, `trigger-gesture`, `test-activity` |
| Movement | ✅ | 6 go-to targets (HOME, DESK, RACK-A, RACK-B, LEFT/RIGHT WINDOW), 5 look-at targets | `go-to`, `look-at` |
| Needs | ✅ | 6 need bars with +/-10% inject, reset | `inject-need`, `reset-state` |
| Environment | ✅ | Weather (7 conditions), Time (5 presets), Temperature (+/-), Wind (5 levels) | `set-weather`, `set-time`, `set-temp`, `set-wind` |
| Rendering | ✅ | Quality profile selector (HIGH / PI_BALANCED) | `set-profile` |
| Debug | ✅ | Toggle checkboxes (collision volumes, zones, avoidance vectors, FPS, AI state) | `toggle-debug` |
| Developer Tools | ✅ | Tab shortcuts (Brain, Observatory, Journal, Conversation, Settings), Telemetry Console, Memory Inspector | `open-dev-tool` |

All 22 data-action values wired to real handlers. Zero dead controls.

### Embodied Interaction Layer (Phase 8.5)

| Module | Role | Emits / Eats | Isolation Guarantee |
|--------|------|--------------|---------------------|
| `TARS_INPUT_CLASSIFIER` | Canvas-only pointer listeners → gestures (tap/flick/drag/touch) | emits `world.interaction` | Never listens to UI/chat DOM; self-suspends while `#tars-overlay` / `#tars-chat` open |
| `TARS_WORLD_SENSOR` | Raycaster pick + `interactFromTouch()` impulse | emits `world.interaction` | Only reads `TARS_PHYSICS` / `TARS_WORLD_OBJECTS`; no UI coupling |
| `TARS_WORLD_AGENT` | Response pipeline (join_play/investigate/respond_later) | consumes `world.interaction`; emits `world.salience` | Acts only via `setTARSActivity()` / `lookAt()` / `queueWorldEvent()` — no direct physics→behavior calls |
| `TARS_PHYSICS` hooks | collision/sleep/wake/impulse emission (dedup 250ms) | emits `world.physics.*` | Observation-only; no behavior coupling |
| Observatory world telemetry | `renderObservatory()` world section | `ObservatoryDataLayer.getWorldInteractionSummary()` | Reads only the data layer |

### Standalone Components

| Component | Renderer | Data Source | Status |
|-----------|----------|-------------|--------|
| 3D Face | animate() + renderer.render() | worldState + Three.js | PASS |
| Weather | weatherVisualEngine.updateFromWeatherState() | worldState.environment.weather | PASS |
| Autonomy | TARS_AUTONOMY loop | worldState.tars | PASS |
| Persistence | WorldPersistence.save/load | localStorage | PASS |
| Status Header | TARS_UI.updateStatusHeader() | worldState.tars | PASS |
| Connection Dot | standalone IIFE | tars-events events | PASS |
| Alert Badge | standalone IIFE | /api/alerts + alert.* events | PASS |

## Key Principles
- **Monitors produce facts, never control**: Monitors publish events; consumers (alert-manager, UI) evaluate
- **One data source per panel**: No duplicated dashboards
- **Pi readiness**: All monitors degrade gracefully on Windows (no /var/run/docker.sock, ping fallback)

## File Map
- `tars_face_v1.html` — complete frontend (HTML + CSS + JS, ~8472 lines; event bus, ObservatoryDataLayer, world objects, physics foundation)
- `pi-server/server.js` — runtime server entry point
- `pi-server/event-bus.js` — in-process event bus
- `pi-server/ws-bridge.js` — WebSocket event broadcast
- `pi-server/canonical-runtime-shell.js` — Phase 10.1 non-authoritative shell coordinator
- `pi-server/runtime-identity.js` — server-owned shell identity
- `pi-server/snapshot-provider.js` — placeholder shell snapshot
- `pi-server/renderer-registry.js` — renderer connection metadata
- `pi-server/version-tracker.js` — epoch/version ordering
- `pi-server/protocol-validator.js` — renderer handshake validation
- `pi-server/runtime-mode.js` — legacy/shadow/canonical authority guard
- `pi-server/snapshot-validator.js` — public snapshot contract and forbidden-field validation
- `pi-server/shadow-state-observer.js` — Phase 10.2 diagnostic observer interface
- `pi-server/comparison-engine.js` — Phase 10.2 diagnostic comparison interface
- `frontend-observation-adapter.js` — read-only frontend observation boundary
- `fixtures/shadow-session.json` — deterministic shadow comparison fixture
- `pi-server/services/status-reporter.js` — service heartbeat registry
- `pi-server/services/health-monitor.js` — system health polling
- `pi-server/services/alert-manager.js` — threshold-based alert evaluation
- `pi-server/services/infra/docker-monitor.js` — read-only Docker API polling
- `pi-server/services/infra/network-monitor.js` — host ping monitoring
- `config/tars-config.json` — runtime configuration
- `docs/` — architecture, phase history, event schema, current state, lessons learned
- `AGENTS.md` — AI agent entry point (read first)

## Implementation Pattern

```
Monitor → Event Bus → WS Bridge → WebSocket → TARS_EVENTS → DOM CustomEvent → TARS_UI handler
```

Every monitor follows the same pattern:

```javascript
class SomeMonitor {
    constructor(eventBus, config) { }
    start() { /* schedule checks, register with status reporter */ }
    stop() { /* clear intervals, clean up */ }
    async _check() { /* poll API or read sensor, publish events */ }
}
```

## Documentation Status Map

### CURRENT (accurately reflects implementation)

| File | Description |
|------|-------------|
| `AGENTS.md` | AI agent entry point — read first |
| `docs/CURRENT_STATE.md` | What works, known issues, next steps |
| `docs/ARCHITECTURE.md` | This file — current architecture reference |
| `docs/EVENT_SCHEMA.md` | Event type catalog |
| `docs/PHASE_HISTORY.md` | Completed phase log |
| `docs/TARS_LESSONS_LEARNED.md` | Bug postmortems and engineering lessons |
| `docs/DECISIONS.md` | Architecture decision records |
| `config/tars-config.json` | Runtime configuration |
| `docs/PHASE_9_1_TARS_NODE_DEPLOYMENT_PLAN.md` | Phase 9.1 deployment preparation plan (implemented) |
| `docs/PHASE_9_2_DEPLOYMENT_RESULT.md` | Phase 9.2 node deployment result (success) |
| `docs/PHASE_9_3_RECOVERY_TEST_REPORT.md` | Phase 9.3 recovery validation report (all pass) |
| `docs/CURRENT_SERVICE_MAP.md` | Current service inventory on node |
| `docs/PHASE_9_DEPLOYMENT_BLUEPRINT.md` | High-level deployment blueprint |
| `docs/DEPLOYMENT_RUNBOOK.md` | Preflight/redeploy/rollback runbook |

### FORWARD-LOOKING (designed but not implemented)

| File | Description |
|------|-------------|
| `TARS_COGNITIVE_ARCHITECTURE.md` | LLM provider interface spec (Phase 8.5+) |

### HISTORICAL / PARTIALLY SUPERSEDED

| File | Description | Why superseded |
|------|-------------|----------------|
| `TARS_PHASE_8_AWARENESS_FIRST_ARCHITECTURE.md` | Phase 8 master plan | Phase 8.2 nav removed; pre-Phase 9 view of deployment (now superseded by docker-compose deployment) |
| `TARS_PHASE_8_3_ARCHITECTURE_PLAN.md` | Phase 8.3 detailed plan | Describes monitors not yet implemented (TrueNAS, Plex, etc.) |
| `TARS_PHASE_7_5_ARCHITECTURE_PLAN.md` | Phase 7.5 observability plan | Describes pre-P1 state; P1 is complete, P2 deferred |
| `TARS_PHASE_7_5_ROADMAP.md` | Phase 7.5-9 roadmap | Phase 8 scope diverged from original roadmap |
| `TARS_PHASE_7_5_P1_COMPLETE.md` | Phase 7.5 P1 results | Specific to sub-phase, not general reference |
| `TARS_PHASE_8_3_1_AUDIT.md` | Alert manager audit | Specific to component, not general reference |
| `docs/PI_NODE_AUDIT.md` | Pre-install Pi hardware/runtime audit | Superseded for current production state by root `HEAD.md`, `RELEASE_STATE.md`, and live `/health`/SSH verification |

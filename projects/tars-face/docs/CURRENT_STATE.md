# TARS Face — Current State

**Date**: 2026-08-04
**Version**: v7.5 + Phase 8.3.4 stabilization + Phase 8.4 Observable Spatial Runtime Base + Phase 8.5 Embodied Interaction Layer + Phase 9.1 Deployment Preparation

## Completed
All behavior delivered and verified (see sections below): Three.js face with expressions/gestures/eye tracking, need-driven autonomy engine with scoring, world state persistence, runtime server (WebSocket + REST), health/asset/docker/network/alert monitoring, Creator Console (7 sections / 22 live actions), in-process event bus, and the Phase 8.4 observable spatial runtime base.

## Newly Integrated (Phase 9.1 — Deployment Preparation)
- **Containerized backend**: `Dockerfile` (non-root `node` user, `node:20-alpine`, `/srv/tars`, `EXPOSE 8080`) + `docker-compose.yml` (service `tars-backend`, image `tars-backend:1.0.0`, `restart: unless-stopped`, isolated `tars_net` bridge, healthcheck on `/health`, port `8080:8080` only)
- **Build hygiene**: `.dockerignore` excludes scratch HTML test files, docs, and `node_modules` from the image
- **Local frontend serving**: `tars_face_v1.html:418` now imports Three.js from `/three.module.js` (local, served by backend) **instead of the CDN** — removes the single hard internet dependency (golden rule #1)
- **Backend health endpoint**: `/health` already present at `pi-server/server.js:50` (verified, no change needed)
- **Submission**: `projects/tars-face/docs/PHASE_9_1_TARS_NODE_DEPLOYMENT_PLAN.md`, `docs/PHASE_9_DEPLOYMENT_BLUEPRINT.md`, `docs/PI_NODE_AUDIT.md`, `docs/CURRENT_SERVICE_MAP.md`

## Newly Integrated (Phase 8.5 — Embodied Interaction Layer)
- **Input classifier**: `TARS_INPUT_CLASSIFIER` — canvas-only pointer listeners (down/move/up/cancel) that classify gestures (tap / flick / drag / touch) and route only world-space interaction. Fully isolated from UI: suspends itself while `#tars-overlay` or `#tars-chat` is open, emits `world.interaction` events, and never handles chat/panel DOM events.
- **World sensor**: `TARS_WORLD_SENSOR` — Raycaster-based picking over physics objects (`TARS_PHYSICS.objects` / `TARS_WORLD_OBJECTS.getAll`), scene→NDC conversion, and `interactFromTouch()` that applies impulses (flick→velocity, tap→small nudge) and emits `world.interaction` even for empty taps.
- **World agent**: `TARS_WORLD_AGENT` — event-driven response pipeline that decides join_play / investigate / respond_later for each world interaction. Responds **only through existing systems** (`setTARSActivity()`, `window.TARS.lookAt()`, `queueWorldEvent()`); no direct physics→behavior calls. Gates on LLM/Brain availability, blocking FX, cooldown (1800ms), and deferred-queue cap (10).
- **Physics event hooks**: `TARS_PHYSICS` now emits `world.physics.impulse`, `world.physics.collision`, `world.physics.sleep`, `world.physics.wake` (dedup window 250ms) — observation-only, no behavior coupling. `applyImpulse()` added as the single interaction entry point.
- **Persistence v3**: `worldState.objects` snapshot of dynamic object transforms + sleep state; `WorldPersistence.captureObjects()` / `applyObjectsToState()` restore on load; `finalizeExperience()` enriched with interaction context; worldMemory captures salient interactions.
- **Observatory telemetry**: world interaction section in `renderObservatory()` (last object/gesture/impulse/position + interaction/collision/impulse/impulse-sum counters) fed by `ObservatoryDataLayer` world ingest cases and `getWorldInteractionSummary()`.
- **Event categories**: `world.interaction`, `world.physics.impulse`, `world.physics.collision`, `world.physics.sleep`, `world.physics.wake`, `world.object.moved` (category `world`), `user.attention` (user).

## Newly Integrated (Phase 8.4 — Observable Spatial Runtime Base)
- **Renderer**: `TARS_RENDER_PROFILES` (DESKTOP_HIGH / PI_BALANCED) + `detectRenderProfile()` for quality selection with persist + reload
- **Event bus**: `TARS_EVENT_BUS`, `EVENT_CATEGORY_MAP`, `emitTARSEvent()` / `subscribeTARSEvent()` (in-process pub/sub)
- **Observability data layer**: `ObservatoryDataLayer` (Phase 7.4.4) with `ingestEvent`, projected state, derived metrics; feeds live world/behavior/needs/event views
- **Developer Observatory**: `initObservatoryUI()` with **F3 / Ctrl+Shift+D** overlay toggle; `renderObservatory()` reads only the data layer
- **Decision telemetry**: `recordAutonomyDecision()` emits `decision.made` artifacts with score breakdown + confidence
- **World objects**: `TARS_WORLD_OBJECTS` registry (zones, presence levels), `TARS_COLLISION` (box/capsule/plane shape math), `TARS_PHYSICS` (gravity, integration, collision response), `initializeWorldObjects()`
- **Live hooks**: `need.changed`, `activityStarted`/`activityEndsAt` emitted from the autonomy engine
- **Creator Console**: 7-section collapsible control center; System, Behavior, Movement, Needs, Environment, Rendering, Debug; 22 actions all wired to real handlers — zero dead controls

## What Works
- Three.js 3D face with expressions, gestures, eye tracking
- Autonomy engine: need-driven activity selection with scoring
- World state persistence (localStorage)
- Right-side toolbar: 🏠 Home, ◈ INFRA, 📊 Observatory, 🧠 Brain, 📜 Journal, ⚙ System, 🎛 Creator Console
- 📊 Observatory: live world, behavior, needs, and event views rendered from `ObservatoryDataLayer` (no direct state reads); toggleable full-screen overlay via **F3 / Ctrl+Shift+D**
- Runtime server with WebSocket + REST API
- Health monitoring (CPU, memory, disk, temp, uptime) every 10s via `/api/events`
- Docker container monitoring (Unix only, graceful disable on Windows)
- Network host ping monitoring (3 hosts configured: tars, optiplex, truenas)
- Alert manager with threshold evaluation on CPU/memory/disk/temp
- Event bus with in-process pub/sub + WebSocket bridge
- Service heartbeat with staleness detection (60s threshold), all services refreshing every 10-30s
- Alert count badge in header, connection status dot
- INFRA tab: CPU, Memory, Disk, Temperature, Uptime, Services, Docker, Network, Alerts — all populated from live events + REST poll
- System tab: version info, runtime stats, dev tool navigation buttons
- Home tab: connection status display
- Settings tab (Creator Console): 7-section collapsible control center
  - System Controls: pause/resume/force/wander/reset, system mode, control mode
  - Behavior: emotion presets (14), activity testing (7), gesture testing (5)
  - Movement: go-to targets (6), look-at targets (5)
  - Needs: 6 need bars with +/- inject, reset to 50%
  - Environment: weather (7 conditions), time of day (5 presets), temperature, wind (5 levels)
  - Rendering: quality profile selector (HIGH / PI_BALANCED)
  - Debug: toggle checkboxes for collision volumes, zones, avoidance vectors, FPS, AI state
  - Developer Tools: tab navigation shortcuts, telemetry console, memory inspector
- Environment controls accessible from Creator Console: set weather, time, temperature, wind at runtime
- Render quality profile switching via Creator Console (HIGH / PI_BALANCED) with persist + reload
- Debug visualization toggles via Creator Console (collision volumes, zones, avoidance vectors, FPS, AI state)
- All 22 button actions wired to real handlers — zero dead controls

## Data Pipeline (verified)
```
health-monitor.js (10s) → eventBus.publish() → WsBridge (unfiltered) → WebSocket → TARS_EVENTS → tars-event CustomEvent → TARS_UI.renderInfra handler → DOM
```
All 10 event types (`health.cpu`, `.memory`, `.disk`, `.uptime`, `system.heartbeat`, `infra.docker.summary`, `.container`, `infra.network.summary`, `.host`, `alert.*`) traced and confirmed displayed.

## Deployment Reality

| Aspect | Current State | Notes |
|--------|--------------|-------|
| Development host | **Windows** | All development, testing, and server runtime |
| Node.js server | **Working** | `node pi-server/server.js` from terminal |
| Browser frontend | **Working** | Opens at `http://localhost:8080` |
| WebSocket event flow | **Working** | Server→browser event pipeline verified |
| Autonomy engine | **Working** | Full autonomy in browser, no server dependency |
| Raspberry Pi deployment | **Prepared (artifacts)** | Docker image + compose ready; **not yet deployed to node** (Phase 9.2) |
| Pi kiosk mode | **Not started** | No Chromium kiosk config, no `--kiosk` flags (later phase, display not attached) |
| systemd service | **Not started** | No service file created |
| Physical display testing | **Not started** | Touch targets not verified on 7" display |
| Optiplex/TrueNAS/Plex monitoring | **Not implemented** | Monitors not yet built (future Phase 8.3+) |
| Home Assistant bridge | **Not implemented** | No ha-bridge created |
| Deployment documentation | **Not started** | No install guide, no dependency list |

**Golden rule**: Do not imply Pi deployment is complete. All Phase 8.4 features should be developed and tested on Windows first.

## Persistence Boundaries

### Currently Persisting

| Store | Content | Mechanism | Survives Refresh? |
|-------|---------|-----------|-------------------|
| Browser localStorage | `worldState` (needs, fatigue, activity history, preferences, session, environment, objects) | `WorldPersistence.save()` on every decision/need update | **Yes** |
| Server memory | Event history (last 1000, circular buffer) | In-process array | **No** — lost on server restart |
| Server memory | Active alerts + alert history | In-process Map + array | **No** — lost on server restart |
| Server memory | Service registry (status, lastSeen) | In-process Map | **No** — lost on server restart |
| Server filesystem | `config/tars-config.json` | Static file | **Yes** — read on startup |
| Browser memory | Chat conversation history | In-process array | **No** — lost on refresh |

### Persistence Boundaries

```
localStorage (browser)           Server memory              Future (Phase 8.5+)
├── needs                        ├── event history          ├── SQLite event log
├── fatigue                      ├── active alerts          ├── SQLite alert history
├── activity history (200)       ├── service registry       ├── SQLite service history
├── experience buffer (100)      └── docker/network data    ├── episodic memory
├── preferences                                              └── semantic memory
├── session data
├── environment
└── objects (Phase 8.5: dynamic transforms + sleep)
```

### Future Persistence (Phase 8.5+)

| Feature | Storage | Purpose |
|---------|---------|---------|
| SQLite event log | Pi filesystem | Long-term event persistence beyond in-memory buffer |
| SQLite alert history | Pi filesystem | Persistent alert timeline across restarts |
| SQLite service history | Pi filesystem | Service uptime tracking |
| Episodic memory | SQLite | TARS experiences persisted beyond session |
| Semantic memory | SQLite | Learned facts and patterns from LLM interactions |

## Known Limitations
- **Temperature**: No thermal sensor on Windows — card shows "—". Requires Linux/Raspberry Pi `/sys/class/thermal/thermal_zone0/temp`
- **Temperature event type**: Embedded in `health.cpu` event as `data.tempC` (no separate `health.temperature` event type)
- **Docker**: Requires `/var/run/docker.sock` (Unix/Raspberry Pi only). Windows shows "No Docker"
- **No LLM connection**: Chat is placeholder, Brain tab shows "Cognitive layer offline"
- **Home Assistant integration**: Home tab is placeholder
- **Network monitor**: Uses ICMP ping (may require admin/root on some systems)
- **No authentication**: All API endpoints are public
- **Single-file frontend**: `tars_face_v1.html` ~9040 lines

## Not Yet Complete
- **Full ball dynamics**: interaction impulses + collision/sleep/wake events work, but rolling, contact resolution, friction, and compound shapes remain incomplete
- **Richer object interaction**: tap/flick impulse works; grab/knock/roll gestures, multi-tier collision response (COLLISION_TIERS), capsule-capsule, compound shapes incomplete
- **Advanced collision response**: multi-tier (COLLISION_TIERS) response, capsule-capsule, and compound shapes incomplete
- **SQLite event log / alert history**: still in-memory server buffers (see Future Persistence)
- **Episodic / semantic memory**: not started
- **LLM connection**: chat is placeholder, Brain tab shows "Cognitive layer offline"
- **Home Assistant bridge**: not started
- **Network monitors for Optiplex/TrueNAS/Plex**: not implemented (ICMP ping only for 3 hosts)
- **Raspberry Pi deployment**: no Pi hardware, no kiosk/systemd/service config
- **Frontend modularization**: single file still ~9040 lines
- **Automated test suite**: `test_observatory.js` regression (Phase 7.4.4 + Phase 8.5 world-event tests) run via Node directly

## Stabilization Audit (Phase 8.3.4)
All findings categorized:

### FIXED
- `setVal` `.value` → `.tars-data-value` selector mismatch (caused empty metric cards)
- `open-dev-tool` click handler missing after Phase 8.2 nav removal
- `renderInfra` interval/listener leak on tab re-open
- `renderHome` listener leak on tab re-open
- `throttledUpdate` re-rendered INFRA tab every 400ms (4+ API calls per cycle)

### KNOWN LIMITATIONS
- Temperature requires Linux thermal sensor
- Docker requires Unix socket
- Home tab is placeholder (no IoT integration yet)
- Brain tab "Cognitive layer offline" (no LLM yet)
- Chat is placeholder (no LLM yet)
- Status badge "🧠 OFFLINE" is hardcoded

### FUTURE WORK
- Two click listeners on `#tars-overlay-body` could be merged (non-critical)
- Phase 8.5: LLM integration, Home Assistant, alert notifications, modularization

## Next Steps (Phase 8.5+)
1. Complete ball dynamics (rolling, contact resolution, friction) and richer gestures (grab/knock/roll)
2. Connect LLM for cognitive layer (Brain tab + Chat)
3. Home Assistant / IoT integration (Home tab)
4. Weather, news, calendar feeds (Observatory expansion)
5. Alert notification system (push/toast)
6. SQLite event log + persistent alert/service history
7. Frontend modularization (split HTML into components)
8. Automated test suite for server monitors
9. Raspberry Pi deployment (kiosk, systemd, physical display)

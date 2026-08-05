# TARS Face — Current State

**Date**: 2026-08-04
**Version**: v7.5 + Phase 8.3.4 stabilization + Phase 8.4 Observable Spatial Runtime Base + Phase 8.5 Embodied Interaction Layer + Phase 9.1 Deployment Preparation + Phase 9.2 Node Deployment + Phase 9.3 Recovery Validation

## Completed
All behavior described below is delivered and verified. TARS frontend, backend, autonomy, world engine, and persistence are now **deployed and running on the Raspberry Pi node** (`tars_backend` on `:8080`) and have passed power-loss, Docker-restart, network-loss, and persistence recovery validation (Phase 9.3). Phase 9.4 physical embodiment work is now in progress: kiosk service verification has been completed, while display/touch validation and hardware reliability acceptance remain open. See `docs/PHASE_9_3_RECOVERY_TEST_REPORT.md`, `docs/PHASE_9_2_DEPLOYMENT_RESULT.md`, and root `HEAD.md`.

## Newly Integrated (Phase 9.3 — Recovery Validation)
- **Test-only phase** (no runtime/Docker/arch changes): validated `tars_backend` survives real hardware lifecycle events on the node.
- **Test 1 — container restart** (`docker restart tars_backend`): ✅ back `running`/`healthy` (`unless-stopped`); `/health ok`; frontend 200; module 200; 0 CDN refs; no log errors; other 7 containers untouched.
- **Test 2 — Docker daemon restart** (`systemctl restart docker`): ✅ all 8 containers auto-recovered; TARS healthy; frontend 200.
- **Test 3 — Pi reboot** (`sudo reboot`): ✅ Docker active; all 8 containers auto-started; TARS `running`/`healthy`; frontend 200; 8080 LISTENING.
- **Test 4 — persistence across reboot**: ✅ image `tars-backend:1.0.0` (`3a32657d09e5`), container ID, `WorldPersistence: v3`, and baked config unchanged; node-side persistence intact.
- **Test 5 — network loss** (iptables egress DROP on container): ✅ frontend/module served 200 during drop; `/health ok`; monitors kept publishing (328→345 events); autonomy confirmed client-side (287 refs); 0 CDN refs; rule removed cleanly; internet restored.
- **Result**: TARS self-recovers from container restart, daemon restart, full reboot, and network loss with zero intervention.

## Newly Integrated (Phase 9.2 — Node Deployment)
- **Deployed**: `tars_backend` container live on Pi `tars` (`tars.local`), port `8080`, isolated `tars_net` bridge, `restart: unless-stopped`, image `tars-backend:1.0.0` (arm64).
- **Sparse deployment**: only `projects/tars-face` subtree cloned to `/home/admin/tars-face` — full Amir_OS NOT deployed.
- **Coexistence verified**: worldmonitor (:3000), TSE FastAPI (:8000), Postgres (:5432), Ollama (:11434), DuckDNS all unchanged/healthy before==after. TARS occupies only `:8080`.
- **In-container Docker monitor self-disabled** by design (no `/var/run/docker.sock` mount) — host-side observability unaffected.
- **Result report**: `docs/PHASE_9_2_DEPLOYMENT_RESULT.md`; commit `97636ab`.

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
| Development host | **Windows** | All development and feature testing on Windows first |
| Node.js server | **Working** | `node pi-server/server.js` from terminal (dev fallback still valid) |
| Browser frontend | **Working** | Opens at `http://localhost:8080` |
| WebSocket event flow | **Working** | Server→browser event pipeline verified |
| Autonomy engine | **Working** | Full autonomy in browser, no server dependency |
| Raspberry Pi deployment | **✅ DEPLOYED (Phase 9.2)** | `tars_backend` container live on `tars` @ `tars.local:8080`, image `tars-backend:1.0.0`, `tars_net` bridge, `unless-stopped` |
| Recovery validation | **✅ PASSED (Phase 9.3)** | container restart / daemon restart / Pi reboot / network loss / persistence v3 all self-recovered |
| Pi kiosk mode | **In progress** | Kiosk service verification completed on `tars.local`; full hardware acceptance is still Phase 9.4 work |
| systemd service | **Verified for kiosk startup** | `tars-kiosk.service` has been verified active; repo/runbook capture should remain aligned with production |
| Physical display testing | **In progress** | Browser/canvas startup has been validated; display/touch acceptance criteria still need formal validation |
| Display/touchscreen attached | **Needs validation record** | Confirm and document display detection, touch mapping, and hardware reliability during Phase 9.4 |
| Optiplex/TrueNAS/Plex monitoring | **Not implemented** | Monitors not yet built (future) |
| Home Assistant bridge | **Not implemented** | No ha-bridge created |
| Deployment documentation | **✅ Complete** | `DEPLOYMENT_RUNBOOK.md`, `PHASE_9_1_*_PLAN.md`, `PHASE_9_2_DEPLOYMENT_RESULT.md`, `PHASE_9_3_RECOVERY_TEST_REPORT.md`, `PI_NODE_AUDIT.md`, `CURRENT_SERVICE_MAP.md` |

**Golden rule**: Pi deployment IS real (Phase 9.2 complete, Phase 9.3 validated). Kiosk service verification has started Phase 9.4 physical embodiment work, but Phase 9.4 is not complete until display/touch validation and hardware reliability are documented.

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

### Future Persistence (Phase 9+)

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
- **Physical presence (Phase 9.4 — in progress)**: kiosk service verification is complete; display detection, touchscreen validation, automatic visual startup evidence, and hardware reliability documentation remain incomplete.
- **Full ball dynamics**: interaction impulses + collision/sleep/wake events work, but rolling, contact resolution, friction, and compound shapes remain incomplete
- **Richer object interaction**: tap/flick impulse works; grab/knock/roll gestures, multi-tier collision response (COLLISION_TIERS), capsule-capsule, compound shapes incomplete
- **Advanced collision response**: multi-tier (COLLISION_TIERS) response, capsule-capsule, and compound shapes incomplete
- **SQLite event log / alert history**: still in-memory server buffers (see Future Persistence)
- **Episodic / semantic memory**: not started
- **LLM connection**: chat is placeholder, Brain tab shows "Cognitive layer offline"
- **Home Assistant bridge**: not started
- **Network monitors for Optiplex/TrueNAS/Plex**: not implemented (ICMP ping only for 3 hosts)
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

## Next Steps (Phase 9.4 — Physical Presence Layer)
1. **Display detection** — record HDMI/DVI output + `xrandr`/`vcgencmd` detection on the Pi
2. **Touchscreen validation** — touch input calibration, pointer events end-to-end
3. **Kiosk startup record** — keep `tars-kiosk.service` verification aligned with repo/runbook state
4. **Automatic TARS visual startup** — preserve cold browser startup evidence showing the Face appears without manual interaction
5. **Hardware reliability** — validate reboot/restart behavior with display and touch attached
6. Then: improve touch/world interaction (grab/knock/roll, richer gestures), camera/sensors when appropriate, deeper embodiment features

### After Phase 9.4
- Ball dynamics completion + richer gestures
- LLM cognitive layer (Brain tab + Chat)
- Home Assistant / IoT integration (Home tab)
- SQLite event log + persistent alert/service history
- Frontend modularization (split HTML into components)
- Automated test suite for server monitors

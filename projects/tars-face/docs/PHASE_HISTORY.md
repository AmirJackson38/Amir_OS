# Phase History

## Phase 1 — Foundation
- Three.js scene setup, face mesh, basic rendering
- OrbitControls, lighting, skeleton HTML/CSS

## Phase 2 — Animation
- Face expression system, gesture system
- Eye tracking, blinking, head movement
- Behavior presets (idle, listen, think, speak, etc.)

## Phase 3 — Interaction
- Keyboard/mouse interaction with the face
- Emotional response mapping

## Phase 4 — World State
- `worldState` object tracking TARS activity, location, needs
- Activity registry with compatibility scoring

## Phase 5 — Autonomy
- `TARS_AUTONOMY` engine: need-driven activity selection
- Decision scoring with multiple components (need, preference, fatigue, curiosity, recency, weather, idle)
- Activity fatigue/adaptation, experience buffer

## Phase 6 — Persistence
- `WorldPersistence` module: save/load worldState to localStorage
- Versioned save format

## Phase 7 — Observatory UI
- Right-side toolbar with overlay panels
- TARS_UI: Brain, Observatory, Journal, Settings (Creator Console)
- Session summary, event log (removed Phase 5 session tracking)
- Collapsible sections in Creator Console

## Phase 7.5 — Polish
- Responsive layout refinements
- Visual polish, animation timing

## Phase 8.1 — Runtime Server (committed)
- `pi-server/server.js` with HTTP/WS
- Event bus (`event-bus.js`) with publish/subscribe
- Health monitor (`health-monitor.js`): CPU, memory, disk, temp, uptime
- Status reporter (`status-reporter.js`): service heartbeat registry

## Phase 8.2 — Navigation Shell (committed, then removed)
- Bottom nav bar with 5 screens (World, Home, Infra, Monitor, System)
- Swipe/keyboard navigation, screen registry
- **BUG**: Missing `</style>` in `<head>` caused blank page
- **Removed in Phase 8.3.4**: Nav eliminated; UI merged into Phase 7 toolbar

## Phase 8.3.1 — Alert Manager (committed `6440d81`)
- `alert-manager.js`: threshold evaluation on health events
- `/api/alerts` endpoint, alert timeline display
- Dedup window, severity ordering (info < warning < critical)

## Phase 8.3.2 — Docker Monitor (committed `7bb538d`)
- `docker-monitor.js`: polls /var/run/docker.sock (read-only GET)
- Container state tracking, summary publishing
- Graceful disable on Windows (no socket)

## Phase 8.3.3 — Network Monitor (committed `4e458b4`)
- `network-monitor.js`: pings configured hosts
- Cross-platform ping (Windows + Unix)
- Host state tracking with change detection

## Phase 8.3.4 — Stabilization & UI Refactor (committed)
- Removed Phase 8.2 bottom nav bar and all nav CSS/HTML/JS
- Repurposed Phase 7 right-side toolbar as primary UI
- Added 🏠 Home, ◈ INFRA, ⚙ System as toolbar tabs
- Added `renderHome`, `renderInfra`, `renderSystem` to TARS_UI
- Fixed service stale heartbeat via periodic `reportUp` in all monitors
- Created documentation checkpoint
- **BUG FIX**: `setVal` `.value` → `.tars-data-value` class mismatch (empty metric cards)
- **BUG FIX**: `open-dev-tool` click handler missing after nav removal
- **BUG FIX**: `renderInfra` interval/listener leak on tab re-open
- **BUG FIX**: `renderHome` listener leak on tab re-open
- **BUG FIX**: `throttledUpdate` hammered INFRA with 4+ API calls every 400ms
- Stabilization audit: all 10 event types traced, all 15 UI components mapped, 0 regressions

## Phase 8.4 — Observable Spatial Runtime Base (working tree → checkpoint)
- **Renderer profiles**: `TARS_RENDER_PROFILES` (DESKTOP_HIGH / PI_BALANCED) + `detectRenderProfile()`; quality selector persists and survives reload
- **In-process event bus**: `TARS_EVENT_BUS`, `EVENT_CATEGORY_MAP`, `emitTARSEvent()` / `subscribeTARSEvent()` in the frontend
- **Observatory data layer**: `ObservatoryDataLayer` (ingestEvent, projected state, derived metrics); `renderObservatory()` reads the data layer only — no direct engine reads
- **Developer Observatory**: `initObservatoryUI()` full-screen overlay toggle via **F3 / Ctrl+Shift+D**; live world, behavior, needs, events views
- **Decision telemetry**: `recordAutonomyDecision()` emits `decision.made` artifacts with score breakdown + confidence
- **World objects**: `TARS_WORLD_OBJECTS` registry, `TARS_COLLISION` (box/capsule/plane shape math), `TARS_PHYSICS` (gravity, integration, collision response), `initializeWorldObjects()`
- **Live hooks**: `need.changed` and `activityStarted`/`activityEndsAt` emitted from the autonomy engine for the observatory feed
- Checkpoint commit anchored the full working tree as the Phase 8.4 base

## Phase 8.4.3 — TARS World Object / Spatial Framework
- Created `TARS_WORLD_OBJECTS` registry with collision objects, semantic zones, presence levels (visual/spatial/collision/interactive/physics)
- Created `TARS_COLLISION` service with shape math (box/capsule/plane/sphere), avoidance vector, nearest obstacle query
- Removed legacy `OBSTACLES` array (5 objects → 0 references)
- Migrated `getAvoidanceVector()` to delegate to `TARS_COLLISION` with identical avoidance force values
- Added `initializeWorldObjects()` with 5 registrations (desk, 2 racks, 2 plants) using legacy radii for exact backward compatibility
- 4 room zones: workstation, server_area, observation, relaxation
- Added debug visualization toggle (`?debug=world`): wireframe collision volumes, zone circles, avoidance arrow
- All legacy radii match: desk=1.3, rack-a=1.1, rack-b=1.0, plant-a=0.6, plant-b=0.6 → all +0.5 = same as old behavior

## Phase 8.4.3.6 — Creator Console Restoration & Expansion
- Added toolbar buttons: 📜 Journal, 🎛 Creator Console (settings tab now one click away)
- Restructured Creator Console into 7 logical collapsible sections:
  - **System Controls**: status grid + pause/resume/force/wander/reset + mode toggles
  - **Behavior**: 14 emotion presets, 7 activity tests, 5 gesture tests
  - **Movement**: 6 go-to targets (desk, racks, windows, home) + 5 look-at targets
  - **Needs**: 6 need bars with +/-10% inject + reset
  - **Environment**: weather (7 conditions), time of day (5 presets), temperature (+/-), wind (5 levels)
  - **Rendering**: quality profile selector (HIGH / PI_BALANCED) with persist + reload
  - **Debug**: checkbox toggles for collision volumes, zones, avoidance vectors, FPS, AI state
  - **Developer Tools**: tab shortcuts + telemetry console + memory inspector
- Added 7 handler functions: TARS_setWeather, TARS_setTimeOfDay, TARS_setTemperature, TARS_setWind, TARS_setRenderProfile, TARS_goTo, TARS_toggleDebug
- All 22 button data-action values wired to switch cases — zero dead controls
- Updated collapse state defaults (system, behavior, movement, needs, environment, rendering, debug start collapsed)

## Phase 8.5 — Embodied Interaction Layer
- **Input classifier**: `TARS_INPUT_CLASSIFIER` (canvas-only pointer listeners → tap/flick/drag/touch), fully UI-isolated with self-suspension while `#tars-overlay` / `#tars-chat` is open
- **World sensor**: `TARS_WORLD_SENSOR` (Raycaster pick, NDC conversion, `interactFromTouch()` impulse + `world.interaction` emission)
- **World agent**: `TARS_WORLD_AGENT` response pipeline (join_play / investigate / respond_later) routed only through `setTARSActivity()` / `lookAt()` / `queueWorldEvent()`; cooldown 1800ms, deferred queue cap 10
- **Physics event hooks**: `TARS_PHYSICS` emits `world.physics.impulse/collision/sleep/wake` (dedup 250ms) + `applyImpulse()` entry point; observation-only, no behavior coupling
- **Persistence v3**: `worldState.objects` snapshot + restore, `finalizeExperience()` interaction context, worldMemory salient interactions
- **Observatory telemetry**: world interaction section + ODL world ingest cases + `getWorldInteractionSummary()`
- **Tests**: `test_observatory.js` extended with world.interaction / collision / impulse ingestion + category tests (59 total, all passing)

## Phase 8.5 — Planned (not started)
- Ball rolling / contact resolution / friction completion
- Richer gestures (grab/knock/roll), compound collision shapes
- SQLite event log + persistent alert/service history
- LLM cognitive layer (Brain + Chat), Home Assistant bridge
- Raspberry Pi deployment (kiosk, systemd, physical display)

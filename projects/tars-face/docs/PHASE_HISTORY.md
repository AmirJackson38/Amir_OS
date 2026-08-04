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
- Raspberry Pi deployment (kiosk, systemd, physical display) → **completed in Phase 9.2–9.4**

## Phase 9.1 — TARS Node Deployment Preparation (committed `0b86279`)
- **Artifacts created + validated on Windows**: `Dockerfile` (node:20-alpine, non-root `node` user, `/srv/tars`, `EXPOSE 8080`, healthcheck), `docker-compose.yml` (service `tars-backend`, image `tars-backend:1.0.0`, `restart: unless-stopped`, isolated `tars_net` bridge, port `8080:8080` only), `.dockerignore` (excludes scratch tests + node_modules)
- **Frontend import repointed**: `tars_face_v1.html:418` `import * as THREE from "/three.module.js"` (local r161) instead of CDN — removes the single hard internet dependency; local `three.module.js` tracked (1,280,747 bytes)
- **Docs**: `DEPLOYMENT_RUNBOOK.md`, `PHASE_9_1_TARS_NODE_DEPLOYMENT_PLAN.md`, `PHASE_9_DEPLOYMENT_BLUEPRINT.md`, `PI_NODE_AUDIT.md` (live Pi introspection), `CURRENT_SERVICE_MAP.md`
- Validated: /health 200, page 200, three.module.js 200, 0 CDN refs, test_observatory 59/59

## Phase 9.2 — TARS Node Deployment (committed `97636ab`)
- **Deployed**: sparse clone of `projects/tars-face` only to `/home/admin/tars-face`; `docker compose up -d` → `tars_backend` `Up (healthy)` on `:8080`, isolated `tars_net`, `unless-stopped`, non-root `node` user
- **Coexistence**: all 7 pre-existing homelab containers (worldmonitor, TSE, postgres, duckdns, etc.) unchanged before==after; TARS occupies only `:8080`
- **Node facts**: Pi 4, Debian 13 trixie, aarch64, Docker 29.6.1, Compose v5.3.1; dual-homed eth0 192.168.0.102 + wlan0 10.0.0.231; headless (no display/X11/Chromium)
- Runbook doc fixes committed separately (`6687c4e`): rollback ordering (rm -rf before cd), "Pi's" typo
- **Report**: `docs/PHASE_9_2_DEPLOYMENT_RESULT.md`

## Phase 9.3 — Recovery Validation (committed `3124ec1`)
- **Test-only phase** (no runtime/Docker/arch changes, no display/kiosk work)
- **Test 1** `docker restart tars_backend`: ✅ healthy, /health ok, page 200, module 200, 0 CDN refs, no errors, others untouched
- **Test 2** `systemctl restart docker`: ✅ all 8 containers auto-recovered, TARS healthy (transient http=000 was a startup race, settled to 200)
- **Test 3** `sudo reboot`: ✅ SSH recovered, Docker active, all 8 containers auto-started, TARS healthy, 8080 LISTENING
- **Test 4** persistence across reboot: ✅ image ID `3a32657d09e5`, container ID, `WorldPersistence: v3`, baked config all unchanged; node-side persistence intact (client state is browser localStorage)
- **Test 5** network loss (iptables egress DROP on container): ✅ frontend/module 200 during drop, /health ok, monitors kept publishing (328→345), autonomy client-side (287 refs), 0 CDN refs; rule removed cleanly; internet restored
- **Report**: `docs/PHASE_9_3_RECOVERY_TEST_REPORT.md`

## Phase 9.4 — Physical Presence Layer (committed) — **MILESTONE: "TARS Physical Presence Achieved"**
- **Appliance boot**: `graphical.target` → `tars-kiosk.service` → `labwc` (Wayland) → Chromium kiosk on `http://127.0.0.1:8080/`; no login prompt, no keyboard
- **Display**: 800x480 DSI touchscreen (`card1-DSI-1`), `vc4-kms-v3d`, hardware GLES3.1 (V3D)
- **Touch**: `edt_ft5x06` mapped 1:1 (0–799 × 0–479), no calibration; taps/drag/long-press validated end-to-end
- **Stack**: `chromium` 150, `labwc` 0.9.8 (minimal compositor — no desktop env), `seatd` 0.9.1; dedicated `kiosk` user (uid 996)
- **Files**: `/etc/tars-kiosk/kiosk-session.sh`, `/etc/systemd/system/tars-kiosk.service` (`Restart=always`), `/etc/tmpfiles.d/tars-kiosk.conf`
- **Failure recovery validated**: reboot, hard reset, backend/Docker restart, Chromium crash, network unplug/restore
- **Existing services untouched**: 8 homelab containers + SSH healthy
- Docs: `PHASE_9_4_IMPLEMENTATION_REPORT.md` + render evidence PNGs

## Phase 9.5 — Embodied Presence Polish: Touch Controls (commits `c80e300`→`ab051d9`)
- **Touch controls**: long-press (≥300ms, <20px) grabs grabbable objects; `_dragPoint` drags along the plane at object height (clamped to `ROOM_BOUNDS`); `_launchVelocity` converts drag samples to world velocity (clamped 7 u/s); release = launch. Tap = `bounce()` (1.2 + impulse×1.6); swipe = `applyImpulse` kick. `touch-action:none` + `touchCallout:none` on the canvas (required on Pi — Chromium fires `pointercancel` otherwise).
- **TARS play block**: when `ballObj.physics.grabbed`, TARS sets `currentState.focus="user"` + `lookAt("user","watch_play")` instead of playing — so the ball is user-controlled while TARS watches.
- **Physics additions**: `grab()`, `dragTo()`, `release()`, `bounce()`; `update()` skips `p.grabbed` and kinematic bodies; `_emitCollision` position-param fix.
- **Root-cause fix**: embodied layer never bound — init guarded on `window.renderer` (module const, never on `window`) → always deferred; `TARS_PHYSICS`/`TARS_WORLD_OBJECTS`/`TARS_COLLISION`/`worldState`/`currentState`/`TARS_UI` also never exposed → sensor pick always empty. Exposed all on `window`; verified via CDP: `touch-action:none` applied, all gestures fire, ball responds, 0 exceptions.
- **Emoji fix**: Pi had no emoji font → menu icons as boxes. Installed `fonts-noto-color-emoji` on the node; glyphs render (verified via `document.fonts.check` + canvas pixel test).
- **Verification**: live CDP probes on the kiosk (grab→`grabbed:true`, drag tracks finger, release→launch vel `[0.91,-0.35,-0.05]`, tap→bounce, flick→kick; zero exceptions). CDP debug port 9222 via `tars-kiosk.service.d/debug.conf`.

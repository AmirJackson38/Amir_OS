# Amir OS Session Resume Bootstrap (TARS synchronized)

> **Historical context only:** Current project truth is maintained in root `HEAD.md`. Use this file only as background memory, and verify live state through `HEAD.md`, Git history, release tags, and production runtime evidence before acting.

> **Synchronized:** 2026-08-04
> **Amir OS:** v0.9.0
> **TARS status:** Phase 9.3 complete; Phase 9.4 is next.

## Active identity

**TARS (T.A.R.S. World Engine / Amir_OS)** is Amir OS's offline-first autonomous 3D world engine. Its browser-based Three.js **Face** is a persistent world simulation with an authoritative `worldState`, needs, activities, environment, physics objects, and telemetry. A Node.js runtime backend adds health/infrastructure awareness through an event bus and WebSocket bridge.

TARS is not an LLM wrapper. The frontend autonomy engine runs locally and independently of the backend and LLM. The autonomous scheduler selects behavior from world state; an LLM is a future optional consultant, never the primary controller.

## Authoritative TARS sources

- Project root: `projects/tars-face/`
- Entry rules: `projects/tars-face/AGENTS.md`
- Current implementation/status: `projects/tars-face/docs/CURRENT_STATE.md`
- Architecture: `projects/tars-face/docs/ARCHITECTURE.md`
- Milestones: `projects/tars-face/docs/PHASE_HISTORY.md`
- Recent proof: `docs/PHASE_9_2_DEPLOYMENT_RESULT.md`, `docs/PHASE_9_3_RECOVERY_TEST_REPORT.md`
- Main frontend: `projects/tars-face/tars_face_v1.html`

Read those records before changing TARS. Planning documents are not implementation truth; Git history and `CURRENT_STATE.md` are.

## Deployment reality

Windows is the development machine (edit, commit, push); Git is the source of truth; Raspberry Pi `tars.local` is production (Docker, Node, served Face, display/kiosk, future hardware). `localhost` on Windows is not production. For runtime validation: identify dev/deploy/prod status, then push, SSH to `tars.local`, pull, rebuild/restart when needed, and validate on Pi hardware.

## Architecture invariants

1. `worldState` is authoritative for TARS/world/environment state.
2. `TARS_AUTONOMY` and the scheduler control normal behavior through activity and location selection.
3. `WorldPersistence` v3 persists browser world state in localStorage across refreshes/restarts.
4. Frontend autonomy must remain functional with no server, network, or LLM.
5. The LLM layer is optional and constrained to consultation; it must not replace the scheduler or write primary state/events.
6. The Node runtime observes and publishes through the event bus; frontend/backend/cognitive/deployment layers remain separate.
7. Telemetry and the Observatory exist to explain decisions and behavior, not alter them.

## Completed state

### Phase 7 — autonomous world behavior
- Activity effects and needs feedback loop
- Fatigue, scoring rebalance, wandering, experience buffer, and lifecycle/persistence fixes
- Decision transparency: score breakdown, alternatives, `autonomyHistory`, and observability telemetry

### Phase 8 — observable runtime and embodiment
- Node HTTP/WebSocket runtime, event bus, WS bridge, health/status/alert monitors
- Docker and network awareness; INFRA UI and stabilization audit
- Developer Observatory, spatial object/collision/physics foundation, render profiles
- Embodied interaction: touch/pointer classifier, world sensor/agent, physics events, object persistence v3

### Phase 9 — resilient deployment
- Phase 9.1: offline-capable Docker deployment; local Three.js, no CDN dependency
- Phase 9.2: `tars_backend` deployed on Raspberry Pi `tars` (`192.168.0.102:8080`), isolated `tars_net`, `unless-stopped`
- Phase 9.3: recovery validation passed for container restart, Docker restart, Pi reboot, network loss, and persistence boundaries
- Environment update: `WindowEnvironmentProvider` provides static left/rear backgrounds with procedural fallbacks; assets are included in the Docker image

## Current mission — Phase 9.4 Physical Presence

1. Connect the 7-inch touchscreen to the Raspberry Pi and verify display detection.
2. Validate/calibrate touch and browser pointer events end-to-end.
3. Configure Chromium or equivalent kiosk mode for `http://127.0.0.1:8080`.
4. Configure Raspberry Pi autostart so the TARS Face appears on boot without manual interaction.

Do not claim kiosk/display readiness before the physical display is attached and tested.

## Known persistence boundary

Browser `localStorage` persists `worldState` (needs, activity history, environment, preferences, objects). Server event/alert/service history is intentionally in-memory and resets on a server/container restart; SQLite persistence is future work.

## Worktree note

As of synchronization, `master` is `90e1c26`. Scratch/debug HTML files in `projects/tars-face/` are untracked user artifacts and must not be removed without approval.

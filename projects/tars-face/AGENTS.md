# TARS — AI Agent Entry Point

**Repository-level truth starts at root `HEAD.md` and root `AGENTS.md`.** After reading those files, use this file as the TARS project entry point. If running from a Pi sparse checkout where root files are unavailable, this file is the local fallback entry point. It explains what TARS is, which docs are current, and what rules must not be broken.

## What Is TARS

TARS is a browser-based 3D face/animation system (Three.js) with a Node.js runtime server. The face runs in the browser with autonomous behavior, needs, and fatigue. The server provides health monitoring, infrastructure awareness, and alerting.

## Architecture Summary

```
Browser (tars_face_v1.html)           Server (pi-server/)
├── Three.js 3D face/scene            ├── HTTP + WebSocket (server.js)
├── TARS_AUTONOMY engine              ├── Event bus (event-bus.js)
├── TARS_UI toolbar panels            ├── WS bridge (ws-bridge.js)
│   ├── Home                          ├── Status reporter (status-reporter.js)
│   ├── INFRA                         ├── Health monitor (health-monitor.js)
│   ├── Observatory                   ├── Alert manager (alert-manager.js)
│   ├── Brain                         └── Infra monitors (services/infra/)
│   ├── System                            ├── docker-monitor.js
│   └── Settings                          └── network-monitor.js
├── WorldPersistence (world-state localStorage)
└── BehavioralMemory (separate versioned localStorage namespace)
```

Communication: Event bus → WS bridge → WebSocket → TARS_EVENTS → DOM events → TARS_UI

## Current Runtime Mode

```text
TARS_RUNTIME_MODE=legacy
```

The Phase 10.1 canonical runtime shell exists as an infrastructure-only contract
layer in `pi-server/`. It owns runtime identity, snapshot placeholders,
renderer registration, version ordering, and handshake validation only. It does
**not** own or mutate `worldState`, autonomy, persistence, weather, or
behavioral memory. The frontend remains authoritative until a later migration
phase explicitly changes this mode.

## Current Phase Status

- Phase 7: Complete — autonomy, needs, face, world simulation
- Phase 7.5 P1: Complete — decision telemetry (score breakdown, runner-up)
- Phase 8.1: Complete — runtime server, event bus, health monitor
- Phase 8.3.1: Complete — alert manager
- Phase 8.3.2: Complete — Docker monitor
- Phase 8.3.3: Complete — Network monitor
- Phase 8.3.4: Complete — UI refactor, nav removal, stabilization audit
- Phase 8.3.5: Complete — documentation stabilization (this checkpoint)
- Phase 8.4: Complete — observable spatial runtime base (event bus, ObservatoryDataLayer, developer observatory, world objects, collision, physics foundation, render profiles)
- Phase 8.5: **Complete** — embodied interaction layer (input classifier, world sensor, world agent, physics event hooks, persistence v3, observatory telemetry)
- Phase 9.1: **Complete** — node deployment preparation (`0b86279`)
- Phase 9.2: **Complete** — TARS deployed to Pi node (`tars_backend` :8080) `97636ab`
- Phase 9.3: **Complete** — recovery validation (container/daemon/reboot/network-loss/persistence) `3124ec1`
- **Phase 9.4 baseline** — physical embodiment and reliability work remains in progress. Kiosk service verification is complete; display/touch validation and hardware reliability remain open.
- **Phase 9.4 behavioral memory enhancement** — session/daily summaries, provenance, bounded persistence, inspection, and selected backend mirroring are implemented incrementally; this does not alter autonomy or world-state authority.
- **Current: Phase 10.2.1** — live shadow observation connected locally at 1 Hz; observation is diagnostic/non-authoritative and no authority has moved.
- **Next gate: Phase 10.2 validation review** — verify live receipts and bounded behavior before any Phase 10.3 extraction; do not enable canonical mode.

## Development Environment Reality

| Aspect | Documented | Actual |
|--------|-----------|--------|
| Host | Raspberry Pi (TARS_PHASE_* docs) | **Deployed**: `tars_backend` container live on `tars` @ `192.168.0.102:8080` (Phase 9.2). Development still on Windows. |
| Deployment | Systemd service, kiosk mode | **Docker** container `unless-stopped` (Phase 9.2). `tars-kiosk.service` has been verified active. Display/touch validation and hardware reliability remain Phase 9.4 work. |
| Optiplex/TrueNAS/Plex monitoring | Planned (TARS_PHASE_8_3 docs) | **Not implemented** |
| Home Assistant bridge | Designed | **Not implemented** |
| SQLite persistence | Designed (Phase 8.4) | **Not implemented** (uses localStorage) |
| Cognitive layer / LLM | Designed (Phase 8.5) | **Not implemented** |

**Golden rule**: Pi deployment IS real (Phase 9.2 complete, Phase 9.3 recovery-validated). Kiosk service verification is complete, but do NOT claim Phase 9.4 is complete until display/touch validation and hardware reliability are documented. Development remains Windows-first; the node runs the deployed image.

## Deployment Topology — Required Reality Check

| Role | Environment | Responsibility |
|------|-------------|----------------|
| Development machine | Windows workstation | Edit files, inspect code, run local development checks, commit, and push |
| Source of truth | Git repository | Versioned source and deployable commits |
| Production target | Raspberry Pi `tars.local` | Docker runtime, Node server, frontend serving, physical display, kiosk mode, and future touch/sensor hardware |

Windows is **not** the production runtime. Do not assume Windows Docker exists, that `localhost` is the deployed TARS service, or that a local render proves physical-hardware behavior.

**Deployment workflow:** make changes on Windows → commit → push → SSH to `tars.local` → pull the intended commit → rebuild/restart Docker only when required → validate the running service and physical hardware on the Pi.

Before runtime testing, explicitly identify the development environment, deployment target, and production status. Runtime validation belongs on `tars.local`; local checks validate source only.

## Golden Architecture Rules

### Runtime Authority Guard

`TARS_RUNTIME_MODE` supports `legacy`, `shadow`, and reserved `canonical` values.
The current default is `legacy`. In legacy and shadow modes, any attempted
canonical persistence or world mutation must be rejected. The Phase 10 shell
does not enable canonical writes even when the reserved mode is explicitly
named; authority migration requires a later approved phase.

1. **Frontend runs independently** — The face, autonomy, and world simulation must work without the server.
2. **LLM is consultant, not pilot** — Cognitive layer enriches but never controls. Autonomy engine is always the fallback.
3. **Monitors observe only** — No monitor writes to external systems. Read-only API calls.
4. **Event bus is the backbone** — All services communicate through events. No direct service-to-service calls.
5. **New integrations are adapters** — Each monitor is a standalone module registered in `server.js`. No hardcoded features.
6. **Layers stay separated** — Frontend, backend (runtime server), cognition (LLM/consultant), and deployment (Docker/kiosk) must remain isolated so each can be changed independently. Keep the deployed node reproducible via git + image tags.
7. **Runtime dependencies must be offline-capable** — No hard CDN/external requirement in the frontend (three.js is served locally). Everything shipped must degrade gracefully with no network.

## Files Requiring Caution

| File | Risk | Why |
|------|------|-----|
| `tars_face_v1.html` | Very high | 6900-line single-file frontend. Fragile. Verify paired tags after edits. |
| `pi-server/server.js` | High | Orchestrates all services. Startup order matters. |
| `pi-server/event-bus.js` | High | Contract enforcement. All services depend on it. |
| `pi-server/ws-bridge.js` | High | All browser communication. Filter/per-client state lives here. |
| `config/tars-config.json` | Medium | Runtime config. Don't add API keys in code. |

## Agent Startup Checklist

Before writing any code:

1. [ ] Read this file (AGENTS.md)
2. [ ] Read `docs/CURRENT_STATE.md` — what works, known issues
3. [ ] Read `docs/ARCHITECTURE.md` — current architecture reference
4. [ ] Read `docs/BEHAVIORAL_MEMORY.md` when working on session/daily memory or telemetry bridges
5. [ ] Read `docs/PHASE_HISTORY.md` — what was built and when
6. [ ] Read `docs/TARS_LESSONS_LEARNED.md` — mistakes to avoid
7. [ ] Read `docs/DECISIONS.md` — why key decisions were made
8. [ ] Inspect `git log --oneline -20` — recent context
9. [ ] Verify actual services: `ls pi-server/services/infra/` — don't trust planning docs
10. [ ] Check `docs/ARCHITECTURE.md` Documentation Status Map — know which docs are current vs historical

## Documentation Status

See `docs/ARCHITECTURE.md` §Documentation Status Map for a complete index of which files are current, forward-looking, or historical.

## Key Anti-Patterns

| Anti-pattern | Why | Correct |
|-------------|-----|---------|
| Monitor reads from SQLite | Circular dependency | Monitor polls API → publishes event → stored async |
| UI polls monitors directly | Bypasses event bus | All data through event bus |
| Alert manager creates timers | Duplicates monitor logic | Alert manager is a pure event processor |
| LLM writes to event bus | LLM could inject false events | LLM enriches async, never writes primary data |

# Active Project (v2 — TARS synchronized)

**Last Updated:** August 4, 2026
**Status:** Active — Phase 9.3 complete; Phase 9.4 next

## Current priority

**TARS Physical Presence Layer** in `projects/tars-face/`.

TARS is Amir OS's offline-first autonomous 3D world engine: a browser-based Three.js Face with authoritative `worldState`, autonomous scheduling, persistence, telemetry, and an optional Node runtime.

## Completed baseline

- **Phase 7:** activity effects, needs/fatigue, scoring, autonomy telemetry
- **Phase 8:** event bus/WS bridge, monitoring, Observatory, spatial physics, embodied interaction, persistence v3
- **Phase 9.1–9.3:** offline Docker build, Pi deployment (`tars_backend` on `:8080`), recovery validation
- **Environment:** static backgrounds, procedural fallbacks, Docker asset pipeline

## Architecture that must remain true

- The frontend autonomy engine works without an LLM, server, or internet.
- `worldState` is authoritative; the scheduler selects normal behavior.
- An LLM is future optional consultation, not control.
- `WorldPersistence` v3 preserves browser world state; telemetry explains decisions.

## Next milestone — Phase 9.4

1. Connect the 7-inch Pi touchscreen and verify display detection.
2. Validate touch/pointer input.
3. Configure browser kiosk mode for `http://127.0.0.1:8080`.
4. Configure Pi autostart for automatic TARS visual boot.

Authoritative project handoff: `projects/tars-face/docs/CURRENT_STATE.md`.

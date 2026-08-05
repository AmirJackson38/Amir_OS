# TARS Behavioral Memory

**Status:** Phase 9.4 implementation
**Schema:** behavioral memory v1

This document describes the implemented behavioral-memory boundary. It is not a replacement for world-state persistence or debug telemetry.

## Authority Boundaries

- **World State** is the authoritative current runtime state and remains in `tars_world_state_v1`.
- **Debug telemetry** remains bounded in-memory data (`autonomyHistory`, `activityLog`, event-bus and Observatory buffers).
- **Behavioral Memory** is derived from selected runtime events and contains compact summaries only.
- **Backend memory** is a bounded, non-authoritative mirror for inspection and operational visibility.
- No summary directly mutates world state or controls autonomy.

## Storage

Behavioral memory uses a separate browser-local namespace:

```text
tars_behavioral_memory_v1_a
tars_behavioral_memory_v1_b
```

Writes use two-slot copy-on-write storage. On load, the newest valid generation is selected. A corrupt or incomplete slot does not prevent world-state loading.

The store is schema-versioned (`schemaVersion: 1`) and retains up to 90 session summaries and 365 daily summaries. Future schema changes require explicit migrations.

## Memory Classes

`memoryClass` describes semantic lifetime:

- `ephemeral`: raw diagnostic events; not persisted by this layer.
- `expiring`: temporary conditions represented inside summaries, such as current weather.
- `durable`: factual behavioral history and retained summaries.

`retentionClass` describes storage policy:

- `session_archive`: bounded historical session summaries.
- `daily_durable`: daily factual summaries retained for long-term history.

This keeps semantic class separate from retention policy.

## Session and Daily Summaries

Session summaries record lifecycle, activity starts/completions/interruptions, durations, selected locations, interactions, weather observations, startup/shutdown facts, and errors. Sessions close as `closed` or `aborted`; stale active sessions are marked aborted on the next startup.

Daily summaries roll up source session IDs into objective activity, location, interaction, weather, restart, and error facts. Rollups are idempotent: a session can contribute only once.

Derived highlights require provenance identifying source sessions, source fact paths, generator version, confidence, and schema version. Facts are never generated from highlights.

## Event Ingestion

The summarizer consumes only selected events:

- `activity.started`, `activity.completed`, `activity.interrupted`
- `world.interaction`, `weather.changed`
- `world.loaded`, `world.saved`, `error.detected`

Decision candidates, full autonomy history, need snapshots, frame-level physics collisions, UI events, and render metrics remain debug-only. `experienceBuffer` is intentionally not connected; its ownership remains a separate investigation.

## Backend Mirror and Health

The approved observational event contract is:

- `behavior.session.started`
- `behavior.session.ended`
- `behavior.world.loaded`
- `behavior.world.saved`
- `behavior.activity.started`
- `behavior.activity.completed`
- `behavior.activity.interrupted`
- `behavior.error.detected`
- `behavior.session.summary`
- `behavior.daily.summary`
- `behavior.memory.health`

These events are mirrored through the existing WebSocket bridge. Bridge messages carry schema version, deterministic IDs, source, session ID, and payload. A bounded, non-authoritative mirror is exposed at `/api/behavioral-memory` and is lost on backend restart.

`/health` includes a `behavioralMemory` receipt with `enabled`, schema version, browser storage availability, active session, last successful write, last daily rollup, corruption flag, and mirrored summary counts.

The browser remains the authoritative source for behavioral memory.

## Inspection and Export

```javascript
window.TARS_BEHAVIORAL_MEMORY.inspect()
window.TARS_BEHAVIORAL_MEMORY.export({ date: "YYYY-MM-DD" })
window.getTARSBehavioralMemoryHealth()
```

Exports are JSON and include schema and provenance metadata.

## Explicit Non-Goals

This implementation does not add reflection, embeddings, vector search, LLM-generated memory, personality mutation, permanent decision storage, physics persistence, or backend-owned personality state.

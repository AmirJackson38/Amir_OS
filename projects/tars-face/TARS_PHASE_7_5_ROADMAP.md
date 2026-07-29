# TARS Phase 7.5+ Roadmap

## Current Architecture (Post-Phase 7.4)

```
Body Layer:      Three.js world + autonomous behavior engine
Developer Layer: Creator Console (observatory/control interface)
Future Brain:    Amir_OS cognitive layer (LLM)
```

## Phase 7.5 — Observatory Intelligence

No new features. Better insight into what already exists.

- Decision visualization: timeline of choices with score breakdowns
- "Why did TARS choose this?" trace view (reason + score components)
- Activity heatmaps: time spent per location/activity
- Behavior statistics: most frequent activities, average duration, need patterns
- Fatigue visualization: how fatigue decays over time per activity
- Telemetry filtering: filter console by activity type, location, or action

All data sources already exist in `worldState`, `autonomyHistory`, `activityFatigue`, `experienceBuffer`. No new state needed.

## Phase 8 — Cognitive Layer Connection

Connect TARS to Amir_OS / OmniRoute via the TARS_CHAT boundary.

- LLM receives compressed world snapshot (via `getTARSContext()` — already implemented)
- LLM sends structured intent JSON (mirrors existing `TARS.setBehavior()` format)
- LLM does NOT control the body directly
- Cognitive layer suggests/plans; body remains autonomous fallback
- Frontend retains full autonomous operation when LLM is offline

Key principle: the LLM is a consultant, not a pilot.

## Phase 9 — Memory Integration

Make the experience buffer meaningful.

- Preference learning from repeated activity patterns
- Long-term personality evolution based on interaction history
- Daily summaries of TARS activity
- Cross-session memory (experience buffer + persistence already support this)
- Emotional痕迹 (emotional memory traces tied to locations/activities)

The schema foundation exists: `worldState.tars.experienceBuffer`, `worldState.tars.preferences`, `WorldPersistence`.

## Non-Goals

- Do not add new state variables when existing data suffices
- Do not let the LLM write directly to worldState
- Do not remove the autonomous fallback
- Do not merge Body and Brain layers

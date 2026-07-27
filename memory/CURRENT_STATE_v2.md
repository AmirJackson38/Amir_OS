# Current State (v2 — Compressed to 1,500 chars max)

**Last Updated:** July 27, 2026  
**Character Budget:** 1,500 chars | **Current:** ~1,300 chars | **Status:** ✅ Within limit

---

## Active Focus

TARS World Engine Foundation (Phase 1) + Autonomous Scheduler (Phase 2) complete in single-file `tars_face_v1.html`. Zero LLM dependency - all local.

---

## Active Projects

1. **TARS World Engine** (Phase 1 ✅, Phase 2 ✅) — Centralized worldState, dual windows (city + bridge), generalized weather (10+ conditions), preferences/affinities, activity logging, autonomous needs scheduler. Deployed at `http://localhost:8080/tars_face_v1.html`.

2. **Amir OS** — Personal AI environment with memory system. Memory files at `/memory/*_v2.md`.

3. **Home Lab** — TrueNAS, TARS Pi, ER605, dual-subnet.

---

## Completed This Session (TARS)

- **Phase 1**: worldState, dual windows (right=city, left=bridge/river), weather engine (clear/rain/thunderstorm/snow/fog/etc), preferences (activities/locations/objects/conditions/routines), activity log (50 events), control panel buttons
- **Phase 2**: 5 needs (energy/curiosity/social/maintenance/comfort), 6 autonomous activities, scoring with time/weather/preference/recency, decisions every 2-5s
- **Visuals**: Left window bridge with towers, deck, cables, water, cars with headlights/taillights, parallax layers, day/night cycle for both windows
- **Fixes**: Left window hole in wall, rack LED/spark triggers, monitor state machine (terminal/tarsOS/matrix/starfield/syslogs), autonomy fx gate, activityStartedAt tracking

---

## Next Actions

1. Verify overnight autonomy run (browser tab throttling)
2. Phase 3: LLM intent parsing → behavioral JSON
3. Phase 4: Cross-session memory persistence

---

## Key Files

- `projects/tars-face/tars_face_v1.html` — Single-file Three.js app (no build)
- `memory/*_v2.md` — Consolidated memory

---

## See

`PROJECT_REGISTRY.md` for full inventory. `ACTIVE_PROJECT_v2.md` for current priority.
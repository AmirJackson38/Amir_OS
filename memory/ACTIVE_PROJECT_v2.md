## Current Priority

**TARS World Engine** — Phase 6 Stabilization (Activity Pacing + Log Usability) complete. Activity lifecycle, scoring bias fix, smart auto-scroll implemented. Ready for Phase 7. `http://localhost:8080/tars_face_v1.html`

---

## Project Breakdown


### 1. TARS World Engine
- **Phases 1-5 ✅** — World state, dual windows, weather, preferences, activity log, autonomous scheduler, persistence, priority/interruption system
- **Phase 6 ✅** — LLM integration boundary, world events, activity registry expansion
- **Phase 6 Stabilization ✅** — Activity durations (min/max per activity), lifecycle gating, recency penalty, scoring bias fix (location key mapping, need-weighted weather), smart auto-scroll, debug API

### 3. Home Lab
TrueNAS (`192.168.0.100`), TARS Pi, ER605 router, dual-subnet (`10.0.0.0/24` WAN + `192.168.0.0/24` LAN). VNC to iMac (`10.0.0.190`).

---

## Next Actions

1. Browser runtime test of autonomy pacing
2. Phase 7: Environmental events, ambient life & chat UI

---

## Key Files

- `projects/tars-face/tars_face_v1.html` — Single-file Three.js app (~5000 lines)
- `memory/*_v2.md` — Consolidated memory (canonical)

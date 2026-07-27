## Current Priority

**TARS World Engine** — Phase 3b (Priority & Control) complete. Phase 3c (Stabilization Pass) in progress. `http://localhost:8080/tars_face_v1.html`

---


## Project Breakdown


### 1. TARS World Engine
- **Phase 1 ✅** — Centralized worldState, dual windows (city + bridge), 10+ weather conditions, preferences/affinities, activity log, control panel
- **Phase 2 ✅** — 5 needs, 6 autonomous activities, scoring (time/weather/preference/recency/distance), decisions every 2-5s

### 3. Home Lab
TrueNAS (`192.168.0.100`), TARS Pi, ER605 router, dual-subnet (`10.0.0.0/24` WAN + `192.168.0.0/24` LAN). VNC to iMac (`10.0.0.190`).

---


## Next Actions

1. Phase 3c stabilization verifications — browser runtime test of all fixes
2. Phase 4: Cross-session memory persistence

---


## Key Files

- `projects/tars-face/tars_face_v1.html` — Single-file Three.js app (4357 lines)
- `memory/*_v2.md` — Consolidated memory (canonical)
- `tools/tars_intent_schema.json` — Phase 3 behavioral JSON schema
- `tools/tars_llm_prompt.md` — LLM prompt template
- `tools/memory_promoter.py` — Cleaned, feedback-loop-safe
- `tools/character_limiter.py` — Hard character limit enforcement

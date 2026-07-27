## Current Priority

**TARS World Engine** (Phase 1 complete, Phase 2 complete) — Single-file Three.js visual frontend with autonomous needs system. Zero LLM dependency. `http://localhost:8080/tars_face_v1.html`

---

## Project Breakdown

### 1. TARS World Engine
Centralized worldState, dual windows (city + bridge), generalized weather (10+ conditions), preferences/affinities, activity logging, autonomous needs scheduler. Phase 1 & 2 complete, Phase 3 planned.

### 2. Amir OS
Personal AI environment with memory system. Memory files at `/memory/*_v2.md`. Memory promoter with auto-detection and session-end checkpoint.

### 3. Home Lab
TrueNAS (`192.168.0.100`), TARS Pi, ER605 router, dual-subnet (`10.0.0.0/24` WAN + `192.168.0.0/24` LAN). VNC to iMac (`10.0.0.190`). Docs in `docs/home-lab-network.md`.

---

## Next Actions

* bug fix: bug fix in memory promoter: git diff of memory files was being re-promoted. implemented filtering to skip memory file diffs.


1. Verify overnight autonomy run (browser tab throttling)
2. Phase 3: LLM intent parsing to behavioral JSON
3. Phase 4: Cross-session memory persistence

---

## Known Bugs

---

## Key Files

- `projects/tars-face/tars_face_v1.html` — Single-file Three.js app (no build)
- `memory/*_v2.md` — Consolidated memory (canonical)
- `tools/memory_promoter.py` — Automatic memory promotion
- `tools/character_limiter.py` — Hard character limit enforcement

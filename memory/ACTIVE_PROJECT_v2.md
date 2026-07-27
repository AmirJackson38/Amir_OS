## Current Priority

**TARS World Engine** (Phase 1 ✅, Phase 2 ✅) — Single-file Three.js visual frontend with autonomous needs system. Zero LLM dependency. `http://localhost:8080/tars_face_v1.html`

---


## Project Breakdown


### 3. Home Lab

TrueNAS (`192.168.0.100`), TARS Pi, ER605 router, dual-subnet (`10.0.0.0/24` WAN + `192.168.0.0/24` LAN). VNC to iMac (`10.0.0.190`). Docs in `docs/home-lab-network.md`.

---


## Next Actions

1. Fix missing `drawIdle` in monitor state machine
2. Verify overnight autonomy run (tab throttling mitigation)
3. Phase 3: LLM intent → behavioral JSON
4. Phase 4: Cross-session persistence

---


## Key Files

- `projects/tars-face/tars_face_v1.html` — Single-file Three.js app (no build)
- `memory/*_v2.md` — Consolidated memory (hard limits enforced)
- `memory/STAGING_INTENT.md` — Phase 1 plan (Phase 1+2 complete)
- `tools/character_limiter.py` — Enforces hard limits

---


## See Also

`PROJECT_REGISTRY.md` for full inventory. `SESSION_LOG_v2.md` for flight recorder. `CURRENT_STATE_v2.md` for active focus.

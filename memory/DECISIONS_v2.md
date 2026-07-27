
### Decision: TARS World Engine — Single-File HTML + Three.js CDN (No Build)

**Date:** 2026-07-27

**Decision:** TARS frontend as single `tars_face_v1.html` with Three.js from CDN. No npm, no bundler, no TypeScript.

**Reasoning:** Zero-config deployment maximizes iteration speed. Browser DevTools = debugger. Hot reload = F5. Eliminates all tooling friction for visual/prototype work.

**Outcome:** 167KB single file, loads in <500ms. Phase 1 + Phase 2 complete in single session. Zero tooling maintenance.

---

### Decision: TARS Autonomy — Needs-Based Scoring with Time/Weather/Preference Weights

**Date:** 2026-07-27

**Decision:** 5 needs (energy/curiosity/social/maintenance/comfort) decay over 
... [TRUNCATED]

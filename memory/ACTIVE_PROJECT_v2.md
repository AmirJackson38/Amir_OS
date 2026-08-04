## Current Priority

**TARS (`projects/tars-face`)** — Phase 9.5 complete: touch controls (grab/drag/launch ball, tap=bounce, swipe=kick) verified live on the Pi kiosk via CDP; emoji font installed; root-cause fix for the embodied layer never binding (module consts not exposed on `window`). Kiosk appliance live (`tars_backend` on `:8080`).

---

## Project Breakdown

### 1. TARS Face (`projects/tars-face`)
- **Phases 1–8.5 ✅** — face, autonomy engine, world state, persistence, runtime server, observability, embodied interaction layer
- **Phase 9.1 ✅** — deployment artifacts (Dockerfile, compose, .dockerignore, local Three.js)
- **Phase 9.2 ✅** — deployed `tars_backend` on `tars` Pi `:8080` (isolated `tars_net`)
- **Phase 9.3 ✅** — recovery validated via test-only phase
- **Phase 9.4 ✅** — physical presence: kiosk boots Chromium on 800x480 DSI touchscreen; `edt_ft5x06` touch validated; recovery validated (reboot/power-loss/backend/Chromium crash/network)
- **Phase 9.5 ✅** — touch play controls: long-press grab, drag along plane, release launch; tap=bounce, swipe=kick; `touch-action:none` on canvas; `_uiBlocking()` guard; TARS watch_play focus when ball grabbed
- **Bugfix (9.5) ✅** — embodied layer never bound because `window.renderer` was always undefined (module-scoped const); `TARS_PHYSICS`, `TARS_WORLD_OBJECTS`, `TARS_COLLISION`, `worldState`, `currentState`, `TARS_UI` also never on window → sensor pick always empty. Exposed all on `window`; verified via CDP (`touch-action:none` applied, gestures fire, 0 exceptions).
- **Bugfix (9.5) ✅** — missing emoji in menu: no emoji font on Pi. Installed `fonts-noto-color-emoji`; glyphs now render (verified via `document.fonts.check` + canvas pixel test).
- **Next: Phase 9.6+** — richer play loop (TARS joins ball play), ambient awareness (camera/mic), offline assistant, complete ball dynamics, LLM layer, SQLite persistence

### 2. Home Lab
TrueNAS (`192.168.0.100`), TARS Pi (`192.168.0.102`, `tars_backend` :8080), ER605 router, dual-subnet (`10.0.0.0/24` WAN + `192.168.0.0/24` LAN). VNC to iMac (`10.0.0.190`).

### 3. TSE-Production-Lab
FastAPI + PostgreSQL homelab standalone (`Workspace/TSE-Production-Lab/`), container `tse_fastapi_backend` :8000 — unchanged by TARS deployment.

---

## Next Actions

1. Phase 9.6: TARS joins/watches ball play (`watch_play` already wired); refine play loop response timing
2. After: ambient awareness (camera/mic/sensors), persistent physical identity, offline assistant behavior (local models/voice), complete ball dynamics + richer gestures (knock/roll), LLM cognitive layer, SQLite persistence

---

## Key Files

- `projects/tars-face/tars_face_v1.html` — Single-file Three.js app
- `projects/tars-face/docs/` — CURRENT_STATE, PHASE_HISTORY, PHASE_9_1/9_2/9_3/9_4 reports
- `memory/*_v2.md` — Consolidated memory (canonical)
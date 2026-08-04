## Current Priority

**TARS (`projects/tars-face`)** — Phase 9.3 complete: frontend + backend (autonomy, world, physics, persistence, monitoring) deployed to the Pi node (`tars_backend` on `:8080`) and recovery-validated (container restart / daemon restart / Pi reboot / network loss / persistence). Next: **Phase 9.4 — physical presence layer**.

---

## Project Breakdown

### 1. TARS Face (`projects/tars-face`)
- **Phases 1–8.5 ✅** — face, autonomy engine, world state, persistence, runtime server, observability, embodied interaction layer
- **Phase 9.1 ✅** — deployment artifacts (Dockerfile, compose, .dockerignore, local Three.js)
- **Phase 9.2 ✅** — deployed `tars_backend` on `tars` Pi `:8080` (isolated `tars_net`)
- **Phase 9.3 ✅** — recovery validated via test-only phase
- **Next: Phase 9.4** — display detection, touchscreen validation, kiosk boot, auto TARS startup (display not yet attached)

### 2. Home Lab
TrueNAS (`192.168.0.100`), TARS Pi (`tars.local`, `tars_backend` :8080), ER605 router, dual-subnet (`10.0.0.0/24` WAN + `192.168.0.0/24` LAN). VNC to iMac (`10.0.0.190`).

### 3. TSE-Production-Lab
FastAPI + PostgreSQL homelab standalone (`Workspace/TSE-Production-Lab/`), container `tse_fastapi_backend` :8000 — unchanged by TARS deployment.

---

## Next Actions

1. Phase 9.4: attach 7" display → verify detection → touch calibration → kiosk autostart → TARS auto-launch on boot
2. After: richer touch/world interaction (grab/knock/roll), camera/sensors when appropriate, deeper embodiment

---

## Key Files

- `projects/tars-face/tars_face_v1.html` — Single-file Three.js app
- `projects/tars-face/docs/` — CURRENT_STATE, PHASE_HISTORY, PHASE_9_1/9_2/9_3 reports
- `memory/*_v2.md` — Consolidated memory (canonical)
## Active Focus

**Phase 9.4: TARS Physical Presence Layer** — Deploy the 7" touchscreen display: verify display detection, validate touch input, set up kiosk boot, and make TARS auto-launch visually on startup. Phase 9.3 (recovery validation) is complete.

---

## Active Projects

1. **TARS (`projects/tars-face`)** — Fully implemented + deployed to Pi node (`tars_backend` @ `:8080`), recovery-validated. Next: physical display.
2. **TSE-Production-Lab** — Homelab FastAPI + Postgres (unchanged).
3. **Home Lab** — TrueNAS, TARS Pi, ER605, dual subnet.

---

## Next Actions

1. Attach 7" touchscreen to Pi, verify HDMI/DVI detection
2. Validate touch input end-to-end
3. Config kiosk/autostart → browser fullscreen to `http://127.0.0.1:8080`
4. Verify TARS auto-starts visually without manual interaction

---

## Key Files

- `projects/tars-face/tars_face_v1.html` — Single-file Three.js app
- `projects/tars-face/docs/CURRENT_STATE.md` — full state + next steps
- `projects/tars-face/docs/PHASE_9_3_RECOVERY_TEST_REPORT.md` — recovery proof
- `memory/ACTIVE_PROJECT_v2.md` — project breakdown
## Active Focus

**Phase 9.5: Embodied Presence Polish (Touch Play)** — Complete. Touch controls work end-to-end on the Pi kiosk: long-press grab + drag + launch, tap = bounce, swipe = kick. Verified live via CDP probes (no exceptions, ball physics responds to every gesture). Phase 9.4 (physical presence) complete.

---

## Active Projects

1. **TARS (`projects/tars-face`)** — Phase 9.5 touch-play complete + deployed to Pi. Kiosk appliance running `tars_backend` @ `:8080` with Noto Color Emoji installed (menu icons fixed). Next: richer interaction, ambient sensors, LLM layer.
2. **TSE-Production-Lab** — Homelab FastAPI + Postgres (unchanged).
3. **Home Lab** — TrueNAS, TARS Pi, ER605, dual subnet.

---

## Next Actions

1. Richer object play loop: TARS joins/watches ball play via `watch_play` focus (guarded on `ballObj.physics.grabbed`)
2. Persistent physical identity / ambient awareness (camera, mic, sensors)
3. Offline assistant behavior (local models, voice)
4. Complete ball dynamics (rolling, friction, contact resolution) + compound collision shapes
5. LLM cognitive layer (Brain tab + Chat), SQLite event log

---

## Key Files

- `projects/tars-face/tars_face_v1.html` — Single-file Three.js app
- `projects/tars-face/docs/CURRENT_STATE.md` — full state + next steps
- `projects/tars-face/docs/PHASE_9_4_IMPLEMENTATION_REPORT.md` — kiosk appliance proof
- `memory/ACTIVE_PROJECT_v2.md` — project breakdown
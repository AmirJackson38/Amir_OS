
### Decision: TARS World Engine — Single-File HTML + Three.js CDN (No Build)

**Date:** 2026-07-27

**Decision:** TARS frontend as single `tars_face_v1.html` with Three.js from CDN. No npm, no bundler, no TypeScript.

**Reasoning:** Zero-config deployment maximizes iteration speed. Browser DevTools = debugger. Hot reload = F5. Eliminates all tooling friction for visual/prototype work.

**Outcome:** 167KB single file, loads in <500ms. Phase 1 + Phase 2 complete in single session. Zero tooling maintenance.

---

### Decision: TARS Touch Controls — Module-Scoped Objects Stay on `window`

**Date:** 2026-08-04

**Decision:** Expose module-scoped engine objects (`renderer`, `camera`, `scene`, `TARS_PHYSICS`, `TARS_WORLD_OBJECTS`, `TARS_COLLISION`, `worldState`, `currentState`, `TARS_UI`) on `window`; use bare module identifiers in internal guards.

**Reasoning:** `TARS_INPUT_CLASSIFIER.init()` guarded on `window.renderer` (never assigned) → the embodied layer silently never bound since Phase 8.5; `window.TARS_PHYSICS`-style guards made sensor `pick()` always return null. Exposing on `window` also enables CDP debugging (evaluate against `window.*`).

**Outcome:** Touch play verified live on the Pi kiosk (grab/drag/launch, tap=bounce, swipe=kick, 0 exceptions).

---

### Decision: Emoji on the Node — Install the Font, Don't Replace the Symbols

**Date:** 2026-08-04

**Decision:** Install `fonts-noto-color-emoji` on the Pi rather than swapping every emoji in the markup for DejaVu-compatible symbols.

**Reasoning:** Only 71 emoji chars used (17 unique, mostly menu icons). A system font fix is one command, keeps markup intact, and future-proofs any new emoji. Verified via `document.fonts.check` + canvas pixel test.

**Outcome:** Menu icons render correctly; no markup changes needed.

---

### Decision: TARS Autonomy — Needs-Based Scoring with Time/Weather/Preference Weights

**Date:** 2026-07-27

**Decision:** 5 needs (energy/curiosity/social/maintenance/comfort) decay over 
... [TRUNCATED]

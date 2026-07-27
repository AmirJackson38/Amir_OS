# Decisions Log (v2 — Compressed, Last 3 Decisions Only, 1,000 chars max)

**Last Updated:** July 27, 2026  
**Character Budget:** 1,000 chars | **Current:** ~950 chars | **Status:** ✅ Within limit  
**Rolling Window:** Keep last 3 decisions. Archive older ones to `DECISIONS_ARCHIVE.md`.

---

## Latest Decisions

### Decision: TARS World Engine — Single-File HTML + Three.js CDN (No Build)

**Date:** 2026-07-27

**Decision:** TARS frontend as single `tars_face_v1.html` with Three.js from CDN. No npm, no bundler, no TypeScript.

**Reasoning:** Zero-config deployment maximizes iteration speed. Browser DevTools = debugger. Hot reload = F5. Eliminates all tooling friction for visual/prototype work.

**Outcome:** 167KB single file, loads in <500ms. Phase 1 + Phase 2 complete in single session. Zero tooling maintenance.

---

### Decision: TARS Autonomy — Needs-Based Scoring with Time/Weather/Preference Weights

**Date:** 2026-07-27

**Decision:** 5 needs (energy/curiosity/social/maintenance/comfort) decay over time, restored at specific locations. 6 activities scored by (need deficit × restoration rate) + preference + time-of-day + weather + recency penalty + distance. Decision gate only blocks on truly blocking FX.

**Reasoning:** Pure utility-based agent with lightweight scoring > complex planning for this scope. Needs create internal pressure; preferences/environment create external pull. Simpler than HTN/GOAP, sufficient for room-scale autonomy.

**Outcome:** TARS cycles desk→rack→windows→user every 15-90s. Console logs show scores/needs. Tab throttling is only overnight risk.

---

### Decision: Monitor State Machine Replaces "Find by drawFn" Pattern

**Date:** 2026-07-27

**Decision:** Explicit states (`terminal`/`tarsOS`/`matrix`/`starfield`/`syslogs`/`codeReview`/`logCleanup`) with single `setMonitorState(monitor, state)` function. Screensaver cycles through matrix→starfield→syslogs when away >8s.

**Reasoning:** Old pattern raced — behavior triggers, screensaver, and manual switches all fought over `drawFn` via `setTimeout`. State machine makes transitions atomic and auditable.

**Outcome:** Zero flicker on desk arrival/departure. Screensaver cycles reliably. Zero race conditions.

---

---

**See:** `DECISIONS_ARCHIVE.md` for older decisions (2026-07-26 and earlier).
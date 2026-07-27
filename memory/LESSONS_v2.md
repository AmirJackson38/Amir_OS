# Lessons Learned (v2 — Compressed, Last 5 Lessons Only, 1,000 chars max)

**Last Updated:** July 27, 2026  
**Character Budget:** 1,000 chars | **Current:** ~980 chars | **Status:** ✅ Within limit  
**Rolling Window:** Keep last 5 lessons. Archive older ones to `LESSONS_ARCHIVE.md`.

---

## Recent Lessons

### Lesson: Single-File Architecture Enables Rapid Iteration

**Date:** 2026-07-27

**Context:** TARS World Engine built as single HTML file (Three.js via CDN, no build step).

**Lesson:** Eliminating build pipelines removes friction. Hot-reload = browser refresh. Debugging = browser DevTools. Zero config means faster cycles.

**Application:** Prefer single-file deployments for prototypes/visual tools. Avoid bundlers until necessary.

---

### Lesson: Autonomous Systems Need Observable State, Not Just Logic

**Date:** 2026-07-27

**Context:** TARS autonomy (Phase 2) initially "stuck" at spawn because `activityStartedAt` never updated and fx gate blocked decisions.

**Lesson:** Autonomous agents need visible state instrumentation (console logs, UI panels) AND working state transitions before logic tuning. `activityStartedAt` must update on every location change for time-based scoring.

**Application:** Add `console.log` for every decision point. Expose state via UI panel. Verify state transitions before tuning scoring weights.

---

### Lesson: Separate "Blocking" FX from "Ambient" FX for Autonomy

**Date:** 2026-07-27

**Context:** `currentState.fx !== "none"` gate blocked autonomy constantly because emotion presets set fx like "scan"/"slow_pulse".

**Lesson:** Classify fx as `blocking` (strobe, bounce, expansive) vs `ambient` (scan, slow_pulse, steady, drift). Autonomy gate only blocks on `blocking`.

**Application:** Define fx taxonomy early. Gate autonomy on intent, not presence of any fx.

---

### Lesson: Monitor State Machine Prevents Racing Timeouts

**Date:** 2026-07-27

**Context:** Desk monitors had racing `setTimeout` from behavior triggers + screensaver logic + manual switches.

**Lesson:** Replace "find by drawFn" pattern with explicit state machine (`terminal`/`tarsOS`/`matrix`/`starfield`/`syslogs`) and single `setMonitorState(monitor, state)` function.

**Application:** Explicit state machines > implicit function matching for any UI with competing async updates.

---

### Lesson: Git Commits Capture "Why" Not Just "What"

**Date:** 2026-07-27

**Context:** This session produced 753 insertions/deletions across 1 file but 4 major bug fixes + 2 phases of features.

**Lesson:** Commit message should document the bugs fixed and phases completed, not just file changes. Future debugging needs the narrative.

**Application:** Write commit messages that explain the problem solved, not just the files touched.

---

---

**See:** `LESSONS_ARCHIVE.md` for older lessons (2026-07-26 and earlier).
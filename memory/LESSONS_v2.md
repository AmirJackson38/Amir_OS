# Lessons Learned (v2 — Compressed, Last 5 Lessons Only, 1,000 chars max)

**Last Updated:** August 4, 2026  
**Character Budget:** 1,000 chars | **Current:** ~980 chars | **Status:** ✅ Within limit  
**Rolling Window:** Keep last 5 lessons. Archive older ones to `LESSONS_ARCHIVE.md`.

---

### Lesson: Module-Scoped Consts Aren't on `window` — Guards Silently No-Op
In the single-file frontend, `renderer`, `camera`, `TARS_PHYSICS`, `worldState` are module consts, NOT `window.*`. Guards like `if (window.renderer && ...)` were always false → classifier never bound, sensor pick always empty, zero errors. Touch "didn't work" for this reason. Verify module vars against `window` exposure before trusting a guard.

### Lesson: Git History Is the Source of Truth
Docs drift; `git log` doesn't. Cross-check any phase/deployment claim against commits before building on it. Git wins.

### Lesson: Phase Names Can Drift — Verify Before Assuming
Phase numbering drifted across the TARS arc (8.6 vs 9.x, TSE's separate numbering). Confirm the real milestone from git + result reports before assuming "next phase."

### Lesson: Audit Before Modifying
Every safe phase began with an audit + recorded before-state (containers, ports, commits, health). Before-states make rollback trivial and recovery validation concrete.

### Lesson: Runtime Dependencies Must Stay Offline-Capable
The CDN Three.js was the one hard internet dependency; eliminated by serving locally (Phase 9.1), proven under full egress drop (Phase 9.3). Never reintroduce a hosted requirement.

---

## Lessons Log
**2026-08-04** — Added Phase 7–9 lessons: git truth, phase drift, audit-first, offline-capable runtime, extend-don't-replace. Full detail in `projects/tars-face/docs/TARS_LESSONS_LEARNED.md` (§14–19).
**2026-08-04 (9.5)** — Added module-const-vs-window lesson (§20) + emoji font lesson (§21) in project docs.
# TARS Lessons Learned

## 1. Missing `</style>` Causes Blank Page
- **Bug**: Phase 8.2 introduced a `<style>` tag in `<head>` that was never closed with `</style>`
- **Effect**: Browser HTML parser treated everything after `<style>` as CSS content, swallowing `<body>` and all children → completely blank page
- **Debugging**: Took multiple rounds to find because the issue was invisible in DevTools (no errors, no body)
- **Fix**: Insert `</style>` before `</head>`
- **Lesson**: Always verify paired tags in HTML head sections, especially after edits

## 2. Right-Side Toolbar Hidden by z-index
- **Bug**: Phase 8.2's `#tars-screen-container` had `z-index: 750`, covering the toolbar at `z-index: 40`
- **Effect**: Toolbar appeared in DOM but was unclickable
- **Fix**: Removing the nav container eliminated the z-index conflict
- **Lesson**: When adding layers to a page, check z-index stacking context relative to existing interactive elements

## 3. Dual Navigation Creates Confusion
- **Issue**: Phase 8.2 bottom nav + Phase 7 right-side toolbar = two navigation systems
- **Problem**: Unclear which UI to use, content duplicated across panels
- **Resolution**: Remove Phase 8.2 nav, single toolbar as primary UI
- **Lesson**: Before adding a new navigation paradigm, decide if it replaces or complements existing navigation

## 4. Monitors Should Report Freshness
- **Issue**: Service `statusReporter.reportUp()` was called once at startup, leading to "stale" status after 60s
- **Fix**: Every monitor now calls `reportUp()` on each poll cycle (every 10-30s depending on monitor)
- **Lesson**: Any service registered with a heartbeat system must refresh its status periodically

## 5. Graceful Degradation on Windows
- **Docker**: No `/var/run/docker.sock` on Windows — docker-monitor checks availability on start, disables cleanly
- **Lesson**: Always test platform-specific features on the target platform early

## 6. Git Hygiene
- Phase 8.2 was committed with the blank-page bug
- Early testing after commit would have caught the issue
- **Lesson**: Open the page in a browser before committing frontend changes

## 7. Phase 8.2 Navigation Removal
- **Issue**: Phase 8.2 added a bottom navigation bar alongside the existing Phase 7 right-side toolbar
- **Problem**: Two navigation systems created duplicate UI ownership, z-index conflicts hiding the toolbar, duplicated content across panels, and user confusion about which nav to use
- **Resolution**: Removed the Phase 8.2 bottom nav entirely. Kept the Phase 7 toolbar as the single primary navigation. Added new tabs (Home, INFRA, System) to the toolbar instead of building a separate nav system
- **Lesson**: Before adding a new navigation paradigm, decide if it replaces or complements existing navigation. Adding a parallel system is almost always worse than extending the established one.

## 8. DOM Parser Failure — Missing Closing Tag
- **Bug**: A `<style>` tag was inserted in `<head>` without a matching `</style>`
- **Effect**: The browser HTML parser treated everything after `<style>` — including `<body>` and all content — as CSS. The page rendered completely blank with no DOM elements. No console errors.
- **Debugging**: Extremely hard to diagnose because DevTools showed no body element, no errors, and no warnings. The tag appeared correct at a glance.
- **Fix**: Insert `</style>` before `</head>`
- **Rule**: After any edit to `<head>`, verify all paired tags: `<style></style>`, `<head></head>`, `<body></body>`. The HTML parser does not warn about unclosed style tags.

## 9. Render Ownership — Listener Cleanup
- **Bug**: `TARS_UI.renderInfra()` and `TARS_UI.renderHome()` created new DOM event listeners and intervals on every call. Each tab switch accumulated duplicate listeners.
- **Effect**: Event handlers fired multiple times, intervals stacked, memory grew with each tab open.
- **Fix**: Store timer/handler references on `this` (e.g., `this._infraTimer`, `this._homeHandler`). Clean up in `destroy()` or at the top of the next render call.
- **Pattern**:
  ```javascript
  // render creates listener
  if (this._infraHandler) document.removeEventListener("tars-event", this._infraHandler);
  this._infraHandler = (e) => { ... };
  document.addEventListener("tars-event", this._infraHandler);
  ```
- **Lesson**: Any function that subscribes to events or creates intervals must own its cleanup. Store references on the owning object.

## 10. Avoid Full Re-render Loops
- **Bug**: `throttledUpdate()` called `TARS_UI.renderInfra()` every 400ms, which made 4+ REST API calls (`/api/events`, `/api/alerts`) per cycle. This hammered the server and destroyed DOM state.
- **Fix**: Skip full re-render for tabs that have their own event-driven updates (`home`, `infra`, `system`). Let their dedicated handlers (e.g., `refreshHomeLive()`) update only changed data.
- **Lesson**: A global throttle loop should not re-render stateful views. Prefer event-driven updates for individual panels. The throttle is for the lightweight status header and the 3D scene, not for API-dependent panels.

## 12. Single-File Frontend Risk
- **Issue**: `tars_face_v1.html` is currently 6900+ lines of HTML, CSS, and JS in a single file
- **Risk**: High change collision — any edit anywhere in the file can break unrelated functionality. Missing paired tags (`</style>`) can swallow the entire document. Class name contracts between CSS and JS are brittle.
- **Mitigation**: Verify paired tags after every `<head>` edit. Test in browser after every commit. Use unique IDs and data attributes for JS hooks instead of CSS class selectors.
- **Future**: Modularize gradually — extract JS into separate files first, then CSS. But do this incrementally; a single big refactor is riskier than the current state.
- **Lesson**: Single-file architectures are acceptable for prototypes but become a maintenance liability beyond ~3000 lines. Plan modular extraction as technical debt.

## 13. Development Environment vs Deployment Target
- **Issue**: All architecture documentation targets Raspberry Pi as the primary runtime host, but all development and testing initially occurred on Windows. Pi deployment (systemd service, kiosk mode, physical display, Docker on ARM64) was originally untested.
- **UPDATE (Phase 9.2/9.3, 2026-08-04)**: Docker deployment on the Pi node is now complete and recovery-validated — see `PHASE_9_2_DEPLOYMENT_RESULT.md`, `PHASE_9_3_RECOVERY_TEST_REPORT.md`. The software container (`tars_backend` :8080) is live. **Kiosk + physical display remain untested** and are the Phase 9.4 scope, gated on a physically attached screen. So this lesson is now partly superseded: verify the platform before claiming readiness still holds, and hardware (touchscreen/kiosk) is exactly such an unverified platform.
- **Bug**: `TARS_UI.setVal()` used `element.querySelector(".value")` but the DOM was rendered with class `tars-data-value`. The class had been renamed in CSS but the JS `querySelector` was never updated.
- **Effect**: Metric cards showed empty values with no errors. The gap was invisible in normal debugging because no exception was thrown — just no matching element.
- **Fix**: Update selector to `.tars-data-value` in all four locations.
- **Rule**: DOM class names are contracts between CSS and JS. If a class is renamed in HTML/CSS templates, all JS selectors referencing it must be updated. Prefer single-source selectors or data attributes for JS hooks.

## 14. Git History Is the Source of Truth
- **Lesson**: The committed history (`git log`) is the canonical record of what actually shipped — which phases completed, which files changed, what order events happened. Memory/docs files drift and go stale; git does not.
- **Rule**: Before trusting a doc's claim about phase state or deployment status, cross-check against `git log` and the deployment result reports. When docs and git disagree, git wins and the doc needs a sync.

## 15. Phase Names Can Drift — Verify Before Assuming
- **Lesson**: Phase numbering in docs drifted during the TARS arc (e.g., "Phase 8.5+ planned" vs actual `8.6`, "Next Phase 8.6" vs actual 9.x, and a separate TSE-Production-Lab with its own phase numbering). A "current phase" claim in one file often disagreed with another.
- **Rule**: Confirm the true phase/milestone from git + result reports before building on it. Name drift causes wrong assumptions and wasted work. Docs should state their date and the commit they reflect.

## 16. Audit Before Modifying
- **Lesson**: Every successful phase started with an audit (Phase 8.3.4 audit, Phase 8.5 architecture audit, Phase 9.2 preflight/before-state, Phase 9.3 before-state records). Audits made changes safe by recording exact before-states.
- **Rule**: Record before-state (containers, ports, commits, health) before any deployment/lifecycle action. An audit makes rollback trivial and gives recovery validation something concrete to compare against.

## 17. Runtime Dependencies Must Remain Offline-Capable
- **Lesson**: The single hard internet dependency (Three.js from CDN) was eliminated by serving `three.module.js` locally (Phase 9.1). Phase 9.3 proved the frontend keeps working with the container's egress fully dropped.
- **Rule**: Every shipped dependency must work with zero network. The face, autonomy, world, physics, and persistence are all client-side + locally-served. Never reintroduce a CDN/hosted requirement.

## 18. Frontend, Backend, Cognition, and Deployment Layers Stay Separated
- **Lesson**: The frontend runs without the server; the backend (runtime server) runs independently in a container; cognition (LLM) is a not-yet-wired consultant; deployment (Docker/kiosk) is a separate isolated concern on the node. Separation let Phase 9.3 test each lifecycle event without touching autonomy or world logic.
- **Rule**: No layer may reach into another. Deployment changes never rewrite autonomy/physics/persistence code; cognitive features never write primary event data. Extend each layer additively, replace nothing.

## 19. Extend Existing Systems, Don't Replace Them
- **Lesson**: Phase 9 added only add-only artifacts (Dockerfile, compose, .dockerignore, local module import) on top of the existing architecture; Phase 9.3 was test-only. Everything old kept working as the fallback (`node server.js` + browser remains valid).
- **Rule**: Prefer extending established systems over parallel replacements. Rollback stays trivial when new work is additive. If a parallel system must exist, isolate and document it explicitly (as deployment layer does).

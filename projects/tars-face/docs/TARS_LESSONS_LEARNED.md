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

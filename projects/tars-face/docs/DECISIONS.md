# TARS Architecture Decision Records

## ADR-001: Phase 8.2 Navigation Removal

**Date**: 2026-07-29
**Status**: Implemented

### Context

Phase 8.2 introduced a bottom navigation bar with 5 screens (World, Home, Infra, Monitor, System) as a carousel/swipe interface. The Phase 7 right-side toolbar already existed with tabs (Brain, Observatory, Journal, Chat, Settings). This created two parallel navigation systems.

### Problem

1. **Duplicate UI ownership** — Content was spread across both systems. Some panels existed in the toolbar, others in the bottom nav.
2. **Z-index conflict** — The bottom nav container (`#tars-screen-container`) had `z-index: 750`, covering the toolbar at `z-index: 40`. The toolbar appeared in DOM but was unclickable.
3. **Duplicate information surfaces** — INFRA metrics, system information, and observatory data appeared in both navigation systems.
4. **User confusion** — Two different navigation paradigms competing for the same interaction space.

### Decision

Remove the Phase 8.2 bottom navigation shell entirely. Keep the Phase 7 right-side toolbar as the single primary UI. Add new tabs to the toolbar instead of building a separate navigation system.

### Replacement

The toolbar was updated to include:
- 🏠 Home (connection status)
- ◈ INFRA (live health metrics, services, alerts)
- 📊 Observatory (autonomy telemetry)
- 🧠 Brain (decision scores, runner-up)
- ⚙ System (dev tools, runtime info)

### Consequences

**Positive**:
- Single navigation paradigm (toolbar only)
- No z-index conflicts
- No duplicate content
- New features add tabs to existing toolbar
- Simpler CSS and JS (no screen registry, no carousel, no swipe handlers)

**Negative**:
- Chat tab removed from toolbar (no 💬 button) — Chat is only accessible programmatically via `TARS_UI.openTab("conversation")` which has no UI trigger. Marked as future work.
- Lost carousel swipe navigation for Pi touch display (would need to be re-added to toolbar if needed later)
- Phase 8.2 screen registry and render functions were removed (would need re-implementation if a carousel is ever desired)

### Lessons

- Before adding a new navigation paradigm, decide if it replaces or complements the existing one.
- Adding a parallel navigation system is almost always worse than extending the established one.
- Z-index should be checked across all interactive layers when adding new UI.

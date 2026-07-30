# Phase History

## Phase 1 — Foundation
- Three.js scene setup, face mesh, basic rendering
- OrbitControls, lighting, skeleton HTML/CSS

## Phase 2 — Animation
- Face expression system, gesture system
- Eye tracking, blinking, head movement
- Behavior presets (idle, listen, think, speak, etc.)

## Phase 3 — Interaction
- Keyboard/mouse interaction with the face
- Emotional response mapping

## Phase 4 — World State
- `worldState` object tracking TARS activity, location, needs
- Activity registry with compatibility scoring

## Phase 5 — Autonomy
- `TARS_AUTONOMY` engine: need-driven activity selection
- Decision scoring with multiple components (need, preference, fatigue, curiosity, recency, weather, idle)
- Activity fatigue/adaptation, experience buffer

## Phase 6 — Persistence
- `WorldPersistence` module: save/load worldState to localStorage
- Versioned save format

## Phase 7 — Observatory UI
- Right-side toolbar with overlay panels
- TARS_UI: Brain, Observatory, Journal, Settings (Creator Console)
- Session summary, event log (removed Phase 5 session tracking)
- Collapsible sections in Creator Console

## Phase 7.5 — Polish
- Responsive layout refinements
- Visual polish, animation timing

## Phase 8.1 — Runtime Server (committed)
- `pi-server/server.js` with HTTP/WS
- Event bus (`event-bus.js`) with publish/subscribe
- Health monitor (`health-monitor.js`): CPU, memory, disk, temp, uptime
- Status reporter (`status-reporter.js`): service heartbeat registry

## Phase 8.2 — Navigation Shell (committed, then removed)
- Bottom nav bar with 5 screens (World, Home, Infra, Monitor, System)
- Swipe/keyboard navigation, screen registry
- **BUG**: Missing `</style>` in `<head>` caused blank page
- **Removed in Phase 8.3.4**: Nav eliminated; UI merged into Phase 7 toolbar

## Phase 8.3.1 — Alert Manager (committed `6440d81`)
- `alert-manager.js`: threshold evaluation on health events
- `/api/alerts` endpoint, alert timeline display
- Dedup window, severity ordering (info < warning < critical)

## Phase 8.3.2 — Docker Monitor (committed `7bb538d`)
- `docker-monitor.js`: polls /var/run/docker.sock (read-only GET)
- Container state tracking, summary publishing
- Graceful disable on Windows (no socket)

## Phase 8.3.3 — Network Monitor (committed `4e458b4`)
- `network-monitor.js`: pings configured hosts
- Cross-platform ping (Windows + Unix)
- Host state tracking with change detection

## Phase 8.3.4 — UI Refactor (current, uncommitted)
- Removed Phase 8.2 bottom nav bar and all nav CSS/HTML/JS
- Repurposed Phase 7 right-side toolbar as primary UI
- Added 🏠 Home, ◈ INFRA, ⚙ System as toolbar tabs
- Added `renderHome`, `renderInfra`, `renderSystem` to TARS_UI
- Fixed service stale heartbeat via periodic `reportUp` in all monitors
- Created documentation checkpoint

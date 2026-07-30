# TARS Face — Current State

**Date**: 2026-07-29
**Version**: v7.5 + Phase 8.3.4 stabilization audit (committed)

## What Works
- Three.js 3D face with expressions, gestures, eye tracking
- Autonomy engine: need-driven activity selection with scoring
- World state persistence (localStorage)
- Right-side toolbar: 🏠 Home, ◈ INFRA, 📊 Observatory, 🧠 Brain, ⚙ System
- Runtime server with WebSocket + REST API
- Health monitoring (CPU, memory, disk, temp, uptime) every 10s via `/api/events`
- Docker container monitoring (Unix only, graceful disable on Windows)
- Network host ping monitoring (3 hosts configured: tars, optiplex, truenas)
- Alert manager with threshold evaluation on CPU/memory/disk/temp
- Event bus with in-process pub/sub + WebSocket bridge
- Service heartbeat with staleness detection (60s threshold), all services refreshing every 10-30s
- Alert count badge in header, connection status dot
- INFRA tab: CPU, Memory, Disk, Temperature, Uptime, Services, Docker, Network, Alerts — all populated from live events + REST poll
- System tab: version info, runtime stats, dev tool navigation buttons
- Home tab: connection status display

## Data Pipeline (verified)
```
health-monitor.js (10s) → eventBus.publish() → WsBridge (unfiltered) → WebSocket → TARS_EVENTS → tars-event CustomEvent → TARS_UI.renderInfra handler → DOM
```
All 10 event types (`health.cpu`, `.memory`, `.disk`, `.uptime`, `system.heartbeat`, `infra.docker.summary`, `.container`, `infra.network.summary`, `.host`, `alert.*`) traced and confirmed displayed.

## Known Limitations
- **Temperature**: No thermal sensor on Windows — card shows "—". Requires Linux/Raspberry Pi `/sys/class/thermal/thermal_zone0/temp`
- **Temperature event type**: Embedded in `health.cpu` event as `data.tempC` (no separate `health.temperature` event type)
- **Docker**: Requires `/var/run/docker.sock` (Unix/Raspberry Pi only). Windows shows "No Docker"
- **No LLM connection**: Chat is placeholder, Brain tab shows "Cognitive layer offline"
- **Home Assistant integration**: Home tab is placeholder
- **Network monitor**: Uses ICMP ping (may require admin/root on some systems)
- **No authentication**: All API endpoints are public
- **Single-file frontend**: `tars_face_v1.html` ~6900 lines

## Stabilization Audit (Phase 8.3.4)
All findings categorized:

### FIXED
- `setVal` `.value` → `.tars-data-value` selector mismatch (caused empty metric cards)
- `open-dev-tool` click handler missing after Phase 8.2 nav removal
- `renderInfra` interval/listener leak on tab re-open
- `renderHome` listener leak on tab re-open
- `throttledUpdate` re-rendered INFRA tab every 400ms (4+ API calls per cycle)

### KNOWN LIMITATIONS
- Temperature requires Linux thermal sensor
- Docker requires Unix socket
- Home tab is placeholder (no IoT integration yet)
- Brain tab "Cognitive layer offline" (no LLM yet)
- Chat is placeholder (no LLM yet)
- Status badge "🧠 OFFLINE" is hardcoded

### FUTURE WORK
- Chat button missing from toolbar — no way to open chat from UI
- Two click listeners on `#tars-overlay-body` could be merged (non-critical)
- Phase 8.4: LLM integration, Home Assistant, alert notifications, modularization

## Next Steps (Phase 8.4)
1. Connect LLM for cognitive layer (Brain tab + Chat)
2. Home Assistant / IoT integration (Home tab)
3. Weather, news, calendar feeds (Observatory expansion)
4. Alert notification system (push/toast)
5. Frontend modularization (split HTML into components)
6. Automated test suite for server monitors
7. Raspberry Pi deployment testing

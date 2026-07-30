# TARS Face — Current State

**Date**: 2026-07-29
**Version**: v7.5 + Phase 8.3 infra monitors (uncommitted)

## What Works
- Three.js 3D face with expressions, gestures, eye tracking
- Autonomy engine: need-driven activity selection with scoring
- World state persistence (localStorage)
- Right-side toolbar: 🏠 Home, ◈ INFRA, 📊 Observatory, 🧠 Brain, ⚙ System
- Runtime server with WebSocket + REST API
- Health monitoring (CPU, memory, disk, temp, uptime) every 10s
- Docker container monitoring (Unix only, graceful disable on Windows)
- Network host ping monitoring
- Alert manager with threshold evaluation
- Event bus with in-process pub/sub + WebSocket bridge
- Service heartbeat with staleness detection (60s threshold), all services refreshing every 10-30s
- Alert count badge in header, connection status dot

## Known Limitations
- No LLM connection — chat is placeholder
- Home Assistant integration — placeholder panel
- Docker monitor requires /var/run/docker.sock (Unix/Raspberry Pi only)
- Network monitor uses ICMP ping (may require admin/root on some systems)
- No authentication on API endpoints
- Single-file frontend (tars_face_v1.html ~6300 lines) — could benefit from modularization

## Next Steps (Phase 8.4+)
1. Connect LLM for cognitive layer (Brain tab)
2. Home Assistant / IoT integration (Home tab)
3. Weather, news, calendar feeds (Observatory expansion)
4. Alert notification system (push/toast)
5. Frontend modularization (split HTML into components)
6. Automated test suite for server monitors
7. Raspberry Pi deployment testing

# TARS Face Architecture

## Overview

TARS Face is a browser-based 3D face/animation system with a Node.js runtime server. The face runs in the browser (Three.js), the brain runs on the server.

## Architecture Layers

### 1. Frontend (`tars_face_v1.html`)
- **Three.js 3D Scene**: Face mesh, eyes, gestures, environment
- **TARS World State** (`worldState`): Client-side state representing TARS activity, needs, fatigue, location, autonomy decisions
- **TARS_UI**: Right-side toolbar panel system (home, infra, observatory, brain, system)
- **Event Bus Client** (`TARS_EVENTS`): WebSocket client receiving server events
- **Autonomy Simulator** (`TARS_AUTONOMY`): Activity selection, decision engine, need-based behavior

### 2. Runtime Server (`pi-server/server.js`)
- HTTP + WebSocket server
- **Event Bus**: In-process pub/sub event system
- **Status Reporter**: Service registry with heartbeat/staleness detection
- **Health Monitor**: CPU, memory, disk, temperature, uptime
- **Docker Monitor**: Reads /var/run/docker.sock (read-only GET operations)
- **Network Monitor**: Pings configured hosts
- **Alert Manager**: Threshold evaluation from health events

### 3. Communications
- WebSocket: Server pushes events to browser (health updates, alerts, docker/network data)
- REST API: `/health`, `/api/events`, `/api/alerts` endpoints

## Key Principles
- **Monitors produce facts, never control**: Monitors publish events; consumers (alert-manager, UI) evaluate
- **One data source per panel**: No duplicated dashboards
- **Pi readiness**: All monitors degrade gracefully on Windows (no /var/run/docker.sock, ping fallback)

## File Map
- `tars_face_v1.html` — complete frontend (HTML + CSS + JS)
- `pi-server/server.js` — runtime server entry point
- `pi-server/services/event-bus.js` — in-process event bus
- `pi-server/services/status-reporter.js` — service heartbeat registry
- `pi-server/services/health-monitor.js` — system health polling
- `pi-server/services/alert-manager.js` — threshold-based alert evaluation
- `pi-server/services/infra/docker-monitor.js` — read-only Docker API polling
- `pi-server/services/infra/network-monitor.js` — host ping monitoring
- `config/tars-config.json` — runtime configuration

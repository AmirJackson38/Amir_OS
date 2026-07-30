> **⚠️ HISTORICAL DOCUMENT**
> This document describes the Phase 8.3 architecture plan. Multiple sections describe monitors not yet implemented (TrueNAS, Plex, Home Assistant). The Phase 8.2 screen registry referenced here was removed in Phase 8.3.4. Current implementation is documented in `docs/CURRENT_STATE.md` and `docs/ARCHITECTURE.md`.

# TARS Phase 8.3 — Awareness Integration Layer

## Baseline Audit

### Phase 8.1 Event Contract (TARS_RUNTIME_CONTRACT.md)

**Existing event domains**: `tars`, `system`, `home`, `infra`, `user`

**Existing event types relevant to Phase 8.3**:
- `health.cpu`, `health.memory`, `health.disk`, `health.uptime`
- `status.service_up`, `status.service_down`, `status.service_degraded`
- `system.heartbeat` (carries service list)
- `system.error`

**To be added in Phase 8.3**: `infra.*`, `home.*`, `alert.*` event types.

**Validation rules**: source must match `^[a-z][a-z0-9._-]+$`, type same pattern, priority `low|normal|high|critical`, domain in `{tars, system, home, infra, user}`. No changes needed — all three new domains are already valid (`infra`, `home`, `user` are in `VALID_DOMAINS`).

### Phase 8.2 Screen Registry (tars_face_v1.html)

**Current screens**:
- `world` — minimal overlay, Three.js scene
- `home` — placeholder + connection status
- `infra` — live health metrics (CPU, memory, disk, uptime, services) from `/api/events` + WS
- `monitor` — placeholder
- `system` — dev tool gateway + runtime info

**INFRA screen currently**: fetches `/api/events?count=50` on render, filters `health.*` and `system.heartbeat`, displays as `tars-dashboard-row` entries. Subscribes to `tars-event` DOM events for live updates. 10s polling fallback. No service cards, no alerts, no timeline.

### TARS_EVENTS Client (tars_face_v1.html)

- Connects to `ws://<host>/ws`
- Fires `tars-event` custom DOM events (all events, including heartbeats)
- Fires `tars-events-connected` / `tars-events-disconnected`
- Exposes `window.TARS_EVENTS.send()` and `.isConnected()`
- Auto-reconnects with exponential backoff
- No event filtering on the client — all events dispatched

**Implication**: The browser receives every event published on the bus. This is fine for Phase 8.2 but will need filtering when event volume grows. The WS bridge supports per-client `subscribe` filters — the browser client should be updated to use them in Phase 8.3.

---

## Deployment Topology

```
┌──────────────────────────────────────────────────────────────────┐
│ TARS Pi (Raspberry Pi 4 8GB) — PRIMARY RUNTIME HOST              │
│                                                                   │
│  Runs: TARS Face (browser kiosk)                                  │
│        pi-server (HTTP + WS + event bus)                          │
│        Grafana + Prometheus stack                                 │
│        Docker (light containers)                                  │
│        Future: cognitive services, Ollama (3B)                     │
│                                                                   │
│  Monitors: itself (CPU, RAM, disk, temp — Phase 8.1)              │
│            its own Docker containers (Phase 8.3.2)                 │
│            LAN health (ping, DNS — Phase 8.3.3)                    │
│            → ALL READ-ONLY                                         │
└──────────────────────┬───────────────────────────────────────────┘
                       │ HTTP (read-only)
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│ Dell Optiplex — MEDIA + STORAGE SERVER (observed, unchanged)      │
│                                                                   │
│  Runs: TrueNAS Scale (pools, disks, SMB shares)                   │
│        Plex (media server)                                        │
│        qBittorrent (download client)                              │
│        Radarr (movie management)                                  │
│        Prowlarr (indexer management)                              │
│                                                                   │
│  TARS reads: TrueNAS API (pool health, SMART, alerts)              │
│              Plex API (active streams, library)                   │
│              qBittorrent API (torrent status, speeds)             │
│              Radarr/Prowlarr API (library health, queue)         │
│                                                                   │
│  TARS NEVER writes to Optiplex services.                          │
│  Design assumption: Optiplex topology is fixed and permanent.     │
└──────────────────────────────────────────────────────────────────┘
```

## Architecture

```
TARS Pi (monitoring host)                          Dell Optiplex (observed)
┌─────────────────────────────────────┐           ┌──────────────────────┐
│ Monitor Services                     │           │ TrueNAS Scale        │
│  self/health-monitor.js (Phase 8.1)  │ HTTP      │ Plex                 │
│  infra/docker-monitor.js    ─────────┼──────────▶│ qBittorrent          │
│  infra/network-monitor.js   ─────────┼──────────▶│ Radarr               │
│  infra/truenas-monitor.js   ─────────┼──────────▶│ Prowlarr             │
│  infra/media-monitor.js     ─────────┼──────────▶│                      │
│  alert/alert-manager.js              │  read     │                      │
│  home/ha-bridge.js (future)          │  only     └──────────────────────┘
└─────────────────┬───────────────────┘
                  │ publish
                  ▼
         ┌────────────────────┐
         │     Event Bus      │
         │ infra.* | alert.*  │
         └────────┬───────────┘
                  │
      ┌───────────┼───────────┐
      │           │           │
      ▼           ▼           ▼
┌─────────┐ ┌──────────┐ ┌──────────┐
│ SQLite  │ │WS Bridge │ │  Alert   │
│(8.4)    │ │→ Browser │ │ Manager  │
└─────────┘ └──────────┘ └──────────┘
```

### Read-Only Integration Rule

Every monitor accessing an external service does so through read-only API calls:

| Service | API calls used | Write operations NOT used |
|---|---|---|
| TrueNAS | `GET /pool`, `GET /disk`, `GET /alert` | `POST /pool/scrub`, `POST /disk/offline` |
| Plex | `GET /status/sessions`, `GET /library` | `POST /library/refresh`, `DELETE /library` |
| qBittorrent | `GET /torrents/info`, `GET /transfer/info` | `POST /torrents/delete`, `POST /torrents/pause` |
| Radarr | `GET /movie`, `GET /queue` | `POST /movie`, `PUT /movie` |
| Docker (Pi) | `GET /containers/json`, `GET /info` | `POST /containers/*/stop`, `POST /containers/*/restart` |

This constraint is enforced at the monitor implementation level — no write endpoints are called.

### Data Flow (always)

```
Sensor/Monitor → Event Bus → Storage (SQLite, Phase 8.4)
                           → WS Bridge → Browser → UI Screens
                           → Alert Manager → Alert Banner + Timeline
                           → Optional Cognitive Layer (Phase 8.5, never required)
```

**LLM never required for**: monitoring, alerts, dashboards, automation. Every feature works in Autonomous Offline Mode.

---

## 1. Infrastructure Awareness

### Monitoring Priority Order

```
Priority 1: Self-monitoring of TARS Pi
  └── health-monitor.js (Phase 8.1 — exists)
      CPU, RAM, disk, temp, uptime

Priority 2: Pi container/service awareness
  └── docker-monitor.js (Phase 8.3.2)
      Container states on Pi, crash detection, resource usage

Priority 3: LAN/network awareness
  └── network-monitor.js (Phase 8.3.3)
      Ping to gateway, DNS resolution, latency, reachability

Priority 4: Optiplex services (read-only)
  ├── truenas-monitor.js (Phase 8.3.4)
  │   Pool health, disk SMART, forwarded alerts
  ├── media-monitor.js (Phase 8.3.3)
  │   Plex streams, Radarr queue, qBittorrent status
  └── (no storage-monitor.js needed — TrueNAS handles this)

Priority 5: Home Assistant (future)
  └── ha-bridge.js
      Sensors, environment, automations
```

### Monitor Service Architecture

Each monitor is a self-contained Node.js module in `pi-server/services/infra/`:

```
pi-server/services/
├── health-monitor.js         (Phase 8.1 — CPU, RAM, uptime — Pi self)
├── status-reporter.js         (Phase 8.1 — service registry)
├── alert-manager.js           (Phase 8.3.1 — new, see §3)
└── infra/
    ├── docker-monitor.js      (Phase 8.3.2 — Pi container awareness)
    ├── network-monitor.js     (Phase 8.3.3 — LAN ping, DNS)
    ├── media-monitor.js       (Phase 8.3.3 — Optiplex: Plex/Radarr/qBittorrent)
    └── truenas-monitor.js     (Phase 8.3.4 — Optiplex: TrueNAS)
```

Every monitor follows the same pattern:

```javascript
class InfraMonitor {
    constructor(eventBus, config) { ... }
    start() { /* schedule checks, register with status reporter */ }
    stop() { /* clear intervals, clean up */ }
    async _check() { /* poll API or read sensor, publish events */ }
}
```

### Event Types

| Type | Source | data | Description |
|---|---|---|---|
| `infra.truenas.pool` | `tars.monitor.truenas` | `{ pool, status, usedGb, totalGb, percent, degraded }` | Pool health state |
| `infra.truenas.smart` | `tars.monitor.truenas` | `{ device, status, reallocSectors, pendingSectors, tempC }` | SMART data per disk |
| `infra.truenas.alert` | `tars.monitor.truenas` | `{ id, level, message, node }` | Forwarded TrueNAS alert |
| `infra.docker.container` | `tars.monitor.docker` | `{ name, image, status, state, restartCount, uptime }` | Per-container state |
| `infra.docker.summary` | `tars.monitor.docker` | `{ total, running, stopped, crashed, restarts }` | Aggregate Docker health |
| `infra.media.plex` | `tars.monitor.media` | `{ activeStreams, transcodeCount, librarySize, serverStatus }` | Plex server health |
| `infra.media.radarr` | `tars.monitor.media` | `{ movies, missing, queueCount, status }` | Radarr library status |
| `infra.media.qbit` | `tars.monitor.media` | `{ activeTorrents, totalTorrents, downloadSpeed, uploadSpeed }` | qBittorrent status |
| `infra.network.ping` | `tars.monitor.network` | `{ target, latencyMs, packetLoss, reachable }` | Connectivity check |
| `infra.network.dns` | `tars.monitor.network` | `{ resolver, resolutionMs, success }` | DNS resolution test |
| `infra.storage.volume` | `tars.monitor.storage` | `{ device, mount, totalGb, usedGb, freeGb, percent, status }` | Disk/volume state |
| `infra.storage.smart` | `tars.monitor.storage` | `{ device, status, reallocSectors, tempC, powerOnHours }` | SMART attributes |

### Failure Behavior

Each monitor has a `null`/degraded fallback for every external dependency:

- TrueNAS unreachable → publish `status.service_degraded`, retry in 60s
- Docker socket missing → skip, no events published
- Plex/Radarr API error → individual service shows "unreachable", others continue
- Network ping fails → `{ reachable: false, packetLoss: 100 }`
- All errors log to `system.error` — never crash the monitor

### Monitor Configuration

```json
{
    "monitors": {
        "truenas": { "enabled": true, "url": "http://truenas.local/api/v2.0", "apiKey": "", "intervalMs": 60000 },
        "docker": { "enabled": true, "socketPath": "/var/run/docker.sock", "intervalMs": 15000 },
        "media": { "enabled": true, "plexUrl": "", "plexToken": "", "radarrUrl": "", "radarrApiKey": "", "qbitUrl": "", "qbitPassword": "", "intervalMs": 30000 },
        "network": { "enabled": true, "targets": ["8.8.8.8", "1.1.1.1", "192.168.1.1"], "intervalMs": 30000 },
        "storage": { "enabled": true, "intervalMs": 60000 }
    }
}
```

All API keys stored in `config/tars-config.json` (gitignored). Empty string = monitor disabled.

---

## 2. Home Awareness (Design Only — Phase 8.3.2)

Not implemented in Phase 8.3.1. Architecture documented for future.

### Integration Points

| Source | Data | Protocol | Design Decision |
|---|---|---|---|
| Home Assistant | Sensors, devices, events, energy | HA WebSocket (local) | Single persistent WS connection. HA events mapped to `home.*` event types. |
| Temperature/Humidity | Local sensor readings | MQTT or direct GPIO | If on Pi, read from GPIO or USB sensor. If remote, via HA. |
| Presence detection | Motion sensors, BT proximity | HA events | Real-time event from HA, no polling needed. |
| Energy monitoring | Power usage, solar, battery | HA sensors | Published as `home.energy.*` at configurable interval. |

### Event Types (Future)

| Type | Source | data |
|---|---|---|
| `home.ha.sensor` | `tars.monitor.ha` | `{ entityId, state, unit, friendlyName }` |
| `home.ha.event` | `tars.monitor.ha` | `{ eventType, entity, data }` |
| `home.environment.temp` | `tars.monitor.ha` | `{ celsius, humidity, location }` |
| `home.energy.current` | `tars.monitor.ha` | `{ watts, todayKwh, cost }` |
| `home.presence` | `tars.monitor.ha` | `{ zone, person, state }` |

### HOME Screen Evolution

```
Phase 8.3.1 (placeholder):  Phase 8.3.2 (with HA):
┌──────────────────┐         ┌──────────────────┐
│ Home Operations  │         │ Home Operations  │
│                   │         │                   │
│ ┌───────────────┐│         │ ┌───┐ ┌───┐ ┌───┐ │
│ │  ⊞ Pending    ││         │ │22°C│ │45% │ │On │ │
│ │               ││         │ └───┘ └───┘ └───┘ │
│ │ Event Bus: OK ││         │ ┌────────────────┐ │
│ └───────────────┘│         │ │Living Room: 22°C│ │
└──────────────────┘         │ │Bedroom:   18°C  │ │
                              │ │Office:    21°C  │ │
                              │ │Energy: 340W     │ │
                              │ └────────────────┘ │
                              └──────────────────┘
```

---

## 3. Alert System

### Event Type Hierarchy

```
alert.*
├── alert.storage.*
│   ├── alert.storage.capacity_high      (warning)
│   ├── alert.storage.capacity_critical  (critical)
│   ├── alert.storage.smart_warning       (warning)
│   └── alert.storage.smart_failing       (critical)
├── alert.docker.*
│   ├── alert.docker.container_crashed    (high)
│   ├── alert.docker.container_restarting (warning)
│   └── alert.docker.daemon_down          (critical)
├── alert.network.*
│   ├── alert.network.host_unreachable   (warning)
│   ├── alert.network.latency_spike       (warning)
│   └── alert.network.dns_failure         (high)
├── alert.system.*
│   ├── alert.system.temp_high            (warning)
│   ├── alert.system.temp_critical        (critical)
│   ├── alert.system.memory_high          (warning)
│   └── alert.system.cpu_high             (warning)
└── alert.service.*
    ├── alert.service.unreachable         (warning)
    └── alert.service.degraded            (low)
```

### Severity Levels

| Level | Color | Behavior | Example |
|---|---|---|---|
| `critical` | `#f87171` (red) | Persistent banner, sound alert option, log to alert timeline | TrueNAS pool degraded, Docker daemon down |
| `high` | `#fb923c` (orange) | Banner on relevant screen, log to timeline | Container crash-looping, DNS failure |
| `warning` | `#eab308` (yellow) | Badge on nav bar, log to timeline | Disk > 85%, temp > 70°C |
| `low` | `#5fd0ff` (blue) | Log to timeline only | Service started, config reloaded |

### Alert Manager Behavior

```javascript
class AlertManager {
    constructor(eventBus, options) {
        // Subscribe to alert.* events
        // Maintain active alerts set (dedup by type+source)
        // Route to UI via WS
        // Persist to SQLite (Phase 8.4)
    }

    // Alert lifecycle:
    // 1. Event received → check if active alert exists for same type+source
    // 2. If new or escalated → publish to event bus, add to active set
    // 3. If resolution event received → remove from active set, publish clear
    // 4. Alerts auto-clear after TTL (default 5 minutes) if not refreshed
    // 5. Active alerts sent to new WS clients on connect
}
```

### Alert Resolution

Alerts are resolved by:
1. **Explicit resolution event**: `alert.storage.capacity_high` cleared when disk drops below threshold
2. **Heartbeat recovery**: A `status.service_up` event clears related `alert.service.unreachable`
3. **TTL expiry**: Alert auto-clears if not refreshed within TTL (prevents stale alerts)
4. **Manual dismiss**: User clicks "dismiss" in UI (only for low/warning)

### Persistence Rules (Phase 8.4)

| Data | Storage | Retention |
|---|---|---|
| Active alerts | In-memory | Current session |
| Alert history | SQLite `alert_log` table | 30 days |
| Resolution events | SQLite `alert_log` | 30 days |
| Dismissed alerts | SQLite `alert_log` (marked) | 7 days |

### Notification Flow

```
Monitor detects condition → eventBus.publish({ type: "alert.storage.capacity_high", ... })
  → AlertManager receives event
  → Checks dedup (same type+source within 5 min?)
    → New alert → add to activeAlerts set, publish to event bus as alert.telegraph
    → Duplicate → update count, no new notification
  → WS Bridge forwards to browser
  → Browser receives tars-event DOM event
  → TARS_NAV or screen renderer:
    → Nav bar shows alert badge (count)
    → Current screen shows banner if high/critical
    → INFRA screen alert timeline updates
```

---

## 4. INFRA Screen Evolution

### Current State (Phase 8.2)

```
┌──────────────────────┐
│ Infrastructure       │
│                      │
│ CPU       24%        │
│ Memory    88%        │
│ Disk      70% (C:\)  │
│ Temperature  —       │
│ Uptime    4h 29m     │
│ Services  3 online   │
└──────────────────────┘
```

### Target State (Phase 8.3)

```
┌──────────────────────────┐
│ Infrastructure            │
│                           │
│ ┌─── SYSTEM ────────────┐ │
│ │ ● CPU  24%  ● Mem 88% │ │
│ │ ● Disk 70%  ● Temp — │ │
│ │ ○ Uptime 4h 29m       │ │
│ └───────────────────────┘ │
│ ┌─── SERVICES ──────────┐ │
│ │ ● TrueNAS   ONLINE    │ │
│ │ ○ Pool: tank  3.2/8TB│ │
│ │ ● Docker     ONLINE   │ │
│ │ │ 12 running, 0 down  │ │
│ │ ● Plex       ONLINE   │ │
│ │ │ 1 stream (direct)   │ │
│ │ ● Network    ONLINE   │ │
│ │ │ 4ms to gateway      │ │
│ └───────────────────────┘ │
│ ┌─── RECENT ALERTS ─────┐ │
│ │ ○ 14:23 Disk /dev/sda │ │
│ │   SMART OK            │ │
│ │ ○ 14:20 Container     │ │
│ │   plex restarted      │ │
│ └───────────────────────┘ │
└──────────────────────────┘
```

### Component Hierarchy

```
Screen: infra
  ├── System Health Card
  │   ├── CPU (percent + load graph placeholder)
  │   ├── Memory (percent + used/total)
  │   ├── Disk (percent + per-volume breakdown)
  │   └── Temperature + Uptime
  ├── Services Card
  │   ├── TrueNAS (pool name, capacity bar, status badge)
  │   ├── Docker (container count, running/stopped/crashed, restart count)
  │   ├── Plex/Radarr/qBittorrent (active streams, library health)
  │   └── Network (latency to gateway + DNS, per-target table)
  └── Alert Timeline
      ├── Last 10 alerts (timestamp, severity dot, message)
      ├── Auto-scroll to newest
      └── Click to expand details
```

### Data Sources per Component

| Component | Data source | Update mechanism |
|---|---|---|
| System Health | `health.*` events | Live WS + 10s poll fallback (existing) |
| Services Card | `infra.*` events + `status.*` events | Live WS + per-monitor poll |
| Alert Timeline | `alert.*` events | Live WS only (event-driven) |

### Render Timings

| Event type | UI update latency | Priority |
|---|---|---|
| `health.*` | ≤ 10s (poll interval) | Background |
| `infra.*` | ≤ monitor interval (15-60s) | Background |
| `alert.*` | Immediate (event-driven) | Foreground |
| `status.service_down` | Immediate | Foreground |

---

## 5. Runtime Rules

### Data Flow (always enforced)

```
Sensor/Monitor → Event Bus → Storage → UI → Optional Cognitive
     ↑            ↑           ↑        ↑          ↑
  Local/API    Validation  SQLite   Browser     LLM (Phase 8.5)
  Polling      Dedup       (8.4)    Screens     Async enrichment
```

### Mandatory Rules

1. **Every monitor has a null fallback**. No external dependency causes a crash.
2. **Every UI component renders with empty data**. Missing monitor = empty card, not broken screen.
3. **LLM enriches but never gates**. All monitoring, alerts, and dashboards work identically with or without a cognitive provider.
4. **Storage is write-only for monitors**. Monitors publish events and never read from the database.
5. **Events are immutable**. Once published, an event is not modified. Corrections publish a new event (e.g., `container_crashed` followed by `container_restored`).
6. **Alerts are derived from events**. The alert manager reads events and produces alerts. It does not create its own monitoring.

### Anti-patterns (forbidden)

| Anti-pattern | Why | Correct approach |
|---|---|---|
| Monitor reads from SQLite | Creates circular dependency | Monitor polls external API → publishes event → stored asynchronously |
| UI polls each monitor directly | Bypasses event bus, duplicates logic | All data flows through event bus |
| Alert manager creates its own timers for monitoring | Duplicates monitor logic | Alert manager is a pure event processor — no timers |
| Cognitive layer writes to event bus | LLM could inject false events | Cognitive layer enriches events asynchronously, never writes primary data |

### Configuration Pattern

```json
{
    "_comment": "Phase 8.3 — All monitor configs follow the same shape",
    "monitors": {
        "<name>": {
            "enabled": false,
            "intervalMs": 30000,
            "timeoutMs": 10000,
            "requiredFields": [],
            "optionalFields": {}
        }
    },
    "alerts": {
        "dedupWindowMs": 300000,
        "defaultTtlMs": 300000,
        "severityThresholds": {
            "cpuPercent": { "warning": 80, "critical": 95 },
            "memoryPercent": { "warning": 85, "critical": 95 },
            "diskPercent": { "warning": 85, "critical": 95 },
            "tempC": { "warning": 70, "critical": 80 }
        }
    }
}
```

---

## Implementation Phases (Priority Order)

### Phase 8.3.1 — Alert System + INFRA Screen Evolution

**Purpose**: Add alert manager, evolve INFRA screen to show service cards + alert timeline. Uses existing `health.*` events as alert sources — no external dependencies.

**Why first**: Zero external dependencies. Proves the alert pipeline on data we already have. Delivers immediate UI improvement.

| File | Change |
|---|---|
| `pi-server/services/alert-manager.js` | New — dedup, severity routing, active alerts set, WS notification |
| `pi-server/server.js` | Wire alert-manager into startup |
| `config/tars-config.json` | Add `alerts` config section |
| `tars_face_v1.html` | Evolve INFRA screen renderer — service cards, alert timeline component. Add alert banner for high/critical alerts. |

**Deliverable**: Infrastructure screen shows system health card + alert timeline (fed from health thresholds). No external monitors yet.

**Risk**: Low — all data sources are existing `health.*` events.

**Dependencies**: Phase 8.1 event bus, Phase 8.2 screen registry.

### Phase 8.3.2 — Pi Docker Container Awareness

**Purpose**: Monitor TARS Pi's own Docker containers. Unix socket, no auth, no network dependency.

**Why second**: Runs on the Pi itself — no network dependency. Most reliable external integration.

| File | Change |
|---|---|
| `pi-server/services/infra/docker-monitor.js` | New — Docker socket polling for Pi containers |
| `pi-server/server.js` | Register monitor on startup |
| `config/tars-config.json` | Add docker config (socket path) |
| `tars_face_v1.html` | INFRA screen: services card shows Pi container overview |

**Deliverable**: INFRA screen shows Pi Docker containers (running/stopped/crashed, restart counts).

**Risk**: Low — Docker integration is well-understood. Socket path configurable. Monitor disabled if socket missing.

### Phase 8.3.3 — Network + Optiplex Media Services

**Purpose**: LAN connectivity awareness + read-only monitoring of Plex/Radarr/qBittorrent on the Dell Optiplex.

**Why third**: Network is required to reach the Optiplex. Network + media can be implemented together since both target the LAN.

| File | Change |
|---|---|
| `pi-server/services/infra/network-monitor.js` | New — ping to gateway, DNS resolution, latency per target |
| `pi-server/services/infra/media-monitor.js` | New — read-only polling of Plex/Radarr/qBittorrent on Optiplex |
| `config/tars-config.json` | Add network targets + media API config |
| `tars_face_v1.html` | INFRA screen: services card expands with network latency + media status |

**Deliverable**: INFRA screen shows network latency per target + Optiplex media service status (active Plex streams, Radarr queue, qBittorrent transfers).

**Risk**: Medium — network tests require `ping` binary. Media APIs require tokens. OPTIONAL — all monitors disable gracefully if unreachable.

**Read-only constraint**: Only `GET` endpoints are called. No write operations on any Optiplex service.

### Phase 8.3.4 — TrueNAS Scale Awareness

**Purpose**: Read-only monitoring of TrueNAS on the Optiplex — pool health, disk SMART data, alert forwarding.

**Why last**: Most complex API, requires API key, saved until the alert pipeline and screen evolution are proven in 8.3.1–8.3.3.

| File | Change |
|---|---|
| `pi-server/services/infra/truenas-monitor.js` | New — read-only TrueNAS API polling for pools, disks, alerts |
| `config/tars-config.json` | Add truenas config (url, apiKey) |
| `tars_face_v1.html` | INFRA screen: TrueNAS pool card with capacity bar + per-disk SMART status |

**Deliverable**: INFRA screen shows TrueNAS pool health + per-disk SMART data + forwarded TrueNAS alerts.

**Risk**: Medium — TrueNAS API key required. API structure varies by TrueNAS version. Read-only via API key permissions.

---

## What Runs Where

| Component | Host | Network path |
|---|---|---|
| TARS Face (browser kiosk) | Pi | Local (display) |
| pi-server (HTTP + WS + event bus) | Pi | `localhost` |
| Grafana + Prometheus | Pi | `http://tars-pi:3000` |
| Docker (Pi containers) | Pi | `/var/run/docker.sock` |
| Future cognitive services | Pi | `localhost` |
| TrueNAS Scale | Optiplex | `http://truenas.lan` |
| Plex | Optiplex | `http://optiplex.lan:32400` |
| qBittorrent | Optiplex | `http://optiplex.lan:8080` |
| Radarr | Optiplex | `http://optiplex.lan:7878` |
| Prowlarr | Optiplex | `http://optiplex.lan:9696` |

**Design rule**: TARS never assumes it can move these services. The Optiplex topology is permanent and treated as a fixed external system.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Docker socket permission denied | Medium | Docker monitor fails | Document `docker` group membership. Fallback: skip, no crash. |
| TrueNAS API changes between versions | Medium | Truenas monitor breaks | Version-check on connect. Isolated module, other monitors unaffected. |
| Plex token rotation | Low | Plex monitor stops | Log warning with re-auth instructions. Media monitor degrades gracefully. |
| Optiplex offline or unreachable | Low | All Optiplex monitors show unavailable | Each monitor has independent backoff. System health card shows "Optiplex unreachable." |
| Network ping blocked by firewall | Low | Ping returns failure | Document expected ICMP rules. Alternative: TCP connect test. |
| Event volume overwhelms browser | Low | UI lag, memory growth | WS bridge filters per client. Browser caps visible events. Phase 8.4 SQLite for history. |
| Config file with API keys committed to git | Medium | Credential leak | `.gitignore` includes `config/tars-config.json`. Warn on first setup. |
| Pi SD card wear from event logging | Low | Storage failure | Boot from SSD (required). SQLite WAL mode reduces writes. |

## Recommended Order

```
Phase 8.3.1 — Alert System + INFRA Evolution
  (zero external deps, proves alert pipeline on existing health data)

Phase 8.3.2 — Pi Docker Container Awareness
  (most reliable: Unix socket, no network, no auth)

Phase 8.3.3 — Network + Optiplex Media Services
  (adds LAN depth + read-only media monitoring)

Phase 8.3.4 — TrueNAS Scale Awareness
  (most complex API, saved for last when pipeline is proven)
```

Start with Phase 8.3.1. It has zero external dependencies, proves the alert pipeline on data we already have, and immediately improves the INFRA screen with an alert timeline.

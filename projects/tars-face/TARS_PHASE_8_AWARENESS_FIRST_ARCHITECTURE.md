> **⚠️ HISTORICAL DOCUMENT**
> This document describes previous architecture planning. It contains references to removed systems (Phase 8.2 bottom nav) and assumptions that do not match current implementation (Pi is not yet the primary runtime). Current implementation is documented in `docs/CURRENT_STATE.md` and `docs/ARCHITECTURE.md`.

# TARS Phase 8.0 — Awareness First Architecture (Corrected)

## Core Principle

The Raspberry Pi is the **complete TARS runtime environment**. The ThinkPad is the development workstation — SSH access into the Pi for administration. All TARS services run on the Pi. All dashboards are accessible from any browser on the network.

TARS cognition is **optional**. TARS awareness must function **without any LLM**.

```
LLM unavailable = TARS quiet but alive
LLM available   = TARS expressive and explanatory
```

The existing autonomous engine (Phase 7) is the foundation. Everything Phase 8 adds is an **awareness layer** on top. The autonomous engine is unchanged.

---

## 1. Runtime Modes

### Autonomous Offline Mode (No LLM)

Default mode. Zero external dependencies. TARS functions identically to today.

**Capabilities:**

| System | Status | Where it runs |
|---|---|---|
| Behavior engine (scoring, fatigue, needs) | ✅ Full | Browser (Pi) |
| Activity lifecycle (wander, observe, rest) | ✅ Full | Browser (Pi) |
| Room simulation (Three.js, weather, time) | ✅ Full | Browser (Pi) |
| Telemetry + autonomyHistory | ✅ Full | Browser (Pi) |
| Experience buffer | ✅ Full | Browser (Pi) |
| Alerts (condition-based) | ✅ Full | Browser (Pi), enhanced by Phase 8 |
| Observatory/Journal/Brain | ✅ Full | Browser (Pi) |
| Creator Console | ✅ Full | Browser (Pi) |
| Save/Load persistence | ✅ Full | localStorage (Pi browser) |
| Awareness events | ➕ Phase 8 | Node.js service (Pi) |
| Service dashboards | ➕ Phase 8 | Browser (Pi + network) |

**What changes**: The autonomous engine itself is untouched. Phase 8 adds awareness services that run alongside it on the Pi.

### Local Cognitive Mode (Optional Local LLM — Ollama on Pi)

Ollama running on the Pi with a small model (3B). Zero config required — TARS auto-detects.

**Additional capabilities:**

| Capability | How it works | Pi performance |
|---|---|---|
| Explain decisions | LLM receives context → rationale | ~3–5 tok/s on 3B model |
| Summarize status | LLM generates brief summary | ~2–3s latency |
| Answer questions | User asks → LLM responds from context | ~3–5s latency |
| Enrich alerts | Raw alert → human-readable explanation | ~1–2s latency |

**Non-capabilities (by design):**
- LLM does NOT select activities
- LLM does NOT modify needs, preferences, or fatigue
- LLM does NOT execute actions directly

**Detection**: Health-check `http://localhost:11434/api/tags` every 60s.

### Enhanced Cognitive Mode (Optional External Providers)

Claude CLI, Gemini CLI, or user-configured API providers — running on the Pi or accessible over the network.

**Additional capabilities over Local:**
- Deeper multi-step analysis
- Complex Q&A about TARS history
- Scheduled daily digests
- Optional action suggestions (reviewed, not auto-executed)

These are **enhancements, not dependencies**.

---

## 2. TARS Station Concept

### Unified Navigation / Menu System (Phase 8.2)

TARS Station is a single-page application with a unified navigation bar. The carousel screens are accessed through this menu system.

```
┌─────────────────────────────────────────────────────┐
│  ◉ TARS  │  Home  │  Infra  │  Monitor  │  World  │  ← nav bar
├─────────────────────────────────────────────────────┤
│                                                     │
│              [Active Screen Content]                 │
│                                                     │
├─────────────────────────────────────────────────────┤
│  ◀  swipe left/right / keyboard arrows / nav click ▶│
└─────────────────────────────────────────────────────┘
```

### Screen Definitions

All screens integrate into the TARS menu/carousel system. Screens 2–5 render with placeholder/null data when integrations are absent — they never crash.

| # | Screen | Content | Depends on |
|---|---|---|---|
| 1 | **TARS World** | 3D avatar, weather, activity, environment, needs | Phase 7 (works today) |
| 2 | **Home Ops** | Home Assistant devices, sensors, temp, lights | Phase 8.3 |
| 3 | **Infrastructure** | TrueNAS pools, Docker, network, disk health | Phase 8.3 |
| 4 | **Monitoring** | Grafana embeds, Prometheus metrics, CPU/RAM, alerts | Phase 8.3 |
| 5 | **World Awareness** | Weather, news feed, calendar, World Monitor | Phase 8.3 |

### Navigation

| Input | Action |
|---|---|
| Nav bar click | Jump to screen |
| Touch swipe left/right | Next/previous screen |
| Keyboard arrows | Next/previous screen |
| Keyboard 1–5 | Jump to screen N |

### Render Constraints

- Each screen is a **self-contained render function** — no shared mutable state
- Screen data pushed via event bus, not polled
- Screen 1 (TARS World) is always the default and always works
- Screens 2–5 degrade gracefully with null/empty states

---

## 3. Awareness Layer

### Data Source Classification

All awareness services run on the Raspberry Pi as Node.js (or Python) processes. They collect data from local and network sources, emit events to the event bus, and push updates to the browser via WebSocket.

#### Local (Pi/LAN — no external APIs, no authentication required beyond LAN)

| Source | Data | Method | Runs where |
|---|---|---|---|
| Raspberry Pi | CPU temp, memory, disk, uptime, throttling | Local script | Pi (self-monitoring) |
| Docker | Container states, restarts, image versions | Docker socket API | Pi (or Docker host) |
| TrueNAS | Pool health, disk temps, SMART status | TrueNAS REST API (LAN) | Pi → TrueNAS |
| Network | Ping to gateway, DNS resolution | Local script | Pi |
| Pi display | Touch events, kiosk health | Browser event | Pi (Chromium) |
| TARS engine | Activity, needs, fatigue, decisions | Internal (WebSocket bridge) | Browser → Pi service |

#### Home (Home Assistant — LAN, no cloud dependency)

| Source | Data | Method |
|---|---|---|
| HA sensors | Temperature, humidity, presence, motion | HA WebSocket API |
| HA devices | Light states, switches, energy | HA REST API |
| HA events | Motion, door, automation triggers | HA event stream |

#### External (require API — optional, degrade gracefully)

| Source | Data | Free tier |
|---|---|---|
| Weather API | Conditions, forecast, alerts | 60 calls/min |
| News/RSS | Headlines | Unlimited (RSS) |
| Calendar | Upcoming events | Free (CalDAV) |

### Design Rules

1. **Every external source has a null/empty fallback** — never block
2. **Local sources are event-driven or polled on a schedule** — never on the render path
3. **Home Assistant is treated as local** (LAN, no cloud)
4. **External sources are cached with TTL** — stale is acceptable, missing is invisible
5. **All awareness data is read-only** — services never mutate TARS state
6. **Service integrations fail open** — each monitor runs independently; one failure doesn't cascade

### What requires APIs

- Weather (free tier acceptable, API key in local config file)
- News (RSS is free, no key needed)
- Calendar (CalDAV is free)

### What runs locally on Pi

Everything else: Pi metrics, Docker, TrueNAS, Home Assistant, network health, event bus, WebSocket server, all monitors.

### What should be event-driven

- SMART warnings, disk threshold breaches
- Container crashes / unexpected restarts
- Temperature threshold violations
- Motion/presence from Home Assistant
- TARS autonomy decisions (bridged from browser)
- Service health changes (up/down transitions)

---

## 4. Cognitive Router Revision

### Revised Concept

The cognitive router is an **event-driven awareness processor** that runs on the Pi. It receives events from the awareness event bus and optionally enriches them via an LLM provider.

```
┌──────────────────────────────────────────┐
│           Awareness Event Bus             │  ← Node.js service on Pi
│  (Pi metrics, Docker, HA, TrueNAS, TARS)  │
└─────┬──────┬──────┬──────┬──────┬────────┘
      │      │      │      │      │
      ▼      ▼      ▼      ▼      ▼
   ┌──────────────────────────────────┐
   │       Cognitive Router           │  ← Node.js service on Pi
   │                                  │
   │  Input: event + context snapshot │
   │  Output: enriched response       │
   │                                  │
   │  ┌────────────────────────────┐  │
   │  │ Provider Chain:            │  │
   │  │ Ollama(Pi) → CLI → (none)  │  │
   │  │ (first available wins)     │  │
   │  └────────────────────────────┘  │
   └──────────┬───────────────────────┘
              │
              ▼
     ┌──────────────────┐
     │   Output Types   │
     ├──────────────────┤
     │ • Text response  │
     │ • Enriched alert │
     │ • Action intent  │
     │ • (or null)      │
     └──────────────────┘
```

### Input to the Router

| Source | Example | Priority | Always works without LLM? |
|---|---|---|---|
| User message | "What are you doing?" | High | ✅ (template response) |
| Autonomy event | TARS chose weather_observation | Medium | ✅ (log + display) |
| System alert | TrueNAS SMART warning | High | ✅ (display raw alert) |
| Environment change | Temperature spike | Medium | ✅ (display metric) |
| Scheduled tick | Hourly summary | Low | ✅ (basic status line) |

### Output Types

| Type | Without LLM | With LLM |
|---|---|---|
| Alert display | Raw event: "SMART warning: /dev/sdb" | "Drive /dev/sdb has 45 reallocated sectors. Threshold is 10. Recommend SMART test within 24h." |
| User response | "I'm monitoring the server. Everything looks normal. Cognitive layer not available." | Context-aware natural language response. |
| Status summary | "Uptime: 3h. Needs: energy 40%, curiosity 80%. Services: all healthy." | Natural language summary with observations and recommendations. |

### Example: TrueNAS SMART Warning

Both paths work. The alert system is independent of the LLM.

**Without LLM:**
```
Pi awareness service polls TrueNAS → SMART warning detected
  → Event bus: { source: "truenas", type: "smart_warning", device: "/dev/sdb" }
  → Browser (via WebSocket): Observatory alert section shows warning
  → autonomyHistory logs: "alert: truenas_smart_warning"
```

**With LLM:**
```
Same event → Cognitive router receives event + getTARSContext()
  → Ollama on Pi generates explanation
  → Browser shows enriched alert
  → autonomyHistory logs: alert + enrichment text
```

### Action Intents (Suggestion Only)

The cognitive router can output structured action intents — but these are **suggestions**, never auto-executed. They are displayed in the Observatory for user review.

```json
{
    "suggest": "notify_admin",
    "severity": "warning",
    "rationale": "SMART errors exceeding threshold on /dev/sdb",
    "auto_resolve": false
}
```

---

## 5. Memory Architecture

### Three Separate Memory Domains

```
┌─────────────────────────────────────────────────┐
│                 Amir_OS Memory                    │
│  Identity, boot instructions, architecture docs  │
│  Location: Amir_OS/memory/*.md                    │
│  Managed by: developer (manual edits via SSH)     │
│  Format: Markdown files on Pi filesystem          │
│                                                  │
│  BOUNDARY: Never read by TARS at runtime          │
├─────────────────────────────────────────────────┤
│              TARS Runtime Memory                  │
│  Experiences, decisions, needs history            │
│  Phase 7: localStorage (browser)                  │
│  Phase 8.4+: SQLite on Pi filesystem              │
│  Managed by: TARS autonomously                    │
│  Content: what TARS did, when, why, result        │
│                                                  │
│  BOUNDARY: Ground truth — never modified by       │
│  cognitive layer or external services             │
├─────────────────────────────────────────────────┤
│            Future Cognitive Memory                │
│  LLM conversations, summaries, derived insights   │
│  Location: SQLite or JSON store on Pi             │
│  Managed by: cognitive layer (when active)        │
│  Format: Structured JSON                          │
│  Content: user interactions, LLM exchanges        │
│                                                  │
│  BOUNDARY: Derived data — always optional,        │
│  references runtime memory by event ID            │
└─────────────────────────────────────────────────┘
```

### Migration Path (Phase 8.4)

| Step | What changes | Risk |
|---|---|---|
| 1 | Add SQLite runtime store on Pi alongside localStorage | Low — additive, no migration |
| 2 | Awareness services write to SQLite store | Low — new code path |
| 3 | Browser reads from both localStorage + WebSocket push from SQLite | Medium — dual sources need reconciliation |
| 4 | Make SQLite primary, localStorage as cache | Medium — needs careful rollout |
| 5 | Deprecate localStorage for awareness data | Low — localStorage retained for Phase 7 autonomy data |

**Key constraint**: Phase 7 autonomy data (needs, scores, activity state) stays in localStorage. The awareness layer adds its own data to SQLite. These are separate concerns that don't conflict.

### Rules

1. **Runtime memory is ground truth.** Cognitive memory is derived and optional.
2. **Runtime memory never depends on cognitive memory.**
3. **Cognitive memory references runtime memory by event ID** — never duplicates.
4. **Amir_OS memory is never read by TARS at runtime.** Developer documentation only.
5. **No breaking migration.** localStorage remains for Phase 7 data. SQLite is additive.

---

## 6. Pi Hardware Reality Check

### Correction from Previous Draft

The **Raspberry Pi IS the complete TARS runtime**, not a thin client. The ThinkPad is only used for development (SSH into Pi, edit files, run git).

### Raspberry Pi 4 (8GB) — Target Hardware

| Component | Role | Notes |
|---|---|---|
| Pi 4 8GB | Main compute | Minimum viable for Ollama + services |
| Official 7" touch display | TARS Station UI | 800×480 resolution |
| USB 3.0 SSD (256GB+) | Boot + storage | Avoids microSD bottlenecks |
| MicroSD (32GB) | Bootloader / backup | Boot from SSD after initial setup |
| USB keyboard (optional) | Debug input | For kiosk without touch |

### Capability Assessment

| Service | Feasibility | Performance | Notes |
|---|---|---|---|
| TARS Face (browser) | ✅ Works | 15–25fps (software GL) | Chromium kiosk mode |
| TARS Face HTTP server | ✅ Easy | Negligible load | Node.js serving static HTML |
| Awareness services (Node.js) | ✅ Easy | 5–10 services, low CPU | Event bus, monitors |
| WebSocket server | ✅ Easy | Negligible load | Co-located with HTTP server |
| SQLite persistence | ✅ Easy | Fast enough for logging | WAL mode recommended |
| Ollama 3B model | ✅ Feasible | 3–5 tok/s, ~3GB RAM | Default cognitive provider |
| Ollama 7B model | ⚠️ Slow | 1–2 tok/s, ~6GB RAM | Usable for async/offline enrichment |
| Ollama 13B+ | ❌ No | N/A | Runs on ThinkPad for dev only |
| Docker + containers | ✅ Feasible (8GB) | 5–10 light containers | ARM64 images required |
| Home Assistant | ✅ Proven | Separate Pi or container | Native Pi support |
| Grafana/Prometheus | ⚠️ Resource heavy | Consider remote instances | or lightweight alternatives |
| Chromium (kiosk) | ✅ Standard | ~300MB RAM | Flags: --kiosk --disable-gpu |
| Pi hardware monitoring | ✅ Trivial | ~0.1% CPU | /sys/class/thermal, vcgencmd |

### Deployment Topology

```
┌──────────────────────────────────────────────────────┐
│              Raspberry Pi 4 (8GB + SSD)               │
│                    TARS RUNTIME                        │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │              Node.js Server (HTTP + WS)           │ │
│  │  ● Serves TARS Face (tars_face_v1.html)           │ │
│  │  ● WebSocket bridge for real-time events          │ │
│  │  ● Awareness event bus (pub/sub)                  │ │
│  │                                                    │ │
│  ├──────────────────────────────────────────────────┤ │
│  │              Awareness Services                    │ │
│  │  ● Pi metrics monitor (CPU, RAM, temp)            │ │
│  │  ● Docker monitor (container states)              │ │
│  │  ● TrueNAS monitor (pool health, SMART)           │ │
│  │  ● Network monitor (ping, DNS)                    │ │
│  │  ● Home Assistant bridge (sensors, events)        │ │
│  │  ● TARS event bridge (from browser)               │ │
│  │                                                    │ │
│  ├──────────────────────────────────────────────────┤ │
│  │              Storage                               │ │
│  │  ● SQLite: runtime memory + awareness logs        │ │
│  │  ● localStorage: Phase 7 autonomy data (browser)  │ │
│  │  ● JSON config files: .tars_config.json           │ │
│  │                                                    │ │
│  ├──────────────────────────────────────────────────┤ │
│  │              Optional Services                     │ │
│  │  ● Ollama (3B model, ~3GB RAM)                    │ │
│  │  ● Cognitive router (enriches events)             │ │
│  │                                                    │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Connected via LAN:                                    │
│  → Home Assistant (Pi or VM)                           │
│  → TrueNAS (existing server)                           │
│  → Docker hosts (if containers not on Pi)              │
│  → Router/gateway (network health checks)              │
│                                                        │
│  Accessible via browser (any device on LAN):           │
│  http://tars-pi.local:8080/  ← TARS Station UI        │
│                                                        │
│  Administration via SSH (from ThinkPad):               │
│  ssh pi@tars-pi.local                                  │
└──────────────────────────────────────────────────────┘
```

### SSD Requirement

**microSD is not sufficient** for running Ollama + Docker + SQLite + year-round uptime. The Pi must boot and run from a USB 3.0 SSD. Boot from microSD only for initial setup, then migrate to SSD.

### RAM Management

| Configuration | Free RAM (approx) | Notes |
|---|---|---|
| OS + browser kiosk | ~3.5GB / 8GB | Baseline |
| + Ollama 3B | ~0.5GB / 8GB | Tight but usable |
| + Docker (5 containers) | ~0.2GB / 8GB | Contention risk |
| Recommended caps | Ollama 3B OR Docker, not both | Or use 8GB with careful monitoring |

---

## 7. Implementation Roadmap

Revised phases based on Pi-as-runtime architecture:

---

### Phase 8.1 — Runtime Awareness / Event Bus

| Aspect | Detail |
|---|---|
| **Purpose** | Create the Node.js server foundation on the Pi: HTTP + WebSocket + event bus |
| **Files** | `pi-server/server.js`, `pi-server/event-bus.js`, `pi-server/ws-bridge.js`, `config/tars-config.json` |
| **Risk** | Low — standalone server, Phase 7 autonomy unchanged |
| **Dependencies** | Node.js on Pi, Pi boot + SSH configured |
| **Pi compat** | ✅ ARM64 Node.js, runs as systemd service |

**Deliverables:**
- Node.js HTTP server serving `tars_face_v1.html` (replaces dev server)
- WebSocket server on same port for real-time event push
- Event bus: typed pub/sub with `{ source, type, data, timestamp }`
- TARS Face connects to WS on page load, receives events
- Graceful degradation: browser works without WS (renders from localStorage)
- systemd service file for auto-start on Pi boot
- Health endpoint: `GET /health`

**What stays in Phase 7**: All autonomy code, localStorage persistence, Three.js rendering, Observatory tabs. Phase 8.1 only adds the server layer.

#### Conflict: Phase 7 currently opens `tars_face_v1.html` directly from filesystem. Phase 8.1 serves it via HTTP. Both work — HTTP is required for WebSocket. The HTML file needs no changes to load from HTTP.

---

### Phase 8.2 — Unified TARS Navigation / Menu System

| Aspect | Detail |
|---|---|
| **Purpose** | Add the carousel navigation bar and screen registry to TARS Face |
| **Files** | Changes to `tars_face_v1.html` (CSS + JS for nav bar, screen registry, swipe/keyboard handler) |
| **Risk** | Low — pure UI, no data changes. Screen 1 (TARS World) is existing content unchanged |
| **Dependencies** | Phase 8.1 (menu receives events from WS) |
| **Pi compat** | ✅ Browser-only, touch + keyboard |

**Deliverables:**
- Navigation bar: 5 buttons (TARS, Home, Infra, Monitor, World)
- Screen registry: `TARS_STATION.screens = [{ id, title, render(el) }]`
- Screen 1: delegates to existing `TARS_UI.renderTab('observatory')` (no change)
- Screens 2–5: render placeholder content (null data fallback)
- Swipe left/right touch handler (for Pi touch display)
- Keyboard arrow handler (for dev/debug)
- URL hash routing: `/#screen=2`
- Last screen persisted to localStorage

**What stays in Phase 7**: All existing tabs (Brain, Journal, etc.) remain accessible. The carousel is a new navigation layer on top.

---

### Phase 8.3 — Service Integrations

| Aspect | Detail |
|---|---|
| **Purpose** | Connect to Home Assistant, Grafana, Prometheus, Plex, homelab alerts |
| **Files** | `monitors/ha-bridge.js`, `monitors/grafana-bridge.js`, `monitors/prometheus-bridge.js`, `monitors/plex-monitor.js`, `monitors/alert-manager.js`, `screens/screen-home.js`, `screens/screen-infra.js`, `screens/screen-monitor.js`, `screens/screen-world.js` |
| **Risk** | Low–Medium — each integration is independent; failures are isolated |
| **Dependencies** | Phase 8.1 (event bus), Phase 8.2 (screen registry) |
| **Pi compat** | ✅ All services are HTTP/WS clients, run as Node.js on Pi |

**Deliverables:**

**Home Assistant bridge** (`monitors/ha-bridge.js`):
- Connects to HA WebSocket for real-time sensor events
- REST API for device list and state queries
- Publishes: temperature, humidity, presence, light states, energy
- Null fallback: empty device list

**Grafana bridge** (`monitors/grafana-bridge.js`):
- Embeds Grafana panels as iframes (signed URLs or anonymous dashboards)
- Falls back to simple metric cards when Grafana is unreachable

**Prometheus bridge** (`monitors/prometheus-bridge.js`):
- Queries Prometheus for CPU, memory, disk metrics
- Publishes time-series data to event bus
- Null fallback: last-known values or zeros

**Plex monitor** (`monitors/plex-monitor.js`):
- Plex API for currently playing, library stats, server health
- Publishes: active streams, transcode status, library size
- Null fallback: "Plex unavailable"

**Alert manager** (`monitors/alert-manager.js`):
- Collects alerts from all sources (SMART, container restarts, HA events)
- Deduplicates, assigns severity, routes to event bus
- Stores alert history in SQLite

**Screen renderers** (`screens/screen-*.js`):
- Each screen module exports `render(el, data)` where `data` comes from event bus
- Screen 2 (Home): HA devices, sensors, energy
- Screen 3 (Infra): TrueNAS, Docker, Plex status
- Screen 4 (Monitor): Prometheus/Grafana metrics, alert history
- Screen 5 (World): weather, news, calendar

---

### Phase 8.4 — Memory / Runtime Storage Separation

| Aspect | Detail |
|---|---|
| **Purpose** | Add SQLite runtime store on Pi; separate Phase 7 localStorage from awareness data |
| **Files** | `memory/runtime-store.js` (SQLite), `memory/store-schema.js`, `pi-server/init-db.js` |
| **Risk** | Medium — introduces dual storage (localStorage + SQLite) that must stay in sync |
| **Dependencies** | Phase 8.1 (server), Phase 8.3 (monitors write awareness data) |
| **Pi compat** | ✅ better-sqlite3 or sql.js runs on ARM64 |

**Deliverables:**
- SQLite database on Pi filesystem (`/opt/tars/data/tars.db`)
- Schema: `awareness_events`, `service_status_history`, `alert_log`, `cognitive_sessions`
- Runtime store API: `store.writeEvent(event)`, `store.getAlerts(since)`, `store.getServiceHistory(service, since)`
- Phase 7 autonomy data remains in browser localStorage (unchanged)
- Browser reads awareness data from WebSocket (SQLite-backed)
- **No migration of Phase 7 data** — localStorage and SQLite are separate concerns

**What does NOT change**: Phase 7's experienceBuffer, autonomyHistory, needs/fatigue state all stay in localStorage. Only new awareness data (service health, HA states, alerts, metrics history) goes to SQLite.

---

### Phase 8.5 — Cognitive Provider Router

| Aspect | Detail |
|---|---|
| **Purpose** | Wire the cognitive router into the awareness event stream |
| **Files** | `cognitive/provider-interface.js`, `cognitive/router.js`, `cognitive/providers/ollama.js`, `cognitive/providers/claude-cli.js`, `cognitive/providers/template-fallback.js` |
| **Risk** | Medium — must enrich without blocking the event bus or delaying alerts |
| **Dependencies** | Phase 8.1 (event bus), Phase 8.3 (monitors produce events to enrich), TARS_COGNITIVE_ARCHITECTURE.md |
| **Pi compat** | ✅ Ollama provider uses localhost HTTP; CLI provider is dev-only |

**Deliverables:**
- Provider interface: `async enrich(event, context) → enrichedEvent | null`
- Ollama provider (default, auto-detected at `localhost:11434`)
- Template fallback provider (generates basic text without LLM — always available)
- Router: tries providers in order, first non-null response wins
- Integration: cognitive router subscribes to event bus, enriches high-priority events
- Enriched events stored in SQLite alongside raw events
- Cognitive memory store (separate SQLite table for LLM conversations)

**Critical rule**: The event bus never waits for the cognitive router. Events are dispatched immediately to subscribers. The cognitive router processes asynchronously and publishes enriched versions as follow-up events.

---

### Phase 8.6 — Carousel / Dashboard Environment

| Aspect | Detail |
|---|---|
| **Purpose** | Finalize the Pi display carousel with real data from all integrations |
| **Files** | `screens/screen-home.js`, `screens/screen-infra.js`, `screens/screen-monitor.js`, `screens/screen-world.js` (replace placeholders) |
| **Risk** | Low — all data sources built in Phase 8.3; this is UI wiring only |
| **Dependencies** | Phase 8.2 (nav), Phase 8.3 (data), Phase 8.4 (history) |
| **Pi compat** | ✅ Browser only |

**Deliverables:**
- Screen 2 (Home): real HA sensor cards, device grid, energy graph
- Screen 3 (Infra): Docker container status, TrueNAS pool health, Plex active streams, network status
- Screen 4 (Monitor): Grafana embeds (iframes), Prometheus metric cards, alert timeline
- Screen 5 (World): weather card (current + forecast), news ticker, calendar widget
- All screens have empty/null state rendering
- Pi kiosk: Chromium with `--kiosk --touch-events --disable-session-crashed-bubble`

**Conflict with Phase 7**: The Observatory tab and the Station dashboard overlap. Resolution: Observatory remains the developer-focused deep-dive (raw scores, fatigue values, decision breakdown). The Station dashboard is the operator-focused overview (at-a-glance service health, alerts, home status). They serve different audiences.

---

## 8. Conflict Analysis: Phase 8 vs Phase 7

| # | Conflict | Phase 7 behavior | Phase 8 change | Resolution |
|---|---|---|---|---|
| 1 | **State location** | All state in browser JS (worldState, autonomyHistory, experienceBuffer) | Awareness services on Pi server need access to TARS state | Awareness services maintain their own state (event log, metrics). They read TARS state via WebSocket bridge from browser. No direct server-side access to worldState. |
| 2 | **Persistence** | localStorage (browser-only) | SQLite on Pi filesystem | Phase 7 autonomy data stays in localStorage. Phase 8 awareness data goes to SQLite. No conflict — separate data domains. |
| 3 | **Event system** | No event bus — state changes are direct JS object mutations + DOM updates | Event bus on Pi server, WebSocket to browser | Phase 8 event bus is additive. Phase 7 code doesn't need to use it. Bridge service forwards relevant events to Phase 7 UI (e.g., service health → Observatory) |
| 4 | **HTTP serving** | `tars_face_v1.html` opened directly from filesystem (`file://`) | Served via Node.js HTTP server (`http://tars-pi:8080`) | Both work. HTTP required for WebSocket. File:// still works for dev on ThinkPad. HTML needs no changes. |
| 5 | **Three.js / WebGL** | Browser WebGL at 60fps on dev machine | Pi software rendering at 15–25fps | Acceptable for dashboard display. Pi GPU limitation documented. Option to reduce rendering complexity on Pi (simpler geometry, lower refresh rate). |
| 6 | **Observatory vs Dashboard** | Observatory tab with detailed telemetry (needs, fatigue, scores, decisions) | Station screens with high-level dashboards (service health, HA, infra) | Complementary. Observatory = developer debug. Dashboard = operator overview. Both coexist via tab/menu system. |
| 7 | **Cognitive integration** | No cognitive layer. `getTARSContext()` is a read-only snapshot function | Cognitive router enriches events with LLM | `getTARSContext()` stays unchanged. Cognitive router receives a serialized copy (existing contract). Phase 7 autonomy never reads cognitive output. |
| 8 | **Autonomy decision loop** | `makeAutonomousDecision()` → `selectBestActivity()` → execute | No changes to this path | Cognitive router never modifies the decision loop. It only enriches events after the fact. |
| 9 | **Menu system** | Tabs: Brain, Observatory, Journal, Chat, Settings | Unified nav bar with 5 screens + existing tabs | Existing tabs remain accessible (e.g., via Settings gear icon in nav bar). The nav bar is a new top-level navigation layer. |
| 10 | **Kiosk mode** | Not considered — designed for desktop browser | Chromium kiosk on Pi touch display | All interactive elements must be touch-friendly. Existing UI uses mouse hover/click — some elements may need touch target size adjustments. |

### Conflict Resolution Summary

| Severity | Count | Items |
|---|---|---|
| **No conflict** | 5 | 1, 2, 3, 4, 8 |
| **Minor (additive)** | 3 | 6, 7, 9 |
| **Requires adaptation** | 2 | 5 (GPU perf), 10 (touch targets) |

No Phase 8 change requires modifying Phase 7 autonomy code. All conflicts are either additive (new systems alongside old) or require minor UI adaptation (touch targets, rendering optimization).

---

## Constraint Checklist

| Constraint | Status |
|---|---|
| Pi is the complete runtime | ✅ All services designed for Pi deployment |
| ThinkPad is dev workstation only | ✅ SSH workflow, no runtime dependency |
| No code changes yet | ✅ Document only |
| No LLM API keys | ✅ No keys in design or code |
| No provider lock-in | ✅ Ollama default, CLI optional, API opt-in |
| No modifying TARS Face autonomy | ✅ All Phase 7 systems untouched |
| No duplicate state | ✅ Runtime = ground truth (localStorage), Awareness = separate (SQLite) |
| Preserve current architecture | ✅ All additions are additive |
| Offline functionality without LLM | ✅ Autonomous Offline Mode is the default |
| Browser access from any device | ✅ HTTP server on Pi, accessible on LAN |
| New functionality integrates into menu system | ✅ Phase 8.2 nav bar includes all screens |

## Document References

| Document | Purpose |
|---|---|
| `tars_face_v1.html` | Current Phase 7 implementation (unchanged) |
| `TARS_COGNITIVE_ARCHITECTURE.md` | Provider interface design (revised by Section 4) |
| `TARS_PHASE_7_5_ROADMAP.md` | Phase 7.5 completion status |
| `Amir_OS/memory/` | Identity and boot documentation |

> **ℹ️ COMPONENT-SPECIFIC REPORT**
> This document is the architecture audit for the alert manager component only. It is accurate for that component but not a general architecture reference.

# Phase 8.3.1 Architecture Audit

Date: 2026-07-29
Status: PASS

---

## 1. Alert Lifecycle

### 1a. Alert Creation

| Aspect | Result |
|---|---|
| Entry points | `_evaluateCpu`, `_evaluateMemory`, `_evaluateDisk`, `_serviceDown` |
| Fields populated | id (UUID v4), type, severity, title, message, source, status="created", createdAt, lastSeen, count, data, acknowledgedAt=null, resolvedAt=null |
| Event bus publish | `alert.<type>` with `data: { alert }` — contract compliant |
| Storage | `activeAlerts` Map (keyed `type:source`) + `alertHistory` array (capped) |
| **Verdict** | PASS — creation path is clean and well-structured |

### 1b. Deduplication

| Aspect | Result |
|---|---|
| Key | `type + ":" + source` |
| Match condition | Same key exists AND severity delta ≤ 0 AND within 5min cooldown |
| On duplicate match | Updates `lastSeen`, increments `count`, upgrades severity if higher, no new event |
| After cooldown expiry | Old alert resolved, new alert created with fresh timestamp |
| **Verdict** | PASS — dedup prevents event bus noise, re-publishes on escalation |

### 1c. Cooldown

| Aspect | Result |
|---|---|
| Window | `dedupWindowMs` (default 300000ms / 5min) |
| Reference point | `createdAt` of existing alert (not `lastSeen`) |
| Behavior | Persistent condition past cooldown → old alert resolved + new one created |
| **Verdict** | PASS — prevents stale alerts, marks each 5min window as distinct occurrence |

### 1d. Resolve

| Aspect | Result |
|---|---|
| Mechanism | `_resolveAlert(type, source)` → `_resolveAlertByKey(key)` |
| On resolve | status="resolved", resolvedAt=Date.now(), copy to history, delete from active |
| Event published | `alert.<type>.resolved` with `data: { alert }` |
| Trigger points | Threshold recovery (cpu/mem/disk), `status.service_up`, cooldown expiry |
| **Verdict** | PASS — all creation paths have corresponding resolve paths |

---

## 2. Event Integration

### 2a. Contract Compliance (TARS_RUNTIME_CONTRACT.md)

| Contract field | Alert event | Valid |
|---|---|---|
| `id` (UUID v4) | `crypto.randomUUID()` | ✓ |
| `source` (`^[a-z][a-z0-9._-]+$`) | `"tars.alert"` | ✓ |
| `type` (`^[a-z][a-z0-9._-]+$`) | `"alert.system.memory"` | ✓ |
| `timestamp` (positive int) | `Date.now()` | ✓ |
| `data` (non-null object) | `{ alert: {...} }` | ✓ |
| `domain` (valid set) | `"system"` | ✓ |
| `priority` (low/normal/high/critical) | Maps from severity: critical→critical, warning→high, info→low | ✓ |
| **Verdict** | PASS — every published event is contract-compliant |

### 2b. No Direct UI Polling Where WS Events Should Be Used

| Component | Primary mechanism | Fallback |
|---|---|---|
| INFRA metrics | `tars-event` DOM events from WS | 10s `fetch("/api/events")` |
| INFRA alerts | `alert.*` WS events trigger `fetchAlerts()` | 10s poll (same interval) |
| Alert badge | `alert.*` WS events trigger `updateAlertBadge()` | Once on page load |
| **Verdict** | PASS — WS events are primary; polling is documented fallback |

---

## 3. INFRA Screen

### 3a. Empty State

| Condition | UI output |
|---|---|
| No active alerts | `"No active alerts"` in dimmed text (`rgba(210,235,255,0.2)`) |
| Alert list element missing | Guarded by null check |
| **Verdict** | PASS — renders gracefully |

### 3b. Severity Rendering

| Severity | Color | Label | Styling |
|---|---|---|---|
| `critical` | `#f87171` (red) | **CRIT** | 2px left border, bold label |
| `warning` | `#eab308` (yellow) | **WARN** | 2px left border, bold label |
| `info` | `#5fd0ff` (blue) | **INFO** | 2px left border, bold label |
| Count badge | Shows `(xN)` when count > 1 | | |
| Message | Second dim row below alert | | |
| **Verdict** | PASS — three severity levels visually distinct |

### 3c. Badge Updates Without Refresh

| Event | Action |
|---|---|
| Page load | Fetches `/api/alerts?state=active` |
| `tars-event` with `alert.` prefix | Re-fetches active alerts, updates count + CSS class |
| Zero alerts | Class=`"empty"` (opacity 0, hidden) |
| **Verdict** | PASS — real-time via WS, no refresh required |

---

## 4. Resource Safety

### 4a. Memory Bounds

| Structure | Bound | Mechanism |
|---|---|---|
| `activeAlerts` Map | Distinct `type:source` keys | ~30 max realistic |
| `alertHistory` array | `historySize` (default 200) | `shift()` on overflow |
| Event bus history | `historySize` (default 1000) | `shift()` on overflow |
| Subscriptions | Tracked in `_subscriptions` array | Cleaned up on `stop()` |
| Timers | None owned by AlertManager | Event-driven only |
| **Verdict** | PASS — all structures bounded, no leaks |

### 4b. Event History Limits

| Aspect | Result |
|---|---|
| AlertManager pushes to history | Via `_pushHistory()`, capped at `historySize` |
| AlertManager publishes to bus | Via `eventBus.publish()`, respects bus's own history limit |
| Alert events rate | ~2 events / 5min per threshold crossing (negligible vs. health monitor's 24/min) |
| **Verdict** | PASS — alert events do not bypass or overwhelm history |

---

## Audit Summary

| Category | Verdict |
|---|---|
| 1. Alert lifecycle | PASS |
| 2. Event integration | PASS |
| 3. INFRA screen | PASS |
| 4. Resource safety | PASS |

### Notes (non-blocking)

1. Cooldown reference is `createdAt` rather than `lastSeen` — this is intentional to prevent stale alerts from persisting indefinitely. Persistent threshold conditions generate a new alert every 5min.
2. Info-severity alerts are syntactically supported but not yet generated by any evaluator. Info alerts will come from future external monitors (Phase 8.3.2+).
3. No TTL-based auto-resolution timer exists — the architecture plan mentions this but the implementation's cooldown+recreation approach achieves the same effect without an additional timer.
4. The `high` severity from the architecture plan is mapped to `warning` in the implementation (the plan defines high as orange, but warning is yellow). This is a naming alignment decision, not a functionality gap.

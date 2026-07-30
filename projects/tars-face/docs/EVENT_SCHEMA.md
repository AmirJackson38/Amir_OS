# Event Schema

## Event Format
```json
{
  "id": "uuid",
  "source": "tars.monitor.health",
  "type": "health.cpu",
  "timestamp": 1234567890,
  "data": { ... },
  "domain": "system",
  "priority": "low|normal|high|critical"
}
```

## Event Types

### System Events
| Type | Source | Description |
|------|--------|-------------|
| `system.started` | Any | Service/component started |
| `system.stopping` | `tars.runtime` | Server shutting down |
| `system.heartbeat` | `tars.monitor.status` | Periodic service status snapshot |
| `system.error` | Any | Uncaught error |

### Health Events
| Type | Source | Data Fields |
|------|--------|-------------|
| `health.cpu` | `tars.monitor.health` | `percent`, `load1`, `load5`, `load15` — also carries `tempC` on systems with thermal sensor |
| `health.memory` | `tars.monitor.health` | `totalMb`, `usedMb`, `freeMb`, `percent` |
| `health.disk` | `tars.monitor.health` | `percent`, `device`, `totalGb`, `usedGb`, `freeGb` |
| `health.uptime` | `tars.monitor.health` | `uptimeSeconds`, `bootTime` |

Note: Temperature is published as `health.cpu` with `{ tempC }` data (embedded, not a separate event type). Only emitted on Linux/Raspberry Pi with thermal sensor.

### Status Events
| Type | Source | Description |
|------|--------|-------------|
| `status.service_up` | `tars.monitor.status` | Service reported healthy |
| `status.service_down` | `tars.monitor.status` | Service reported down |
| `status.service_degraded` | `tars.monitor.status` | Service degraded state |

### Alert Events
| Type | Source | Description |
|------|--------|-------------|
| `alert.system.cpu` | `tars.alert` | CPU threshold exceeded |
| `alert.system.memory` | `tars.alert` | Memory threshold exceeded |
| `alert.system.disk` | `tars.alert` | Disk threshold exceeded |
| `alert.system.temp` | `tars.alert` | Temperature threshold exceeded |
| `alert.service.offline` | `tars.alert` | Service unreachable |
| `alert.*.resolved` | `tars.alert` | Alert resolved (e.g. `alert.system.cpu.resolved`) |

### Infrastructure Events
| Type | Source | Data Fields |
|------|--------|-------------|
| `infra.docker.summary` | `tars.monitor.docker` | `total`, `running`, `stopped`, `crashed`, `restartCount`, `engineVersion`, `containersPaused`, `containersRunning`, `containersStopped`, `imagesTotal` |
| `infra.docker.container` | `tars.monitor.docker` | `name`, `containerId`, `image`, `status`, `state`, `restartCount`, `uptimeSeconds`, `created`, `ports`, `justCrashed`, `justRestored` |
| `infra.network.summary` | `tars.monitor.network` | `total`, `online`, `offline`, `avgLatencyMs` |
| `infra.network.host` | `tars.monitor.network` | `host`, `reachable`, `latencyMs`, `status`, `justChanged`, `error` |

# Phase 9.3 — TARS Node Recovery Validation Report

**Scope:** Validate that the deployed TARS node (`tars` @ `192.168.0.102`, container `tars_backend` on `:8080`) survives real hardware lifecycle events and recovers gracefully with no human intervention.
**Mode:** Test-only. No feature additions, no architecture changes, no kiosk/display/screen install. No code changes made — no bugs requiring fixes surfaced.
**Executed:** 2026-08-04 01:55–02:02 UTC

## Deployment under test
- Image: `tars-backend:1.0.0` (`3a32657d09e5`), built from Phase 9.1 artifacts.
- Container: `tars_backend`, restart policy `unless-stopped`, isolated `tars_net` bridge, port 8080 only.
- Companion services (pre-existing, untouched): `worldmonitor`, `worldmonitor-ais-relay`, `worldmonitor-redis-rest`, `worldmonitor-redis`, `duckdns`, `tse_fastapi_backend`, `tse_postgres_db` — total **8 containers**.
- Frontend has **zero** external/CDN dependency (three.js served locally from `/three.module.js`).

## Test matrix & results

| # | Test | Result | Evidence |
|---|------|--------|----------|
| **1** | `docker restart tars_backend` | ✅ | State `running`/`healthy` (restart=`unless-stopped`); `/health` `status:ok`; frontend HTTP 200; module HTTP 200; 0 CDN refs; event bus re-published (in-memory, resets by design); no errors in logs; other 7 containers untouched. |
| **2** | Docker daemon restart (`systemctl restart docker`) | ✅ | Daemon `active`; **all 8 containers auto-restarted** (restart policy honoured); TARS healthy; frontend HTTP 200; module HTTP 200. (Initial single `http=000` was a timing race inside the 30s daemon-up + healthcheck `start_period` window; settled to 200.) |
| **3** | Pi reboot (`sudo reboot`) | ✅ | SSH recovered; uptime 1 min; Docker `active`; **all 8 containers auto-started**; TARS state `running`/`healthy`, restart `unless-stopped`; `/health ok`; frontend 200; module 200; port 8080 LISTENING (0.0.0.0 + ::). |
| **4** | Persistence across reboot | ✅ | Image ID (`3a32657d09e5`), container ID, `WorldPersistence: v3` (`TARS_SAVE_VERSION = 3`), and baked config (`/srv/tars/config/tars-config.json`) all unchanged across reboot. Node-side persistence intact. |
| **5** | Network loss (egress DROP on container via iptables) | ✅ | With DROP active: frontend served (200), module served (200), `/health ok`, container `healthy`, server-side monitors kept publishing (event count 328→345 = grew), engine confirmed client-side (287 refs), 0 CDN refs. Rule removed cleanly; container internet restored; errors: 0; iptables FORWARD clean. |

## Notes & design clarifications
- **Event history is server-side in-memory** and resets on any container/boot cycle. This is expected, not data loss.
- **TARS client state** (needs / activity / objects / world engine / autonomy) is **client-side** (browser `localStorage`, `WorldPersistence` v3). The Pi is currently headless with no browser, so client-state restoration is verified on the client that opens `:8080`; the node itself was confirmed to persist everything image/files/config-related.
- The single transient `http=000` in Test 2 was a startup race, not a failure; all subsequent checks returned 200.

## Conclusion
TARS comes back up cleanly and without intervention across every real failure mode tested: container restart, full Docker daemon restart, full Pi reboot, and network loss. `unless-stopped` + healthcheck + fully self-contained frontend (no CDN) give it resilience against all tested classes of disruption. As a deployment, Phase 9.3 opens the door to a standalone surface.

## Rollback / note
No code or config changes were made during this phase. The only mutating actions were lifecycle/network controls on the Pi, all of which were left in their recovered, healthy state.
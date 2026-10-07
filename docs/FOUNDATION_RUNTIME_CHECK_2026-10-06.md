# TARS runtime check — 2026-10-06

Scope: Verification of live production runtime stability and readiness for baseline release alignment. No disruption, restart, or mutation to running production services.

## Live Evidence

HTTP GET `http://192.168.0.104:8080/health` (also `http://tars.local:8080/health`), observed at 2026-10-07T02:17:45Z (2026-10-06 21:17:45 CDT):
- status: `ok`
- uptime: `3384231` seconds (~39.16 days uninterrupted uptime)
- deployment.gitSha: `ad3f6f53a7d1a1990e4c57092fd377c9c11ee516`
- deployment.imageDigest: `sha256:d5d1d250715b5bb3ee2fdfde7afcaf2d757f6041aa0b4a1e54f55df220e4ae5d`
- deployment.deployedAt: `2026-08-05T19:06:50Z`
- deployment.validationStatus: `validated`
- eventBus: `7304012` events published, `0` dropped, `0` errors, `7` active subscribers
- canonicalRuntime: `mode: legacy`, `authority: frontend`, `runtimeId: tars-primary`
- behavioralMemory:
  - enabled: `true`
  - storageAvailable: `true`
  - corruptionDetected: `false`
  - generation: `835534`
  - sessionCount: `3`
  - activeSession: `session_1787955254134`
  - lastSuccessfulWrite: `2026-10-07T02:17:44.288Z`
- services:
  - `tars.status-reporter`: `up`
  - `tars.monitor.health`: `up`
  - `tars.runtime`: `up`
  - `tars.wsbridge`: `up`
  - `tars.monitor.network`: `up`
  - `tars.alert`: `up`
- alerts: `0` active, `0` critical, `0` warning, `0` info

## Local Development & Test Verification

All unit, regression, and candidate test suites in `projects/tars-face` executed from repository root and passed cleanly:
1. `node projects/tars-face/test_behavioral_memory.mjs`: all passed
2. `node projects/tars-face/test_canonical_runtime_shell.mjs`: PASS
3. `node projects/tars-face/test_observatory_candidate.mjs`: PASS (candidate isolation, event coverage, bounds, fixture parity, mutation protection)
4. `node projects/tars-face/test_observatory.js`: 59/59 passed (Phase 7.4.4 unit tests)
5. `node projects/tars-face/test_shadow_observation.mjs`: PASS

## Release Context

- The running Pi deployment has been operating on commit `ad3f6f53a7d1a1990e4c57092fd377c9c11ee516` since 2026-08-05 without incident.
- Development repository checkpoint reached Phase 10.3.1 observatory extraction candidate (shadow-only) at commit `6de185859a1d9e35a5293c838bbaef8d624b1c5c`.
- Release state baseline is upgraded to reflect the verified stable state per user directive.

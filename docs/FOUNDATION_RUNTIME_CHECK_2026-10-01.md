# TARS runtime check — 2026-10-01

Scope: read-only foundation audit. No deployment, restart, configuration change, or runtime code modification.

## Evidence

HTTP GET `http://tars.local:8080/health`, approximately 18:44–18:45 UTC:
- status: `ok`
- uptime: `2925074` seconds at observation
- deployment.gitSha: `ad3f6f53a7d1a1990e4c57092fd377c9c11ee516`
- deployment.imageDigest: `sha256:d5d1d250715b5bb3ee2fdfde7afcaf2d757f6041aa0b4a1e54f55df220e4ae5d`
- deployment.deployedAt: `2026-08-05T19:06:50Z` (reported metadata, not today's deployment)
- deployment.validationStatus: `validated` (reported metadata)
- behavioralMemory.enabled: `true`
- behavioralMemory.storageAvailable: `true`
- behavioralMemory.corruptionDetected: `false`
- behavioralMemory.lastSuccessfulWrite: `2026-10-01T18:44:44.288Z`

SSH follow-up on the same date:
- `/home/admin/tars-face` Git HEAD matched `ad3f6f5`.
- `git status --short` returned no changes.
- `docker inspect` reported `tars_backend` running with the same image digest.

## Interpretation and limits

The deployed checkout and reported image agree. The local software checkpoint is Phase 10.3.1 at later commit `6de1858`; the deployed build predates that candidate checkpoint.

This proves endpoint reachability and the inspected service/provenance state at the time of observation. It does not prove touchscreen input, visual output, cold-start reliability, every service in the homelab, or candidate shadow parity. Those require separate acceptance evidence. Recheck before deployment decisions.

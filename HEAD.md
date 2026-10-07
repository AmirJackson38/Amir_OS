# TARS Operational HEAD

This is the TARS navigation page. Begin general assistant sessions at START_HERE.md. PROJECT_STATE.json declares the software checkpoint and separate acceptance gates; Git and timestamped runtime checks verify actual state.

## Current State

- **Current release version:** `tars-v10.3.1` (development candidate baseline) / `tars-v10.2.1` (deployed runtime baseline)
- **Release tag targets:** tars-v10.3.1 (`6de185859a1d9e35a5293c838bbaef8d624b1c5c` — Phase 10.3.1 candidate), tars-v10.2.1 (`ad3f6f53a7d1a1990e4c57092fd377c9c11ee516` — deployed Pi runtime)
- **Development verification:** run `git rev-parse HEAD`; the foundation audit began at `b51260f` on 2026-10-01. A historical SHA is not a live branch pointer.
- **Current branch:** `master`
- **Last verified production runtime:** `ad3f6f53a7d1a1990e4c57092fd377c9c11ee516` — `/health`, Pi checkout, and container image verified on 2026-10-06 (uptime 3,384,231s, 0 alerts); see `docs/FOUNDATION_RUNTIME_CHECK_2026-10-06.md`.
- **Current phase:** Phase 10.3.1 Observatory extraction checkpoint. The candidate is implemented in local source, shadow-capable, and disabled by default. The running Pi is at `ad3f6f5`, before candidate checkpoint commit `6de1858`; no runtime authority has moved.
- **Independent hardware gate:** Phase 9.4 display/touch/reliability acceptance remains open in PROJECT_STATE.json. This does not move the software checkpoint backward.
- **Last validated milestone marker:** `tars-v10.3.1` — Phase 10.3.1 candidate baseline; `tars-v10.2.1` — Phase 10.2.1 deployed baseline.
- **Active workstream:** Phase 10.3.1 candidate validation only. `TARS_RUNTIME_MODE=legacy`; frontend remains authoritative for worldState, autonomy, persistence, and behavioral memory.

## Important Version Note

`tars-v10.3.1` is the development baseline release tag, and `tars-v10.2.1` is the deployed production baseline tag. At last verification, `master` had maintenance commits after those tags. This is normal forward-only development, not permission to rewrite releases. If post-release state should become a release, create a new tag/version.

Live branch HEAD is mutable. Before any release, deployment, or state claim, check it directly:

```bash
git rev-parse HEAD
```

## Known Repository Conflicts

- `version.md` records the Amir OS platform version (`v0.9.0`), not the TARS runtime release.
- `docs/CHANGELOG.md` is Amir OS platform history and does not currently function as the complete TARS release ledger.
- Historical project docs may describe Phase 9.4 as pending display/kiosk work. Treat Git history and release tags as historical truth, then verify production runtime before making runtime claims.
- `memory/HEAD.md` is now a pointer to this file; do not use old memory HEAD content as authority.
- `RELEASE_STATE.md` records the release/development/production split; use it before deciding version names.

## Navigation

- Agent contract: `AGENTS.md`
- Machine-readable state: `PROJECT_STATE.json`
- Agent bootstrap: `tools/agent_bootstrap.mjs`
- Staged-file guard: `tools/check_staged_files.mjs`
- Mission: `NORTH_STAR.md`
- Release state: `RELEASE_STATE.md`
- Roadmap reconciliation: `ROADMAP_RECONCILIATION.md`
- Engineering rules: `ENGINEERING_PRINCIPLES.md`
- Version/release rules: `VERSIONING_POLICY.md`
- Known issues: `KNOWN_ISSUES.md`
- TARS architecture: `projects/tars-face/docs/ARCHITECTURE.md`
- Behavioral memory: `projects/tars-face/docs/BEHAVIORAL_MEMORY.md`
- TARS current state detail: `projects/tars-face/docs/CURRENT_STATE.md`
- Phase history / roadmap: `projects/tars-face/docs/PHASE_HISTORY.md`
- Deployment runbook: `projects/tars-face/docs/DEPLOYMENT_RUNBOOK.md`
- Agent entry point: `projects/tars-face/AGENTS.md`
- Amir OS platform changelog: `docs/CHANGELOG.md`

## Phase 10.3.1 Observatory Extraction Checkpoint

### Completed

- Contract archaeology complete.
- Contract freeze approved.
- Candidate `ObservatoryDataLayer` implemented.
- Shadow-mode wiring added behind `?observatoryMode=shadow`.
- Legacy `ObservatoryDataLayer` remains authoritative for UI output.

### Current architecture state

- Browser remains the canonical runtime.
- Legacy `ObservatoryDataLayer` owns observatory UI output.
- Candidate `ObservatoryDataLayer` receives observations only.
- `FrontendObservationAdapter.ingest()` is the only candidate bridge.
- `finalizeExperience()` still uses the legacy interaction count.

### Files introduced/changed

- `projects/tars-face/observatory-data-layer-candidate.js`
- `projects/tars-face/frontend-observation-adapter.js`
- `projects/tars-face/test_observatory_candidate.mjs`
- `projects/tars-face/tars_face_v1.html` shadow wiring
- `projects/tars-face/Dockerfile` packaging

### Validation status

Candidate tests, fixture parity, mutation protection, isolation checks, observatory regression (59/59), behavioral-memory tests, canonical-shell tests, shadow tests, syntax checks, diff checks, and local HTTP asset smoke tests all pass.

### Explicitly not done

- No Pi deployment.
- No diagnostic cutover.
- No UI migration.
- No authority movement.
- Candidate mode is not enabled by default (shadow checkpoint only).

### Next approved action

1. Review the diff.
2. Run `?observatoryMode=shadow` manually.
3. Verify live candidate comparisons.
4. Preserve the legacy rollback path.
5. Consider diagnostic cutover only after evidence.

## TARS Architectural Invariants

- Browser runtime is canonical.
- Pi runtime is observational.
- Shadow systems never become authorities.
- Candidate modules receive observations, never runtime objects.
- New subsystems must prove parity before ownership transfer.
- `worldState` ownership does not move casually.
- Persistence has one writer.
- Behavioral memory has one writer.
- `finalizeExperience()` remains legacy-owned until its interaction-count dependency is explicitly migrated.

## Next Objective

Do not expand features yet. First stabilize the project truth layer:

1. Keep `tars-v9.3.2` immutable as the current release baseline.
2. Do not call `master` a release until tagged.
3. Record new work as forward-only commits and future versions.
4. Verify production on `tars.local` before making runtime claims.
5. Complete Phase 10.3.1 manual shadow validation before any diagnostic cutover; do not relocate authority or deploy canonical mode.

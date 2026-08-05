# TARS Operational HEAD

This is the first file to read before working on TARS. It records the current operational truth discovered from the repository, not from chat memory or stale summaries.

## Current State

- **Current release version:** `tars-v9.3.2`
- **Release tag target:** `92adc86b965c8fa23b99b8f635900ce20b16665e` — `TARS: guard fallback animation state`
- **Last verified development HEAD:** `b07e0638f3f3d659d68d51025c25a2c66a9a1af8` — `TARS: implement Phase 9.4 behavioral memory`
- **Current branch:** `master`
- **Last verified production runtime:** `ba9559011f5493ba866c101715a6d31c7cf569a9` — `/health` validated on `tars.local`
- **Current phase:** Phase 10.2.1 live shadow observation active locally. Phase 9.4 (`b07e063`) remains the production behavior baseline; no runtime authority has moved.
- **Last validated milestone marker:** `tars-v9.3.2` — TARS Phase 9.3.2 kiosk startup regression recovery.
- **Active workstream:** 1 Hz observation-only normalization, comparison, and diagnostics. `TARS_RUNTIME_MODE=legacy`; frontend remains authoritative for worldState, autonomy, persistence, and behavioral memory.

## Important Version Note

`tars-v9.3.2` is the latest release tag. At last verification, `master` had commits after that tag. This is normal forward-only development, not permission to rewrite the release. If the post-release state should become a release, create a new tag/version.

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

## Next Objective

Do not expand features yet. First stabilize the project truth layer:

1. Keep `tars-v9.3.2` immutable as the current release baseline.
2. Do not call `master` a release until tagged.
3. Record new work as forward-only commits and future versions.
4. Verify production on `tars.local` before making runtime claims.
5. Validate Phase 10.2.1 live observation on the development runtime; do not relocate authority or deploy canonical mode.

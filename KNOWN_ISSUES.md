# TARS Known Issues

This file records current repository-discoverable issues and ambiguity. Verify production separately before acting on runtime behavior.

## Current Issues

### Release tag and branch HEAD differ

- Latest release tag: `tars-v9.3.2` at `92adc86b965c8fa23b99b8f635900ce20b16665e`.
- Current `master` HEAD: `9744f5327d4995a25fd33bcef6961770c0cc79a8`.
- Status: expected forward-only development state.
- Rule: do not move the tag; create a new version if current HEAD becomes a release.

### Production runtime differs from both latest release and branch HEAD

- Last verified production runtime SHA: `ba9559011f5493ba866c101715a6d31c7cf569a9`.
- This is newer than `tars-v9.3.2` but older than current `master` HEAD.
- Status: expected during active stabilization, but must be visible to future agents.
- Rule: check `RELEASE_STATE.md` and `/health` before claiming what production is running.

### TARS and Amir OS version records are easy to confuse

- `version.md` records Amir OS platform version `v0.9.0`.
- TARS runtime releases use `tars-v*` tags.
- Status: clarified in `HEAD.md` and `VERSIONING_POLICY.md`.

### TARS release history is split

- Amir OS history lives in `docs/CHANGELOG.md`.
- TARS phase history lives in `projects/tars-face/docs/PHASE_HISTORY.md`.
- Git tags carry release markers.
- Missing: a dedicated TARS release ledger/manifest.

### Phase 9.4 / 9.5 wording is inconsistent

- Current project docs generally identify Phase 9.4 physical embodiment as the next/current work.
- Old `memory/HEAD.md` claimed Phase 9.5 and a different commit.
- Status: `memory/HEAD.md` now points to root `HEAD.md`; remaining docs should be updated only after repo/runtime verification.

### Untracked debug HTML files are present

Known untracked files under `projects/tars-face/`:

- `minimal_test.html`
- `simple_test.html`
- `tars_debug.html`
- `test.html`
- `test1_fcss_sbody.html`
- `test2_scss_fbody.html`

Do not commit or delete them without explicit intent.

## Needed Future Artifacts

- Dedicated TARS release manifest/history beyond `RELEASE_STATE.md`.
- Test matrix for release validation.
- Runtime contract for browser globals/public APIs.
- Production kiosk/display/touch documentation captured from the Pi.

# TARS Release State

This file separates release truth, development branch truth, and production runtime truth. Do not collapse them into one word like "current."

## Last Verified

- **Git verification:** local repository on `master`
- **Production verification:** `tars.local` `/health`
- **Latest verification context:** documentation/state reconciliation pass after the production audit

Always re-run the verification commands below before making a release or deployment decision.

## Current Development State

| Question | Answer |
|---|---|
| Latest release | `tars-v9.3.2` |
| Latest release commit | `92adc86b965c8fa23b99b8f635900ce20b16665e` — `TARS: guard fallback animation state` |
| Current development branch | `master` |
| Last verified development HEAD | `9744f5327d4995a25fd33bcef6961770c0cc79a8` — `TARS: record left window coverage validation` |
| Post-release commits on `master` | Yes |
| Last verified production runtime SHA | `ba9559011f5493ba866c101715a6d31c7cf569a9` |
| Production deployment status | `/health` reports `validationStatus: validated` |
| Production image digest | `sha256:25d4c8d94531e6b958bd331bdf1d27c57f0bca2897e4c3b9835ecbd165793aa8` |
| Production deployedAt | `2026-08-05T03:29:25Z` |
| Kiosk service | `tars-kiosk.service` verified active on `tars.local` |
| Next release candidate | TBD |
| Current phase | Phase 9.4 in progress; Phase 9.5 release hardening is proposed, not released |

Live branch HEAD is mutable. Before any release, deployment, or state claim, check it directly:

```bash
git rev-parse HEAD
```

## Meaning of Each State

### Latest Release

`tars-v9.3.2` is the latest immutable release tag. It must not be moved, rewritten, or reinterpreted.

### Development HEAD

`master` contains post-release development commits. Its live HEAD is mutable; the SHA above is only the last verified value from the governance reconciliation pass. Those commits may be valid and may even be deployed, but they are not a release until tagged.

### Production Runtime

Production is what `tars.local` is actually running. At last verification, production was running `ba95590`, which is after `tars-v9.3.2` but before the last verified `master` HEAD.

## Version Decision Rule

Do not call `master` a released version until a new tag exists.

Recommended next-version logic:

- Use `tars-v9.3.3` if the next release packages post-`9.3.2` visual, environment, documentation, and release-state stabilization without claiming Phase 9.4 completion.
- Use `tars-v9.4.0` only after physical embodiment acceptance is validated and documented: display, kiosk/autostart, touch mapping, browser startup, object interaction, and production verification.
- Leave next release as `TBD` until that decision is made explicitly.

## Re-Establish State

Run these before release or deployment decisions:

```bash
git status --short --branch
git rev-parse HEAD
git log --oneline --decorate -20
git tag --sort=-creatordate --format "%(refname:short) %(creatordate:short) %(subject)"
```

For production:

```bash
ssh tars.local 'cd /home/admin/tars-face && git rev-parse HEAD && cd projects/tars-face && curl -fsS http://127.0.0.1:8080/health'
```

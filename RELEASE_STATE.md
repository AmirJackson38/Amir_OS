# TARS release and deployment state

Reviewed: 2026-10-06. Recheck before release or deployment decisions.

| Dimension | Last checked state / source |
|---|---|
| Immutable releases | `tars-v10.3.1` (dev candidate at `6de185859a1d9e35a5293c838bbaef8d624b1c5c`), `tars-v10.2.1` (deployed at `ad3f6f53a7d1a1990e4c57092fd377c9c11ee516`), `tars-v9.3.2` |
| Local development | Run `git rev-parse HEAD`; foundation audit started at `b51260f` |
| Software checkpoint | Phase 10.3.1 candidate shadow validation; declared in PROJECT_STATE.json |
| Pi checkout and health provenance | `ad3f6f53a7d1a1990e4c57092fd377c9c11ee516`, checked 2026-10-06 (uptime 3,384,231s, 0 alerts) |
| Pi container | Running; image matches health provenance |
| Phase 10.3.1 candidate deployment | Not deployed at the recorded check; Pi predates `6de1858` |
| Hardware acceptance | Phase 9.4 display/touch/reliability remains independently open |
| Active baseline | `tars-v10.3.1` candidate baseline established per user directive |

Evidence: `docs/FOUNDATION_RUNTIME_CHECK_2026-10-06.md`.

## Rules

A release tag, branch, and running deployment are different facts. Preserve released tags. Do not call master a release merely because it has later commits.

Do not choose a version based on the largest phase number in a document. Define release scope, validate its acceptance criteria, and tag the exact intended commit. A Phase 10.3.1 source checkpoint does not prove physical-hardware acceptance.

## Verify again

Local: `git status --short --branch`, `git rev-parse HEAD`, `git log --oneline --decorate -10`, and relevant tags.

Production: read `http://tars.local:8080/health`; compare its deployment SHA and image with the Pi checkout and running container. HTTP success alone is not visual/touch/recovery acceptance.

# TARS Roadmap Reconciliation

This document reconciles phase/version language after the production audit. It is documentation only; it does not change release history.

## Evidence Used

- Latest release tag: `tars-v9.3.2`
- Release tag target: `92adc86b965c8fa23b99b8f635900ce20b16665e`
- Last verified `master` HEAD: `9744f5327d4995a25fd33bcef6961770c0cc79a8`
- Production runtime SHA from `/health`: `ba9559011f5493ba866c101715a6d31c7cf569a9`
- Production kiosk service: `tars-kiosk.service` verified active
- Historical docs may still describe Phase 9.4 as pending display/kiosk work

Live branch HEAD is mutable. Before any release, deployment, or state claim, check it directly:

```bash
git rev-parse HEAD
```

## Reconciled Interpretation

### 1. `tars-v9.3.2` remains the latest release

It is an immutable release snapshot. Do not update old release meaning to include later commits.

### 2. `master` is ahead of the latest release

At last verification, the current branch contained post-release stabilization work. This is a development state, not a released version.

### 3. Production is also post-release

At last production verification, production ran `ba95590`, which is newer than `tars-v9.3.2` and older than the last verified `master` HEAD. Therefore release truth, branch truth, and production truth are three different facts.

### 4. Phase 9.4 is in progress, not complete

Kiosk-related recovery and production evidence show that physical embodiment work has begun. However, Phase 9.4 should not be marked complete until acceptance criteria are documented and validated.

Minimum Phase 9.4 completion criteria:

- display detected and documented;
- kiosk/autostart configuration captured in repo or runbook;
- cold browser startup validated;
- touch device detected;
- touch coordinates validated in browser;
- UI tap behavior validated;
- world/canvas interaction validated;
- object picking and ball interaction validated;
- production `/health` provenance verified after deployment;
- visual screenshot captured.

### 5. Phase 9.5 is proposed release hardening

Phase 9.5 should not be treated as completed or released. It is a proposed stabilization phase for:

- release manifests;
- browser smoke tests;
- data-truth fixes;
- performance baselines;
- known-issues hygiene;
- public runtime contract hardening.

## Where Recent Work Belongs

| Work | Classification |
|---|---|
| Kiosk startup regression recovery around `tars-v9.3.2` | Phase 9.4-adjacent recovery/stabilization, but historically tagged as `tars-v9.3.2` |
| Autonomy bar layout fix | Post-release UI stabilization |
| Static environment/background image fixes | Post-release visual/environment stabilization |
| Left-window scaling/rotation/coverage validation | Post-release visual stabilization |
| HEAD/release/version governance docs | Release hardening / AI workflow stabilization |

## Recommended Next Release Decision

Do not decide by memory. Decide by release intent:

- If releasing the current post-`9.3.2` stabilization state before full hardware/touch validation, tag it as `tars-v9.3.3`.
- If first completing Phase 9.4 hardware/touch/kiosk acceptance, tag that validated milestone as `tars-v9.4.0`.

Until then:

```text
Next Release Candidate: TBD
```

## Canonical Roadmap

### Current: Phase 9.4 — Physical Embodiment Reliability

Finish and document the Pi display/kiosk/touch path. Validate physical behavior before new features.

### Next Proposed: Phase 9.5 — Release Hardening

Make releases reproducible and self-verifying: release manifests, smoke tests, performance baselines, known issues, and accurate runtime data.

### Later: Phase 10 — Architecture Consolidation

Begin frontend modularization only after smoke tests and runtime contracts exist.

### Future: Phase 11+ — Expanded Autonomy and Capabilities

Games, richer activities, LLM consultant layer, sensors, Home Assistant, long-term memory, and advanced physical interaction.

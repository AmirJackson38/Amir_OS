# Deterministic interruption recovery — 2026-10-21

## Task and outcome
Amir requested lightweight scripted continuity that survives rate limits/model switches and reduces dependence on model interpretation. Implemented dependency-free Node tools; no live services changed.

- `tools/task_checkpoint.mjs`: begin/prepare/resolve/close state machine, explicit uncertain actions, required evidence, revision checks rejecting stale retries, exclusive writer locks, fsynced temporary snapshots and same-directory atomic publication. Earlier revisions retained. Recorded text never executed.
- `.amir-state/tasks/`: ignored local task journals; durable across sessions on this checkout, not automatically synchronized across devices/accounts' remote storage. Mutation output is compact; full history is opt-in via status/files.
- `tools/agent_bootstrap.mjs`: includes local recovery section; general/homelab/tars routes, default general, preserves project state in JSON output; removes duplicate Git change listing and unrelated TARS briefing from general/homelab text.
- `tools/agent_preflight.mjs`: read-only Node/Git/context/checkpoint checks, optional known-host key-based SSH hostname probe. Does not certify model intelligence or service health.
- `docs/INTERRUPTION_RECOVERY.md`: operating commands, interruption semantics, lock handling, limits, and replacement-model read-only check. START_HERE, AGENTS and MEMORY_PROTOCOL link the workflow.

## Evidence
- `node --test tools/test_task_checkpoint.mjs`: 5/5 passed. Covered recovery of uncertain action, evidence/revision enforcement, simulated partial unpublished write with lock, corrupt committed revision refusing fallback, duplicate retries, read-only discovery, invalid task path, explicit failure outcome.
- `node tools/agent_preflight.mjs`: all local checks passed. Optional SSH probe not run in this task.
- Bootstrap checks: general omits TARS section; homelab routes correctly; TARS section available explicitly; JSON preserves project state; active uncertain step displayed.
- Targeted `git diff --check` passed for tracked changes. Existing unrelated user changes preserved. No commit/staging performed.
- Used the new checkpoint workflow for validation and this handoff: task `interruption-recovery-tools`. Draft implementation necessarily preceded the new tracker becoming usable.

## Limits and next action
- An agent must invoke checkpoint commands; no client hook/plugin enforcing invocation was installed. New instructions route assistants into this workflow.
- Atomic publication protects journal revisions, not arbitrary agent file edits or remote actions. A remote action can complete before its result is recorded, which is why uncertain steps require inspection rather than replay.
- Evidence text is supplied by the operator; scripts enforce structure/state transitions, not factual truth. Power-loss/disk-failure guarantees and cross-device synchronization are outside this change.
- Existing Python-generated context views already use `memory_io.atomic_write`; existing historical source records were not rewritten.
- Next operational task: run bootstrap, begin tracking, prepare before changes (including final memory record), verify and resolve, then close with a dated record. Evaluate client hooks separately only if missed invocations remain a practical problem.

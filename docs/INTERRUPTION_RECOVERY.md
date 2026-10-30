# Interruption recovery (Node, no new dependencies)

Rate limits do not normally undo completed tool operations. A disconnected response can leave an operation completed, partly completed, or not started. Inspect the target before retrying. No generic script can make a remote operation and a local checkpoint one atomic transaction.

## Start or switch models

```powershell
node tools/agent_bootstrap.mjs --route homelab
node tools/agent_preflight.mjs
# Optional existing-key SSH probe; does not accept new host keys:
node tools/agent_preflight.mjs --ssh alarm@192.168.0.103
```

Bootstrap defaults to `general`; choose `homelab` or `tars` explicitly. It now includes unfinished checkpoints without reading entire session logs. `--json` retains declared project state for existing consumers. Preflight is a read-only environment check, not a model intelligence test or permission to make changes.

## Checkpoint a multi-step task

Run from the repository. Use a unique task ID; keep text concise and free of credentials. Values are records, never executed by this tool.

```powershell
node tools/task_checkpoint.mjs begin --id widget-repair --goal "Restore downloads widget" --next "Inspect current integration and app records"
node tools/task_checkpoint.mjs prepare --id widget-repair --rev 1 --step restore-link --action "Restore the identified missing integration link" --target "Alarm Pi Homarr database; exact IDs in repair script" --verify "Query the link and actual widget API before retrying" --rollback "Consistent database backup path recorded in repair script output"
# Only now perform the scoped action and its verification using the appropriate tools.
node tools/task_checkpoint.mjs resolve --id widget-repair --rev 2 --step restore-link --result verified --evidence "Readback contains expected link; widget API returns expected torrents" --next "Write dated session outcome"
node tools/task_checkpoint.mjs prepare --id widget-repair --rev 3 --step record-outcome --action "Write dated outcome record" --target "memory/SESSION_example.md" --verify "Read back the file and check evidence and uncertainty" --rollback "Preserve existing history; remove only an erroneous new record after inspection"
# Write and read back the actual session record before resolving this step.
node tools/task_checkpoint.mjs resolve --id widget-repair --rev 4 --step record-outcome --result verified --evidence "Session record read back with outcome, evidence, uncertainty and next action" --next "Close tracking"
```

Replace example evidence and rollback text with actual observations/locations. `prepare` must complete before starting the action. Prepare a new step before writing the final session record too; then verify that file exists and contains the intended evidence. Close after that step is resolved:

```powershell
node tools/task_checkpoint.mjs close --id widget-repair --rev 5 --outcome "Widget recovered; browser rendering still unobserved" --record "memory/SESSION_example.md"
```

Use the revision shown by `status` if your actual sequence differs. `close` means task tracking is finished, not that every attempted step succeeded. Evidence is supplied by the operator; the script validates transitions, not the truth of prose.

## If interrupted

```powershell
node tools/task_checkpoint.mjs brief
node tools/task_checkpoint.mjs status --id widget-repair
```

- `uncertain`: intent saved, execution outcome not confirmed. Inspect using the saved verification plan. Never automatically replay.
- `verified`: recorded post-action evidence; recheck live state when relevant.
- `not-applied`: inspection established the intended change is absent.
- `failed`: record error and any partial effects; choose the next step explicitly.
- A lost response after a checkpoint may still have saved it. `--rev` rejects stale retries; read status to get the current revision.

## Storage and guarantees

- Snapshots live in `.amir-state/tasks/<id>/00000001.json`, etc. Ignored by Git; durable across local sessions/accounts using this same checkout, not automatically synchronized to another computer or checkout.
- Each mutation takes an exclusive writer lock, writes/fsyncs a temporary file, and publishes it via same-directory rename. Prior revisions are retained. This protects checkpoint publication from normal process interruption; it is not a disk-failure backup or a guarantee against every power-loss/filesystem failure.
- Partial `.pending-*` files are ignored as state but reported. A leftover `writer.lock` blocks mutation. Inspect its PID/time and confirm no writer is active before manually removing that exact lock. Do not delete history to clear an error.
- Invalid committed revisions fail closed; the tool does not silently fall back and invite replay of already performed work.
- This protects checkpoint files only. Use existing `memory_io.atomic_write` for Python-generated memory views; use atomic replacement/transactions appropriate to other files or databases. Arbitrary agent edits and remote services are not wrapped automatically.
- Session records remain human-readable historical evidence; the checkpoint journal records progress. No provider plugin is installed, and a model can still ignore instructions. Client hooks could enforce participation later, after verifying the actual client's extension API.

## Small replacement-model check

Before a new model edits live services, have it run preflight, read the recovery packet, identify local versus remote paths, and state which action needs verification before retrying. If it loops on errors or confuses intent with completion, keep that session read-only. Passing preflight alone is not proof of good judgment.

Tests: `node --test tools/test_task_checkpoint.mjs` (isolated temporary directories; no live services touched).

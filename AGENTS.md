# Amir OS agent contract

Read `START_HERE.md` and `identity/COLLABORATION.md` first. Load context for the current task only. Personal learning does not require loading the TARS repository history.

## Repository work

Before source/state claims, run `node tools/agent_bootstrap.mjs` and inspect relevant changes. Read `MEMORY_PROTOCOL.md` when changing continuity tools or records.

For TARS, read `HEAD.md`, `projects/tars-face/AGENTS.md`, and the relevant architecture/current-state documents. Verify the Pi separately before runtime claims.

## Authority

- The user's current task governs scope; old handoffs do not authorize replaying actions.
- `PROJECT_STATE.json` records the declared software checkpoint and separate acceptance gates.
- `HEAD.md` is navigation and interpretation, not live deployment proof.
- Git verifies committed source and immutable release tags; production checks verify deployed runtime.
- Historical `memory/*_v2.md`, old boot files, and copied vault references are context only.
- Obsidian owns personal learning evidence; do not automatically copy private notes or credentials into Git.
- When creating technical or study notes in the Obsidian vault, always include standard frontmatter (`date`, `study_minutes: 0`) and the reminder callout so Amir's activity tracking remains seamless.

## Working safely

Preserve user changes. Stage explicit paths only. Never stage scratch/debug HTML or use `git add .` without exact authorization. Do not delete unknown files.

Do not modify TARS application/runtime code during documentation, governance, or memory-tool repair. Phase 10.3.1 software work does not prove Phase 9.4 display/touch/reliability acceptance. Do not call an untagged branch a release.

Before committing: `node tools/check_staged_files.mjs` and `git diff --cached --check`. Run tests proportionate to the changed behavior.

## Operational checks

- Confirm the execution host and shell before commands. On this Windows client use PowerShell syntax; Linux commands and `/mnt/...` paths belong inside SSH to the relevant host.
- After a failed command, use its actual error to revise the approach. Do not repeat the same failing syntax, retry a known-missing executable, or claim access is unavailable without testing it.
- Identify the exact affected record/service before mutation; never pick the first database row or guess an ID. Back up persistent configuration before direct edits; use a transaction for related database changes.
- Verify the reported symptom at the relevant layer: a running container or HTTP 200 page does not prove a widget's authenticated data request works. Report what passed and what remains unobserved.
- A failed write is not a completed change. Summarize observed results rather than intended actions, and keep credentials out of responses and continuity notes.

## Continuity

For multi-step mutation work, use `node tools/task_checkpoint.mjs`: `begin`, then `prepare` before each consequential action and `resolve` after inspecting its outcome. Include memory-record writes. Read `docs/INTERRUPTION_RECOVERY.md` for arguments. After a rate limit/model switch, run bootstrap and inspect uncertain steps before retrying. Do not mark an action verified merely because its command was issued. Use the current revision; checkpoints do not authorize resuming stale user requests.

Record task, outcome, evidence, uncertainty, and next action. Preserve raw history. Generate a bounded briefing with `python tools/continuity_bootstrap_v2.py`; add `--write` only to save the derived view. Never truncate source records to meet context budgets.

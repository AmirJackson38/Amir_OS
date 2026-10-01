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

## Working safely

Preserve user changes. Stage explicit paths only. Never stage scratch/debug HTML or use `git add .` without exact authorization. Do not delete unknown files.

Do not modify TARS application/runtime code during documentation, governance, or memory-tool repair. Phase 10.3.1 software work does not prove Phase 9.4 display/touch/reliability acceptance. Do not call an untagged branch a release.

Before committing: `node tools/check_staged_files.mjs` and `git diff --cached --check`. Run tests proportionate to the changed behavior.

## Continuity

Record task, outcome, evidence, uncertainty, and next action. Preserve raw history. Generate a bounded briefing with `python tools/continuity_bootstrap_v2.py`; add `--write` only to save the derived view. Never truncate source records to meet context budgets.

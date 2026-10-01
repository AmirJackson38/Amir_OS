# Memory and ownership

## One owner per kind of information

| Information | Owner | How to verify |
|---|---|---|
| Collaboration preferences | `identity/COLLABORATION.md` | Amir's current instructions |
| Personal goals, study attempts, reflections | Obsidian vault | Dated first-person records and evidence |
| Declared TARS workstream and acceptance gates | `PROJECT_STATE.json` | Code, tests, and acceptance records |
| Committed source and release history | Git commits and immutable release tags | Live Git commands |
| Deployed runtime | Pi service and deployment provenance | Timestamped live checks |
| Historical sessions and decisions | Original records | Source links and dates |
| Agent context packet | Generated view | Rebuild from the above; never treat as an independent authority |

`HEAD.md` is a navigation and interpretation page. It must agree with `PROJECT_STATE.json` about the software checkpoint. Software phase, hardware acceptance, release tag, and deployed build are separate facts.

## Safe context generation

`tools/continuity_bootstrap_v2.py` prints a short briefing by default. `--write` explicitly saves the generated view to `memory/CONTEXT_PACKET.md`. It never rewrites the original `BOOTSTRAP_v2.md`, discovers projects, or promotes claims.

`tools/character_limiter.py` and `tools/memory_compactor.py` are compatibility entrypoints for non-destructive size reporting. Historical records may exceed old budgets. Context budgets apply to generated views, not source records.

`tools/memory_promoter.py --check` proposes candidates. `--promote` and `--session-end` save candidates for review in `memory/REVIEW_QUEUE.md`; they do not assert that a keyword match is a verified lesson, decision, or completed milestone. Review candidates before updating the appropriate source.

Queue updates use atomic replacement and an exclusive writer lock. If a client crashes and leaves REVIEW_QUEUE.md.lock, inspect the recorded process and confirm no writer is active before removing that exact lock. Never automatically discard a lock or overwrite concurrent evidence. Token-pattern redaction is a convenience, not a complete secret scanner; do not supply secrets as learning or memory text.

Historical `memory/ACTIVE_PROJECT_v2.md` and `projects/ACTIVE_PROJECT_v2.md` are retained as historical records. New tools must not write either as current project state.

## Handoff format

Record: task, status, source/revision checked, outcome, evidence, remaining uncertainty, and next action. Resume only after checking current user intent and whether the proposed action already happened. A stale `In-Progress` marker is not an instruction to replay a deployment.

## Vault references

Technical vault notes are reference views, not deployment truth. Mark copied material with status, source, and review date. Keep original history available. Never synchronize secrets or whole personal notes into Git automatically.

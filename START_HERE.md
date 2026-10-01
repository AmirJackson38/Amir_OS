# Amir OS: start here

Amir OS provides continuity across assistants. It is a collection of files, not a model or an automatic memory service. A client must be pointed here; reading the same contract improves consistency but does not make different models identical.

## Always read

Read `identity/COLLABORATION.md` for the small, stable collaboration contract. Then follow the current user request. Do not load the entire vault, history, or TARS context by default.

## Load only the relevant route

| Task | Read next |
|---|---|
| Work inside this repository | `AGENTS.md` |
| TARS source, deployment, or diagnostics | `HEAD.md`, then relevant TARS project docs |
| Resume interrupted foundation work | `memory/FOUNDATION_HANDOFF.md`; verify its status against files |
| Learning, personal planning, or daily notes | Obsidian vault `Home.md`, then `Learning Queue.md` |
| Understand memory ownership | `MEMORY_PROTOCOL.md` |

On this Windows machine the vault is `C:/Users/Admin/Documents/Amir's Obsidian Vault`. The versioned repository is `C:/Users/Admin/OneDrive/Documents/Amir_OS`. These are different folders with different responsibilities.

For TARS, `node tools/agent_bootstrap.mjs` prints live Git state and declared project status. It does not verify the Pi. `python tools/continuity_bootstrap_v2.py` prints a bounded briefing without editing source records.

## Finishing work

Record the outcome, evidence, remaining uncertainty, and next action in the relevant project or learning record. A prior plan is context, not permission to execute it automatically. Preserve raw history; generate short context views from it.

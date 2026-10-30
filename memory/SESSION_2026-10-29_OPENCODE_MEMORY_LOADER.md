# OpenCode memory loader repair — 2026-10-29

## Task and outcome

Investigated why the intended OpenCode automatic continuity hooks did not appear active during account/model switches. Repaired the installed plugin loader at `C:/Users/Admin/.config/opencode/plugins/amir-memory.js` (outside this repository): it had resolved `Amir_OS` under `.config/Documents` instead of `C:/Users/Admin/Documents`, and then passed a Windows `C:\...` path directly to Node ESM `import()`. It now resolves the repository through three parent directories and imports its hooks module using `pathToFileURL(...).href`.

## Evidence

- Before repair, the constructed module path did not exist; the corrected one did. First isolated load exposed `ERR_UNSUPPORTED_ESM_URL_SCHEME` for the Windows absolute path, which was then fixed.
- The installed plugin now instantiates with the real `@opencode-ai/plugin` dependency; its readback exposes `memory_status`, `memory_complete`, `tool.execute.before`, `tool.execute.after`, and compaction/system hooks.
- `node --test tools/test_memory_hooks.mjs tools/test_task_checkpoint.mjs`: 14 passing tests, including pre-action persistence, lost return, rate-limit handling, stale acknowledgements and recovery.
- `node tools/agent_bootstrap.mjs --route general` on this host reported no active manual checkpoints before the repair. The repair itself used checkpoint `opencode-memory-loader-20261029`.

## Remaining uncertainty and next action

OpenCode loads plugins at process startup; this already-running session has not reloaded the repaired plugin. Quit and restart OpenCode, start a session using this checkout, confirm `memory_status` is available, run one harmless tool call, and inspect its receipt. After a rate limit or model/account switch, run `node tools/agent_bootstrap.mjs --route general` and inspect any pending calls before retrying effects. A returned tool receipt does not verify the target's resulting state. Local ignored `.amir-state` journals follow the checkout on this machine, not account identity; they do not automatically sync across hosts or independent checkouts.

## Follow-up after restart (2026-10-30 UTC)

The restarted OpenCode instance still lacked `memory_status`. Its startup log showed `failed to load plugin` with `undefined is not an object (evaluating 'tool.schema.string')`: the loader had selected `ctx.client.tool`, which lacks the plugin tool schema. Updated the installed loader to always use `tool` from `@opencode-ai/plugin`. A fresh isolated plugin instantiation now exposes `memory_status`, `memory_complete` and both execute hooks; all 14 hook/checkpoint tests pass. This running session loaded before the correction, so live hook registration and a real journal receipt remain unverified. Next: restart OpenCode again, confirm `memory_status` appears, then check a harmless tool call's receipt.

## Live follow-up after restart (2026-10-29 local / 2026-10-30 UTC)

In the restarted OpenCode session, `memory_status` returned a snapshot with zero pending calls and `memory_complete` accepted the read-only acknowledgment. After subsequent local commands, `memory_status` listed eight pending tool intents, including returned-but-unverified and prepared-outcome-unknown entries; this demonstrates that the live journal and recovery view are recording calls. The prepared entries had returned in the chat transcript but lacked a journal return receipt at the instant sampled. Receipts do not prove command effects, and an active session naturally accrues pending calls until reviewed. Next: verify consequential actions against files and Git, then acknowledge the final journal snapshot. Obsidian reference: `AI & Agent System/03 Memory & History/OpenCode Memory Hooks 2026-10-29.md` (local vault; not synced into this repository).

## Sync review (2026-10-29 local)

Readback verified this record and the new Obsidian reference with `date: 2026-10-29`, `study_minutes: 0` and a reminder callout. `node --test tools/test_memory_hooks.mjs tools/test_task_checkpoint.mjs` passed 14/14; `node tools/agent_preflight.mjs` passed its local checks. The worktree contains unrelated earlier homelab/deployment changes. Review found plaintext access credentials in the existing network document and an untracked October 19 record; exclude those files and unreviewed personal vault-derived deployment data from staging. Existing committed historical documents also contain credentials; this local review does not remove prior remote exposure. Next: stage only reviewed, credential-free continuity files; run the staged-file guard and diff check; commit and push; inspect the final Git state and acknowledge the journal. The vault is a separate local folder, not part of the Git push.

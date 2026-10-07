# Agent entrypoints

Portable entrypoint: `START_HERE.md`. Stable collaboration preferences: `identity/COLLABORATION.md`. Repository rules: `AGENTS.md`.

On Windows, the repository is `C:/Users/Admin/Documents/Amir_OS`. The shared pointer is `C:/Users/Admin/.agents/AGENTS.md`. Claude and Gemini repository pointers route to the same contract.

For a new client, explicitly provide this instruction:

> Read C:/Users/Admin/Documents/Amir_OS/START_HERE.md and follow the route relevant to my request. Tell me if you cannot access it.

Do not assume every client automatically discovers the shared pointer. A future local model needs file access or a caller that supplies the selected files; the model itself does not acquire persistent memory from a path.

For TARS repository work run `node tools/agent_bootstrap.mjs`. For a bounded continuity view run `python tools/continuity_bootstrap_v2.py`. Neither verifies production.

On the Pi the checkout is `/home/admin/tars-face`; use the root entrypoint if present, otherwise `projects/tars-face/AGENTS.md`.

The Obsidian vault is a separate learning/wiki workspace: `C:/Users/Admin/Documents/Amir's Obsidian Vault`. Start at Home. See `MEMORY_PROTOCOL.md` for ownership.

# Agent Entrypoint Placement

This file explains how Amir OS exposes its agent instructions to different tools and environments.

## Canonical Repo Entrypoints

- `AGENTS.md` — primary cross-agent contract.
- `HEAD.md` — current operational truth and navigation.
- `PROJECT_STATE.json` — machine-readable project state pointer.
- `CLAUDE.md` — Claude-style pointer back to `AGENTS.md`.
- `GEMINI.md` — Gemini-style pointer back to `AGENTS.md`.

## Normal Startup Command

From the repository root:

```bash
node tools/agent_bootstrap.mjs
```

Before committing:

```bash
node tools/check_staged_files.mjs
```

For docs-only work:

```bash
node tools/check_staged_files.mjs --docs-only
```

## Windows / ThinkPad

The working repository is currently inside OneDrive:

```text
C:\Users\Admin\OneDrive\Documents\Amir_OS
```

If a CLI starts somewhere else, point it at this repository and run `node tools/agent_bootstrap.mjs`.

A Desktop pointer can be created later, but the canonical files should remain in the repository so they stay versioned and portable.

## Raspberry Pi / `tars.local`

The production checkout is:

```text
/home/admin/tars-face
```

TARS-specific agent instructions are also present inside:

```text
/home/admin/tars-face/projects/tars-face/AGENTS.md
```

For local models or agent CLIs running on the Pi, start from `/home/admin/tars-face` if possible. If the sparse checkout does not expose root files, start from `/home/admin/tars-face/projects/tars-face` and read that local `AGENTS.md`.

## Rule

Do not duplicate long-form memory into many untracked places. Prefer small pointer files that direct agents back to the versioned repository truth.

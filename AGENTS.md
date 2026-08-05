# Amir OS Agent Contract

This is the root agent entry point for Amir OS. Any AI agent, CLI model, local model, or coding assistant operating inside this repository should read this file before acting.

## Required Startup

1. Read `HEAD.md`.
2. Run:

```bash
node tools/agent_bootstrap.mjs
```

3. Verify live Git state before making claims:

```bash
git status --short --branch
git rev-parse HEAD
git log --oneline --decorate -10
```

4. Treat `memory/*`, old boot files, old session logs, and old active-project files as historical context unless root `HEAD.md` says otherwise.

## Truth Model

- Git history is source truth for committed development state.
- `HEAD.md` is the operational entry point.
- `PROJECT_STATE.json` is the machine-readable state pointer.
- `RELEASE_STATE.md` distinguishes release, development, and production runtime.
- `tars.local` `/health` is production runtime truth.
- Chat history is not authority.

## Safety Rules

- Do not use `git add .` unless explicitly approved for the exact task.
- Prefer explicit path staging.
- Do not stage scratch/debug HTML files.
- Do not delete unknown files. Unknown does not mean unused.
- Do not modify application/runtime code during documentation-only or governance-only tasks.
- Do not claim Phase 9.4 complete until display, touch, kiosk, and hardware reliability acceptance are documented.
- Do not call `master` a release until a tag exists.

Before committing, run:

```bash
node tools/check_staged_files.mjs
git diff --cached --check
```

## TARS Project Entry

For TARS work, after reading root `HEAD.md` and this file, read:

- `projects/tars-face/AGENTS.md`
- `projects/tars-face/docs/CURRENT_STATE.md`
- `projects/tars-face/docs/ARCHITECTURE.md`
- `projects/tars-face/docs/PHASE_HISTORY.md`

## Common Agent Entrypoints

This repository also includes `CLAUDE.md` and `GEMINI.md` as lightweight pointers for agent CLIs that look for model-specific instruction files. They intentionally delegate back to this file and `HEAD.md`.

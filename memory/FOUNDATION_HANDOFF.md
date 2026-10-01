# Foundation repair handoff

Date: 2026-10-01
Status: Completed locally; repository checkpoint recorded in Git

Authorized task: separate portable collaboration preferences from project memory; repair destructive memory maintenance; make Obsidian useful for learning; reconcile TARS state without inventing deployment or hardware acceptance.

Starting source: local `master` at `b51260f84aa2214a642f7ebf74e0cf5c877bff84`.
Existing user changes: `memory/BOOTSTRAP_v2.md`, `memory/SESSION_LOG_v2.md`, `memory/STAGING_INTENT.md`. Preserve them and do not include them in the repair commit.
Recovery copy: `C:/Users/Admin/Documents/Amir_OS Backups/2026-10-01-foundation-before`.

Plan: repair memory tooling with non-mutating defaults; test against temporary fixtures; establish START_HERE and collaboration routing; update Obsidian navigation/templates/queue; reconcile software checkpoint and separate hardware/deployment facts; validate links and staged changes.

## Completed

- Added START_HERE.md, a short collaboration contract, and MEMORY_PROTOCOL.md; routed shared, Claude, Gemini, and repository entrypoints through them.
- Replaced destructive memory maintenance with preserved source records, bounded generated context, and a locked/atomic review queue for unverified candidates.
- Reconciled Phase 10.3.1 software checkpoint, independent hardware acceptance, immutable release, and observed deployed build.
- Rebuilt the local vault Home, Start Here, Wiki Index, source map, learning queue, templates, and first read-only TARS exercise. Configured native daily-note/template paths and added an Amir Wiki desktop URI shortcut.
- Marked imported technical references as requiring source verification; retired unsupported learning-completion claims.

## Evidence

- Seven memory regression tests pass, including preservation, ordering, context budget, unverified promotion, failed atomic writes, token-pattern redaction, and concurrent-writer rejection.
- Repository health checks pass within their documented scope.
- Four local TARS suites pass: Observatory candidate, shadow observation, canonical runtime shell, and behavioral memory. Run the latter suites from projects/tars-face so relative fixtures resolve.
- Vault check: 108 note names and 499 wikilinks; no unresolved links; native template paths exist.
- Original BOOTSTRAP_v2.md, SESSION_LOG_v2.md, and STAGING_INTENT.md match recovery-copy hashes exactly.
- Read-only Pi health, checkout, and container checks agree at ad3f6f5. Dated evidence: docs/FOUNDATION_RUNTIME_CHECK_2026-10-01.md.

## Limits and next action

No TARS runtime code or deployment changed. Manual candidate shadow comparison and physical display/touch/reliability acceptance remain open. Obsidian configuration and note links were verified on disk, not through native UI interaction; reload the app if its existing session has not picked up template settings.

Personal next action: open Home in Obsidian, choose Trace a request to TARS, and save a first learning attempt. Engineering next action: the existing Phase 10.3.1 manual shadow validation gate, separately scoped from this foundation repair.

The vault, shared user-level pointer, and desktop shortcut are local artifacts outside this repository. They are not included in the Git commit. The local recovery copy is not an off-device backup.

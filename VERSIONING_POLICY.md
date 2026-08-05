# TARS Versioning Policy

## Purpose

TARS versioning exists so any human or AI can answer:

- What version is this?
- What commit produced it?
- What changed?
- What validation was performed?
- What issues were known?
- How do we roll back?

## Version Format

TARS release tags use:

```text
tars-v<phase>.<milestone>.<patch>
```

Example:

```text
tars-v9.3.2
```

- `phase` maps to the active TARS phase.
- `milestone` maps to a major milestone inside that phase.
- `patch` maps to stabilization, recovery, validation, or focused release increments.

Amir OS platform versions such as `v0.9.0` are separate from TARS runtime release tags.

## What Qualifies As a Release

A TARS release requires:

1. committed source state;
2. clear purpose;
3. release tag;
4. validation record;
5. known issues record;
6. rollback reference;
7. production provenance if deployed.

## Required Release Record

Every release should record:

- version/tag;
- commit SHA;
- purpose;
- changes;
- validation performed;
- deployment target, if any;
- Docker image digest, if deployed;
- browser/runtime validation, if applicable;
- known issues;
- rollback path.

## Tagging Rules

- Use annotated tags for TARS releases.
- Never move, delete, or replace a release tag to change history.
- If a tagged release is wrong, create a new release that documents the correction.
- Tags are historical snapshots, not living labels.

## Forward-Only Rules

- No version rollback.
- No replacing old releases.
- No silent changes.
- No undocumented production state changes.
- No claiming production validation without evidence from the running target.

## Version Increment Guidance

- Increment patch for focused fixes, validation baselines, recovery fixes, and release hardening.
- Increment milestone for a completed project milestone inside the same phase.
- Increment phase only when the system has moved to a new architectural or product-level stage.

## Development Snapshots

Commits after the latest tag are development snapshots. They may be correct and deployed, but they are not a new immutable release until tagged and documented.

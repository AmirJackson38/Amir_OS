# TARS Engineering Principles

## Forward-Only Evolution

History is preserved. Released versions are immutable. If a correction is needed, create a new version and document what changed.

## Single Source of Truth

Git history and release tags are historical truth. Production runtime truth must be verified from the running Pi and deployment provenance. Documentation should point to truth, not compete with it.

## Verify Before Modifying

Before changing TARS, inspect:

1. current branch and HEAD;
2. latest commits and tags;
3. working tree state;
4. current operational docs;
5. production status when runtime behavior matters.

Do not rely on chat context or old summaries when the repository can answer.

## Stability Before Expansion

Protect working capabilities before adding new ones. Fix broken contracts, misleading telemetry, performance regressions, and deployment ambiguity before feature expansion.

## Production Baselines Are Sacred

A known-good release is a rollback anchor. Never modify an old release tag to represent a state it did not have. New behavior requires a new commit and, when released, a new tag.

## Documentation Is Engineering

TARS must explain itself. Critical architecture, deployment topology, current state, known issues, and validation steps belong in the repository.

## Hardware Is Architecture

TARS is a physical device, not just software. Raspberry Pi runtime, display, kiosk, touch input, boot behavior, and future sensors are part of the system design.

## Observable Behavior

Behavior must be inspectable. Use telemetry, logs, `/health`, deployment provenance, browser smoke tests, screenshots, and performance measurements.

## Modular Growth

Improve components without unnecessary rewrites. Modularization should reduce risk through clear contracts and tests, not create broad behavior changes.

## LLM Is Consultant, Not Controller

Future cognitive layers may advise or enrich TARS, but they must not replace the autonomous scheduler or become the primary source of world truth.

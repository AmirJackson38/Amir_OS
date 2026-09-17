# TARS Incremental Extraction Methodology

This document defines how future Phase 10.3 work may modularize behavior
without creating a second authority or silently changing Phase 9.4 behavior.

## One-authority rule

The existing frontend remains the only behavior authority until a migration
gate explicitly transfers ownership. A proposed module may observe or run in
parallel, but it must not write canonical world state, needs, activity,
location, environment, persistence, or behavioral memory during comparison.

## Archaeology first

Before extracting a system, record:

1. Current behavior and representative fixtures.
2. Every reader and writer of the state.
3. Inputs, outputs, timers, event emissions, and persistence calls.
4. Hidden coupling to DOM, Three.js objects, globals, random values, and event ordering.
5. Failure and reload behavior.

The existing code boundary is a hypothesis, not proof of ownership.

## Parallel implementation

Create a headless candidate with an explicit input/output contract. Keep the
Phase 9.4 implementation active. Feed both implementations the same recorded
inputs and compare outputs with `ComparisonEngine`.

The candidate must be observational and disposable until it passes fixtures,
live shadow comparisons, and authority-isolation tests. Differences must be
classified as missing fields, unexpected fields, value drift, transitions,
session, timing, or version mismatches with severity and expected/observed
values.

## Migration gate

Ownership may move only after:

- fixture and regression coverage passes;
- live shadow differences are understood and within an approved tolerance;
- persistence and restart behavior are validated;
- exactly one writer is identified;
- rollback to the prior implementation is documented;
- a new version/release records the change.

Removal of the old implementation is a separate later step. It is never part
of the initial extraction commit.

## Example: future item system

For an item/object system, map object creation, transforms, physics hooks,
interaction handlers, persistence capture/restore, render bindings, and all
global readers first. Define a headless item contract, replay the recorded
object-interaction fixtures, compare state transitions, then migrate one
writer at a time. Renderer camera and interpolation remain outside the
behavior contract.

## Current status

Phase 10.2.2 provides comparison hardening and representative Phase 9.4
fixtures only. No behavior extraction has started.

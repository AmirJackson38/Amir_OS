# TARS roadmap reconciliation

Reviewed: 2026-10-01. Declared workstream: PROJECT_STATE.json. Navigation: HEAD.md.

## Current software checkpoint: Phase 10.3.1

The Observatory extraction candidate is implemented in local source with shadow wiring, disabled by default. The legacy observatory still owns UI output.

Next gate: review the relevant diff, run candidate shadow mode, inspect live comparisons, and preserve rollback before any diagnostic cutover. Do not enable canonical mode or move runtime authority as part of a documentation repair.

## Independent hardware gate: Phase 9.4

Earlier physical acceptance remains open: display detection, touch mapping, cold visual startup, and hardware reliability. Kiosk service verification is recorded historically. Revalidate hardware directly before declaring acceptance.

Software progress into Phase 10 does not erase this gate and does not mean the whole project must be described as Phase 9.4.

## Release and deployment

Latest release remains tars-v9.3.2. On 2026-10-01 the Pi checkout, container, and health provenance agreed at ad3f6f5, before candidate checkpoint 6de1858. See RELEASE_STATE.md and the dated runtime receipt.

## Later proposals

Release hardening, further extraction, cognition, new activities, and sensors require their own scoped objectives and evidence. Old phase-numbered plans are historical context, not an instruction to implement everything in order.

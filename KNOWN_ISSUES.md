# TARS known issues and open verification

Reviewed: 2026-10-01.

- **Manual candidate validation pending:** Phase 10.3.1 has source/test evidence but still needs the documented live shadow comparison gate before diagnostic cutover.
- **Hardware acceptance incomplete:** display, touch, cold visual startup, and reliability remain separate acceptance work.
- **Deployment differs from local source:** live Pi checked at ad3f6f5; local candidate checkpoint is later. This is a recorded difference, not automatically a fault.
- **Historical documentation may disagree:** old phase names, IP addresses, and boot summaries are not current authority. Use START_HERE.md, PROJECT_STATE.json, and dated runtime receipts.
- **Wiki references are not synchronized automatically:** check their source and review date before operational use.
- **Local recovery copy only:** the foundation repair preserves a local pre-change copy; off-device vault recovery has not been established by this task.

## Fixed in the foundation repair

Destructive character truncation is removed from the active memory maintenance commands. Briefings are generated separately; inferred memory candidates require review. Shared entrypoints no longer force TARS/history into every learning session. Regression tests live in tools/test_memory_safety.py.

Do not declare all systems healthy based on a repository syntax check. Runtime, hardware, recovery, and learner understanding each need their own evidence.

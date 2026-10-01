---
name: tars-memory
description: Evidence-preserving continuity and task-scoped context
when_to_use: "When managing memory records, continuity, handoffs, or context generation"
allowed_tools: Read, Grep, Glob, Bash, Write, Edit
version: 1.0.0
requires_skills: []
references:
  - MEMORY_PROTOCOL.md
  - tools/continuity_bootstrap_v2.py
---

# Memory continuity

Read MEMORY_PROTOCOL.md. Preserve durable source records; budgets apply to context views only.

- START_HERE.md routes the task; identity/COLLABORATION.md holds stable preferences.
- PROJECT_STATE.json declares TARS software checkpoint and separate acceptance gates.
- Historical *_v2.md files remain evidence, not current authority.
- continuity_bootstrap_v2.py prints a bounded view; --write saves memory/CONTEXT_PACKET.md.
- character_limiter.py and memory_compactor.py report sizes without modifying records.
- memory_promoter.py queues explicitly supplied candidates for review; it does not declare facts.
- auto_heal.py is diagnostic only.

Record task, status, evidence, uncertainty, and next action in a focused handoff. Verify current user intent and existing effects before resuming. Keep personal learning attempts in Obsidian. Do not load all memory at startup or automatically commit private records.

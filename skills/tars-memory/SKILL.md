---
name: tars-memory
description: Memory organization, file limits, rolling windows, session continuity system
when_to_use: "When managing memory files, session continuity, WAL protocol, or bootstrap compilation"
allowed_tools: Read, Grep, Glob, Bash, Write, Edit
version: 1.0.0
requires_skills: []
references:
  - memory/CURRENT_STATE_v2.md
  - memory/SESSION_LOG_v2.md
  - memory/STAGING_INTENT.md
  - tools/continuity_bootstrap_v2.py
  - tools/character_limiter.py
---

# TARS Memory Skill

## Memory File Organization

```
memory/
├── CURRENT_STATE_v2.md      # 1,500 chars — Active focus
├── ACTIVE_PROJECT_v2.md     # 1,500 chars — Current priority
├── DECISIONS_v2.md          # 1,000 chars — Last 3 decisions
├── LESSONS_v2.md            # 1,000 chars — Last 5 lessons
├── SESSION_LOG_v2.md        # 2,500 chars — Flight recorder
├── BOOTSTRAP_v2.md          # Auto-generated resume state
├── STAGING_INTENT.md        # Write-ahead log (pre-execution)
├── PROJECT_REGISTRY.md      # Auto-generated project inventory
├── OPENCODE_INTEGRATION.md  # OpenCode routing notes
└── ARCHITECTURE_AUDIT_v2.md # Past architectural analysis
```

## Character Limits

| File | Limit | Purpose |
|------|-------|---------|
| CURRENT_STATE_v2.md | 1,500 | Forces focus on active work |
| ACTIVE_PROJECT_v2.md | 1,500 | Only one priority at a time |
| DECISIONS_v2.md | 1,000 | Rolling window of last 3 |
| LESSONS_v2.md | 1,000 | Rolling window of last 5 |
| SESSION_LOG_v2.md | 2,500 | Compact but complete |
| STAGING_INTENT.md | ~3,000 | Pre-execution plan |

## Session Continuity Protocol

1. Before multi-step execution → write to STAGING_INTENT.md
2. Log progress incrementally in SESSION_LOG_v2.md
3. Run continuity_bootstrap_v2.py to refresh boot state
4. On completion → update STAGING_INTENT.md to "Completed"
5. Run character_limiter.py to verify budgets

## Tool Usage

- `tools/character_limiter.py` validates all file sizes
- `tools/continuity_bootstrap_v2.py` compiles resume state
- `tools/memory_compactor.py` deterministically compacts logs
- `tools/memory_promoter.py` promotes important patterns

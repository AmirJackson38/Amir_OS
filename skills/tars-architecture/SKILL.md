---
name: tars-architecture
description: TARS project structure, boot precedence, agent rules, and architectural conventions
when_to_use: "When understanding the TARS/Amir OS project structure, boot sequence, agent configuration, or architectural decisions"
allowed_tools: Read, Grep, Glob, Bash
version: 1.0.0
requires_skills: []
references:
  - AGENT_RULES.md
  - BOOT_PRECEDENCE.md
  - Boot.md
  - memory/ARCHITECTURE_AUDIT_v2.md
---

# TARS Architecture Skill

## Project Structure

```
Amir_OS/
├── AGENT_RULES.md           # 10 universal operating principles
├── BOOT_PRECEDENCE.md       # 6-level agent loading hierarchy
├── Boot.md                  # 8-step startup sequence
├── version.md               # Current milestone (v0.9.0)
├── .agents/
│   └── AGENTS_GLOBAL.md     # "Coldest Engineer" persona
├── identity/                # COACH_MODE.md + PROFILE.md
├── goals/                   # Long-term priorities
├── learning/                # Skills tracker
├── memory/                  # v2 files with char limits
├── projects/                # Active project directories
├── skills/                  # Progressive-load skill modules
├── workflows/               # Structured procedure definitions
├── tools/                   # Python utilities
└── docs/                    # CHANGELOG, network docs
```

## Agent Loading Order

1. Local project AGENTS.md (if exists)
2. AGENT_RULES.md (universal rules — always wins)
3. AGENTS_GLOBAL.md (personality layer)
4. identity/ (coach mode + profile)
5. Context files (version, CURRENT_STATE, ACTIVE_PROJECT, SESSION_LOG, PROJECT_REGISTRY)
6. Historical context (on-demand: DECISIONS, LESSONS, BOOTSTRAP)

## Key Principles

- **Teach, don't only solve** — prioritize understanding
- **Preserve simplicity** — question every addition
- **Protect focus** — capture ideas, don't pursue them immediately
- **Manage context efficiently** — load only what's needed

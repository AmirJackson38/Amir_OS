---
name: verify
description: Check changed behavior and report precise evidence
version: 1.0.0
requires_skills: []
requires_tools: [health_check]
---

# Verify

1. Inspect the diff and preserve unrelated user changes.
2. Run checks appropriate to changed behavior; include regression cases for memory-loss repairs.
3. Run tools/health_check.py for repository diagnostics when relevant. It is not a runtime health check.
4. For memory tooling, verify original records remain unchanged and generated views meet their budget.
5. Verify links and state declarations when changing documentation.
6. Before committing, run tools/check_staged_files.mjs and git diff --cached --check.
7. State what passed, what was not checked, and the next action.

Production, physical hardware, and learning mastery require their own evidence.

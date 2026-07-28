---
name: verify
description: Validate that changes are correct, complete, and safe
version: 1.0.0
requires_skills: [tars-memory, tars-architecture]
requires_tools: [health_check, character_limiter]
---

# Workflow: Verify

## When to Use

- After completing a build or fix
- Before committing changes
- Before deployment
- When checking system health

## Steps

1. **Syntax check** — Verify language syntax (braces, parens, brackets balanced).
2. **Run tests** — Execute any existing test suite.
3. **Check memory limits** — Run character_limiter.py.
4. **Run health check** — Execute health_check.py for system diagnostics.
5. **Review diff** — Inspect git diff for unintended changes.
6. **Check dependencies** — Verify all referenced files and skills exist.
7. **Report** — Summarize what was verified and the results.

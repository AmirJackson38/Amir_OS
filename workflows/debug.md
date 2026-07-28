---
name: debug
description: Systematically diagnose and fix bugs or unexpected behavior
version: 1.0.0
requires_skills: [tars-architecture]
requires_tools: [health_check]
---

# Workflow: Debug

## When to Use

- A feature isn't working as expected
- Errors appear in logs or console
- Behavior is inconsistent
- Performance regression

## Steps

1. **Reproduce** — Understand exactly what happens vs what should happen.
2. **Isolate** — Narrow down to the smallest failing case.
3. **Read relevant code** — Load the affected skill, trace the execution path.
4. **Hypothesize** — Form a theory about the root cause.
5. **Test hypothesis** — Add logging, check state, verify assumption.
6. **Fix** — Apply the minimal change that resolves the issue.
7. **Validate** — Confirm the fix works and doesn't break related functionality.
8. **Document** — If the bug was subtle, save as a lesson.

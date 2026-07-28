---
name: learn
description: Save non-trivial bugs, troubleshooting steps, or insights to permanent memory
version: 1.0.0
requires_skills: [tars-memory]
requires_tools: []
trigger: "/learn"
---

# Workflow: Learn

## When to Use

- A non-trivial bug was solved
- An important troubleshooting technique was discovered
- A significant insight about the system emerged
- An architectural decision was made

## Steps

1. **Capture** — What happened? What was the root cause? How was it fixed?
2. **Condense** — Write a concise lesson (1-3 sentences).
3. **Update LESSONS_v2.md** — Add to the rolling window, archive oldest if needed.
4. **Update DECISIONS_v2.md** — If this was an architectural decision, record it.
5. **Run character_limiter.py** — Verify memory budgets are still respected.

---
name: plan
description: Generate explicit architectural design and edge-case assessment before complex code changes
version: 1.0.0
requires_skills: [tars-architecture, tars-memory]
requires_tools: []
trigger: "/plan"
---

# Workflow: Plan

## When to Use

- Before making complex code changes
- When the approach is unclear
- When multiple solutions exist
- Before modifying core architecture

## Steps

1. **Understand requirements** — Read the request carefully. Ask clarifying questions if ambiguous.
2. **Assess current state** — Read relevant source files, understand existing architecture.
3. **Identify constraints** — Edge cases, security considerations, performance implications.
4. **Design solution** — Architecture sketch, component interactions, data flow.
5. **Present options** — If multiple valid approaches exist, present trade-offs.
6. **Confirm** — Wait for user approval before implementing.

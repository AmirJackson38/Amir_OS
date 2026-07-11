# Decisions Log

## Purpose

This file records important decisions made during the development of Amir OS.

The purpose is to preserve the reasoning behind choices so future AI agents and future versions of myself understand not only what was built, but why it was built.

---

# Decision Format

Important decisions should include:

* Date
* Decision
* Reasoning
* Alternatives considered
* Outcome

---

# Decisions

## Decision: Start With Simple Markdown-Based Memory

Date:
2026-07-11

Decision:

Begin Amir OS memory using Markdown files instead of immediately building a database or advanced AI memory system.

Reasoning:

The foundation needs to be:

* Portable
* Human-readable
* AI-readable
* Version controlled
* Independent from any specific AI provider

Markdown provides a simple foundation that can evolve later.

Alternatives considered:

* Vector databases
* Custom memory databases
* Automated AI memory systems

Outcome:

Start simple and add complexity only when there is a proven need.

---

## Decision: Human Approval Controls Long-Term Memory

Date:
2026-07-11

Decision:

AI can suggest memory updates, but important long-term memory changes require approval.

Reasoning:

The system should preserve accuracy and avoid memory drift.

AI should help organize knowledge, but the user remains the source of truth.

AI may:

* Suggest updates.
* Create summaries.
* Identify important information.

AI should not:

* Silently change goals.
* Store temporary thoughts as permanent facts.
* Override decisions.

Outcome:

Memory remains useful, accurate, and intentional.

---

## Decision: Use Git From The Beginning

Date:
2026-07-11

Decision:

Use Git version control as the foundation for Amir OS.

Reasoning:

The system will evolve through experimentation.

Git provides:

* History tracking.
* Recovery from mistakes.
* Version milestones.
* Change visibility.

Outcome:

Major changes can be preserved and reversed if needed.

---

## Decision: Build Structure Before Automation

Date:
2026-07-11

Decision:

Create the information architecture before building automated AI agents.

Reasoning:

Automation without structure creates complexity.

The order should be:

1. Identity
2. Goals
3. Memory
4. Projects
5. Agent workflows
6. Automation

Outcome:

Future automation will be built on a stable foundation.

---

## Decision: Amir OS Is The Main System

Date:
2026-07-11

Decision:

Amir OS is the larger personal AI operating environment.

Individual projects, including TARS, are components within Amir OS.

Reasoning:

The goal is not to build only one assistant.

The goal is to create a system that supports:

* Learning
* Career growth
* Technical development
* Creativity
* Personal improvement

Outcome:

Projects remain connected instead of becoming isolated systems.

---

# Future Decisions

Future architectural, technical, and workflow decisions should be added here with context and reasoning.

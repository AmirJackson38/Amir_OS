# Active Project

## Purpose

This file identifies the highest-priority current work and provides enough context for quickly resuming progress after interruptions, model changes, or long periods away.

---

# Current Priority

## Project

Amir OS

Status:

Active

---

# Current Objective

Build the foundation of a personal AI-assisted operating environment that can maintain continuity across models, projects, learning, and time.

---

# Current Phase

Phase:

Context Optimization & Resilient Memory Engine

Current milestone:

v0.7.0 Context Optimization & Incremental Memory Checkpointing

---

# Completed Recently

* Created Amir OS folder structure (v0.1.0).
* Added Git version control.
* Created identity framework, defined coaching principles and goals (v0.2.0).
* Created memory foundation, decisions log, and lessons learned (v0.3.0).
* Created learning and project tracking systems (v0.4.0).
* Developed agent boot system and rules (v0.5.0).
* Designed session continuity workflow & flight data recorder (`memory/SESSION_LOG.md`) (v0.6.0).
* Created compiled bootstrap generator (`tools/continuity_bootstrap.py`).
* Implemented deterministic memory compactor (`tools/memory_compactor.py`) with a strict ~2,500-character budget (~625 tokens).
* Integrated OpenCode with local OmniRoute instance — OpenCode now routes through `omniroute/auto/best-chat`.
* Built **My Agent** (`projects/my-agent/`) — lightweight terminal AI client that talks exclusively to OmniRoute.
* Fixed Windows UTF-8 encoding bug in Rich terminal rendering (em dash mojibake).
* Verified end-to-end: OpenCode and My Agent both reach OmniRoute → `claude-web/claude-sonnet-5`.
* Created `memory/OPENCODE_INTEGRATION.md` handoff note for future agents.

---

# Current Work

Next steps:

1. Test My Agent thoroughly — multi-line paste, route switching, conversation persistence.
2. Consider exposing OmniRoute to LAN so TARS Pi and TrueNAS can use it.
3. Integrate deterministic memory compactor and continuity bootstrap into session end routines.
4. Establish continuous 1-line incremental fact checkpointing during long troubleshooting sessions.
5. Design `v0.8.0` Cognitive Observer & User Profile Learner (`tools/profile_observer.py`).
6. Establish next active learning milestones for networking and cybersecurity.

---

# Active Learning Connection

This project is helping develop skills in:

* Documentation.
* System design.
* Version control.
* Information architecture.
* Automation concepts.
* AI workflows.

---

# Important Context

Amir OS is the primary system.

Other projects, including TARS, are components or experiments inside the larger ecosystem.

The purpose is not simply creating an AI assistant.

The purpose is building a system that helps Amir learn, grow, create, and improve.

---

# Next Action

Continue building the Amir OS foundation before adding automation or advanced agent features.

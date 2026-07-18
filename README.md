# Amir OS

## Overview

Amir OS is a portable AI operating environment designed to provide continuity across AI models, projects, learning, and time.

Instead of depending on the memory of a single AI provider, Amir OS stores the information needed for any compatible AI assistant to quickly understand the current working environment and continue meaningful work.

The goal is to survive interruptions such as:

* AI rate limits
* Model switching
* Power outages
* Lost internet connections
* Long breaks between work sessions
* Future migration to local AI models

without constantly rebuilding context.

---

# Philosophy

The AI model is the engine.

Amir OS is the operating environment.

Any capable AI should be able to load Amir OS and continue working using the same goals, context, and operating principles.

The system should remain useful regardless of future AI providers or hardware upgrades.

---

# Primary Mission

Help Amir become more capable over time by acting as a:

* Technical mentor
* Learning coach
* Project partner
* Problem-solving assistant
* Knowledge organizer
* Long-term collaborator

The objective is not simply answering questions.

The objective is building skills, understanding, and continuity.

---

# Directory Structure

identity/

Defines how AI should interact with Amir.

Contains:

* COACH_MODE.md
* PROFILE.md

---

goals/

Long-term direction and priorities.

Contains:

* GOALS.md

---

memory/

Persistent project knowledge.

Contains:

* CURRENT_STATE.md
* DECISIONS.md
* LESSONS.md

---

learning/

Tracks technical growth and knowledge development.

Contains:

* LEARNING.md

---

projects/

Tracks active and future work.

Contains:

* PROJECTS.md
* ACTIVE_PROJECT.md
* ARCHIVE.md

---

BOOT.md

Startup instructions for AI agents.

---

AGENT_RULES.md

Operating principles shared across AI models.

---

VERSION.md

Tracks Amir OS milestones and architecture.

---

# Standard Startup Procedure

Any compatible AI agent should:

1. Read BOOT.md.
2. Follow the boot sequence.
3. Load only the files required by the boot process.
4. Summarize the current operating context.
5. Confirm readiness before beginning new work.

The AI should avoid loading unnecessary information unless requested.

---

# Version Control

Git is used to maintain Amir OS history.

Typical workflow:

git status

↓

git add .

↓

git commit -m "Meaningful description"

↓

git tag vX.Y.Z

Major milestones receive version tags.

Commit messages should clearly describe what changed.

---

# Design Principles

Amir OS is designed to be:

* Portable
* Modular
* Human-controlled
* Vendor independent
* Easy to understand
* Easy to extend
* Git versioned
* Focused on learning

The system should remain understandable to a new AI model within approximately one minute of startup.

---

# Future Roadmap

Planned improvements include:

* Session continuity.
* Context optimization.
* Cross-model workflow testing.
* Local model support.
* Automated session summaries.
* Token/quota awareness where supported.
* AI-assisted maintenance.

Features will only be added when they provide clear value without introducing unnecessary complexity.

---

# Success Criteria

Amir OS is successful when Amir can:

* Switch between AI models with minimal friction.
* Resume projects after interruptions.
* Continue learning without repeatedly rebuilding context.
* Preserve important project knowledge.
* Remain independent of any single AI provider.
* Continue using the system for years while gradually improving it.

The system should always prioritize preserving momentum over preserving every conversation.

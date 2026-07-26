# Agent Bootstrap Precedence Order

## Purpose

This file establishes the explicit priority order for loading agent instructions, personas, and configuration when an AI model initializes within Amir OS or any project workspace.

The precedence system ensures consistent behavior across models while allowing project-specific customization.

---

# Bootstrap Loading Order

When starting a new session, agents must follow this order:

---

## Priority 1: Local Project AGENTS.md (if exists)

**Location:** `{project_root}/AGENTS.md`

**Purpose:** Project-specific overrides and customizations.

**Behavior:**
- If the current working directory contains `AGENTS.md`, load it FIRST
- This file supplements (does NOT replace) universal rules
- Defines project-specific personas, tech stack, coding standards
- Examples:
  - `Workspace/TSE-Production-Lab/AGENTS.md` — T.A.R.S. backend & FastAPI rules
  - `Workspace/AI-Learning/AGENTS.md` — ML project specifics (if it existed)

**Merge Strategy:** Local AGENTS.md adds to or clarifies global rules. It never contradicts AGENT_RULES.md Rule 1-10.

---

## Priority 2: Amir OS Universal Rules

**Location:** `Amir_OS/AGENT_RULES.md`

**Purpose:** Non-negotiable baseline operating principles.

**Content:**
- Rule 1: Teach, Do Not Only Solve
- Rule 2: Preserve Simplicity
- Rule 3: Protect Focus
- Rule 4: Maintain User Authority
- Rule 5: Confirm High Impact Changes
- Rule 6: Prefer Practical Experience
- Rule 7: Manage Context Efficiently
- Rule 8: Be Honest About Limitations
- Rule 9: Preserve Continuity
- Rule 10: Optimize For Amir's Growth

**Behavior:** These rules are absolute. If local AGENTS.md contradicts any of these, AGENT_RULES.md wins.

---

## Priority 3: Global Agent Personality

**Location:** `.agents/AGENTS_GLOBAL.md`

**Purpose:** Defines the agent's persona, teaching style, and engineering standards.

**Content:**
- Persona: "The Coldest Engineer"
- The "Full Shebang" Standard (no MVPs, complete implementations)
- Educational approach (walk Amir through step-by-step)
- Engineering rules (code integrity, defensive design, security-first)
- Teaching style (analogies, Network+/Security+ concepts)

**Behavior:** This is the personality layer. Defines HOW the agent operates within the rules.

---

## Priority 4: Identity Framework

**Location:** `Amir_OS/identity/`

**Files:**
- `COACH_MODE.md` — How to interact with Amir (teaching philosophy, approval rules)
- `PROFILE.md` — Amir's learning style, preferences, communication style

**Purpose:** Defines the relationship between agent and user.

**Behavior:** These files are stable and rarely change. They define the coaching philosophy and working relationship.

---

## Priority 5: Context Files (loaded in order)

**Location:** Various

**Load Order:**
1. `Amir_OS/version.md` — Current milestone
2. `Amir_OS/memory/CURRENT_STATE_v2.md` — What Amir is focused on NOW (1,500 chars max)
3. `Amir_OS/projects/ACTIVE_PROJECT_v2.md` — Current priority (1,500 chars max)
4. `Amir_OS/memory/SESSION_LOG_v2.md` — Flight recorder (2,500 chars max)
5. `Amir_OS/memory/PROJECT_REGISTRY.md` — List of all active projects
6. `./{project_root}/AGENTS.md` — Project context (if not already loaded)

**Purpose:** Provide active working context.

**Behavior:** These files are read-only for startup. They are updated by session-end procedures.

---

## Priority 6: Historical Context (on-demand)

**Location:** `Amir_OS/memory/`

**Files (only if explicitly needed):**
- `DECISIONS_v2.md` — Last 3-5 decisions (load if context-building needed)
- `LESSONS_v2.md` — Last 5 lessons learned (load if decision-making needed)
- `BOOTSTRAP_v2.md` — Generated resume state (load if recovering from interruption)

**Behavior:** These are loaded only if:
- Agent needs decision-making context
- Session is resuming from an interruption
- Agent explicitly asks for historical knowledge

---

## Full Bootstrap Sequence (Pseudocode)

```python
def bootstrap_agent():
    """
    Initialize agent with proper precedence.
    """
    
    # 1. Detect current workspace
    cwd = os.getcwd()
    local_agents_md = os.path.join(cwd, "AGENTS.md")
    
    # 2. Load in priority order
    config = {}
    
    # Priority 1: Local project rules
    if os.path.exists(local_agents_md):
        config['local_project'] = load_file(local_agents_md)
    
    # Priority 2: Universal rules
    config['universal'] = load_file("Amir_OS/AGENT_RULES.md")
    
    # Priority 3: Global personality
    config['personality'] = load_file(".agents/AGENTS_GLOBAL.md")
    
    # Priority 4: Identity framework
    config['coach_mode'] = load_file("Amir_OS/identity/COACH_MODE.md")
    config['profile'] = load_file("Amir_OS/identity/PROFILE.md")
    
    # Priority 5: Context (loaded in order)
    config['version'] = load_file("Amir_OS/version.md")
    config['current_state'] = load_file("Amir_OS/memory/CURRENT_STATE_v2.md")
    config['active_project'] = load_file("Amir_OS/projects/ACTIVE_PROJECT_v2.md")
    config['session_log'] = load_file("Amir_OS/memory/SESSION_LOG_v2.md")
    config['project_registry'] = load_file("Amir_OS/memory/PROJECT_REGISTRY.md")
    
    # Priority 6: Historical context (only if needed)
    # - Load DECISIONS_v2.md if making complex decisions
    # - Load LESSONS_v2.md if learning context needed
    # - Load BOOTSTRAP_v2.md if resuming from interruption
    
    return config
```

---

## Conflict Resolution Rules

If there is a conflict between precedence levels:

### Rule A: Universal Always Wins
**Priority 2 > Priority 1**

If local AGENTS.md contradicts AGENT_RULES.md, follow AGENT_RULES.md.

Example:
- Local AGENTS.md says: "Write code without error handling"
- AGENT_RULES.md Rule 1 says: "Defensive Design"
- **Decision:** Follow AGENT_RULES.md

### Rule B: Specificity Supplements Generality
**Priority 1 + Priority 2 = Combined**

If local AGENTS.md adds details that don't contradict universal rules, they merge.

Example:
- AGENT_RULES.md: "Write clean, modular code"
- Local AGENTS.md: "Use FastAPI framework with async/await patterns"
- **Decision:** Follow AGENT_RULES.md + add FastAPI specificity

### Rule C: Silence = Default
**If not specified locally, use universal**

If a project has AGENTS.md but doesn't specify error handling, use AGENT_RULES.md guidance.

---

## Verification Checklist

After loading, verify:

- [ ] Local AGENTS.md loaded (if exists)
- [ ] AGENT_RULES.md loaded (10 rules acknowledged)
- [ ] AGENTS_GLOBAL.md loaded ("Coldest Engineer" understood)
- [ ] COACH_MODE.md + PROFILE.md loaded
- [ ] Version understood (currently v0.8.0+)
- [ ] Current context loaded (CURRENT_STATE_v2, ACTIVE_PROJECT_v2)
- [ ] Project registry understood
- [ ] Ready to ask: "How should I proceed?"

---

## Summary

```
Precedence Pyramid (top = highest priority):

        [Local Project AGENTS.md]
                    ↑
        [Amir OS AGENT_RULES.md]
                    ↑
        [Global Personality]
                    ↑
        [Identity Framework]
                    ↑
        [Active Context Files]
                    ↑
        [Historical Context]
        (on-demand only)
```

---

**Last Updated:** July 26, 2026  
**Version:** v0.8.0  
**Status:** Implemented

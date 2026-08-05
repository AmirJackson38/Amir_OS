---
name: boot-precedence
description: Explicit priority order for loading agent instructions, personas, and configuration
version: 1.0.0
requires_skills: [tars-architecture]
requires_tools: []
priority: core
---

# Agent Bootstrap Precedence Order

## Purpose

This file establishes the explicit priority order for loading agent instructions, personas, and configuration when an AI model initializes within Amir OS or any project workspace.

The precedence system ensures consistent behavior across models while allowing project-specific customization.

---

# Bootstrap Loading Order

When starting a new session, agents must follow this order:

---

## Operational Truth Authority Order

Instruction/personality files still govern behavior, but project state and version truth must be established in this order:

1. `Amir_OS/HEAD.md` — operational entry point and current truth pointer.
2. Documents referenced by `HEAD.md` — release state, roadmap reconciliation, architecture, known issues, and version policy.
3. Git history — verify live state with commands such as `git rev-parse HEAD`, `git status --short --branch`, `git log --oneline --decorate -20`, and relevant tags.
4. Historical memory files — `memory/*`, `projects/ACTIVE_PROJECT*`, old bootstraps, and session logs are context only.

Older memory/current-state files are not authoritative when they conflict with root `HEAD.md`, release tags, or verified Git/runtime state.

Agents should run `node tools/agent_bootstrap.mjs` to generate a compact live-state packet before acting.

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
1. `Amir_OS/HEAD.md` — Current operational truth and navigation
2. Documents referenced by `HEAD.md` — Release state, roadmap reconciliation, architecture, known issues, version policy
3. Git history — Live branch/HEAD/tags must be verified directly
4. `Amir_OS/version.md` — Amir OS platform version only; not TARS runtime release truth
5. `Amir_OS/memory/CURRENT_STATE_v2.md` — Historical/current-context memory, not authority
6. `Amir_OS/projects/ACTIVE_PROJECT_v2.md` — Historical active-project memory, not authority
7. `Amir_OS/memory/SESSION_LOG_v2.md` — Flight recorder/history
8. `Amir_OS/memory/PROJECT_REGISTRY.md` — Project inventory
9. `./{project_root}/AGENTS.md` — Project context (if not already loaded)

**Purpose:** Provide active working context.

**Behavior:** `HEAD.md` and verified Git/runtime state are authoritative. Older memory/current-state files are read-only startup context and may lag behind active development.

---

## Priority 6: Skills (loaded on-demand when task domain matches)

**Location:** `Amir_OS/skills/<skill-name>/SKILL.md`

**Purpose:** Specialized knowledge modules loaded only when relevant.

**Files:**
- `skills/tars-architecture/SKILL.md` — Project structure, boot precedence, agent rules
- `skills/tars-memory/SKILL.md` — Memory organization, session continuity, char limits
- `skills/tars-frontend/SKILL.md` — Three.js, avatar, animation pipeline
- `skills/tars-world-engine/SKILL.md` — Needs system, scoring, autonomy, persistence

**Behavior:** Skills use progressive loading via `when_to_use` frontmatter field. An agent should:
1. Check the task domain against each skill's `when_to_use` description
2. Load only matching skills (not all skills)
3. Load skill dependencies listed in `requires_skills` if those skills are needed
4. Never load all skills into context — this defeats the purpose

---

## Priority 7: Workflows (loaded on-demand when triggered)

**Location:** `Amir_OS/workflows/<name>.md`

**Purpose:** Structured procedures for common tasks, triggered by slash commands or explicit request.

**Files:**
- `workflows/plan.md` — `/plan`: Architectural design before complex changes
- `workflows/build.md` — Feature implementation
- `workflows/debug.md` — Systematic bug diagnosis
- `workflows/verify.md` — Validation after changes
- `workflows/research.md` — Codebase exploration
- `workflows/grill-me.md` — `/grill-me`: Targeted engineering questions
- `workflows/learn.md` — `/learn`: Save insights to memory
- `workflows/deploy.md` — Deployment procedures

**Behavior:** Workflows are loaded only when the corresponding workflow is triggered (e.g., `/plan` loads `workflows/plan.md`). They declare required skills in their `requires_skills` frontmatter; those skills should be loaded as part of the workflow.

---

## Priority 8: Historical Context (on-demand)

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
    
    # Priority 5: Operational truth/context (loaded in order)
    config['head'] = load_file("Amir_OS/HEAD.md")
    config['head_references'] = load_referenced_docs(config['head'])
    config['git_state'] = run_read_only_git_checks([
        "git rev-parse HEAD",
        "git status --short --branch",
        "git log --oneline --decorate -20",
    ])
    config['version'] = load_file("Amir_OS/version.md")
    config['current_state_history'] = load_file("Amir_OS/memory/CURRENT_STATE_v2.md")
    config['active_project_history'] = load_file("Amir_OS/projects/ACTIVE_PROJECT_v2.md")
    config['session_log'] = load_file("Amir_OS/memory/SESSION_LOG_v2.md")
    config['project_registry'] = load_file("Amir_OS/memory/PROJECT_REGISTRY.md")
    
    # Priority 6: Skills (loaded on-demand based on task domain)
    # - Load skills matching the task (check when_to_use frontmatter)
    # - Only load relevant skills, never all skills
    
    # Priority 7: Workflows (loaded on-demand when triggered)
    # - Load workflow definition when /plan, /grill-me, /learn, etc. is triggered
    
    # Priority 8: Historical context (only if needed)
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
- [ ] Root HEAD.md loaded first for operational truth
- [ ] Documents referenced by HEAD.md loaded as needed
- [ ] Git HEAD/branch/tags verified directly
- [ ] Version understood as Amir OS platform version, not TARS release truth
- [ ] Historical context loaded only after HEAD.md (CURRENT_STATE_v2, ACTIVE_PROJECT_v2)
- [ ] Project registry understood
- [ ] Skills directory aware (loaded on-demand via when_to_use)
- [ ] Workflows directory aware (triggered via slash commands)
- [ ] manifest.json knows about all components
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
        [HEAD.md + Verified Git/Runtime State]
                    ↑
        [Skills — loaded on-demand]
                    ↑
        [Workflows — loaded on-demand]
                    ↑
        [Historical Context]
        (on-demand only)
```

---

**Last Updated:** July 26, 2026  
**Version:** v0.8.0  
**Status:** Implemented

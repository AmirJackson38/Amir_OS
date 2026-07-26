# Amir OS Architecture Audit & Consolidation Plan
> **Date:** July 26, 2026  
> **Status:** Analysis & Proposal (No Changes Made Yet)  
> **Scope:** Memory files, Agent boot files, consolidation strategy

---

## Executive Summary

Amir OS has **strong foundational architecture** (v0.7.0) with critical systems in place:
- ✅ Boot sequence (Boot.md → AGENT_RULES.md → identity → memory → projects)
- ✅ Session continuity (SESSION_LOG.md + continuity_bootstrap.py)
- ✅ Memory compaction (memory_compactor.py with 2,500 char budget)
- ✅ Character-driven memory scarcity (forces agent intelligence)

**Current problems identified:**
- ❌ TSE-Production-Lab not documented in CURRENT_STATE.md or ACTIVE_PROJECT.md
- ❌ Scattered AGENTS.md files: `/.agents/`, `/Workspace/TSE-Production-Lab/`, `/Workspace/TSE-Production-Lab/GEMINI.md`
- ❌ No clear bootstrap precedence rules (local project AGENTS.md vs. global AGENT_RULES.md)
- ❌ Memory files lack hard constraints (character limits not enforced, only suggested)
- ❌ No mechanism to detect new projects and auto-document them

---

## Current Architecture Map

### Universal/Central (Amir_OS folder)
```
Amir_OS/
├── Boot.md                          # Startup sequence (7 steps)
├── AGENT_RULES.md                   # Universal agent operating principles
├── version.md                        # Current milestone & capabilities
├── identity/
│   ├── COACH_MODE.md               # How AI should interact (262 lines)
│   └── PROFILE.md                   # Amir's learning style (116 lines)
├── goals/
│   └── GOALS.md                     # Career & technical learning goals
├── learning/
│   └── LEARNING.md                  # Skills tracker & learning progress
├── memory/
│   ├── CURRENT_STATE.md            # What Amir is focused on NOW (50 lines, ~2,500 chars)
│   ├── ACTIVE_PROJECT.md           # Current priority project (99 lines)
│   ├── DECISIONS.md                # Why decisions were made (177 lines)
│   ├── LESSONS.md                  # Knowledge from experience (153 lines)
│   ├── SESSION_LOG.md              # Flight recorder (~5,000 chars, compactable to 2,500)
│   ├── BOOTSTRAP.md                # Generated resume state (auto-compiled)
│   └── ARCHITECTURE_AUDIT_v2.md    # [NEW - THIS FILE]
├── projects/
│   ├── PROJECTS.md                 # Overview of all projects
│   ├── ACTIVE_PROJECT.md           # Duplicate of memory/ACTIVE_PROJECT.md?
│   ├── ARCHIVE.md                  # Completed projects
│   └── my-agent/                   # Side project (v1.1.0)
├── tools/
│   ├── continuity_bootstrap.py      # State compiler (170 lines)
│   ├── memory_compactor.py          # Deterministic compactor (120 lines, 2,500 char budget)
│   ├── model_router.py              # OmniRoute client
│   ├── boot_terminal_chooser.ps1    # Interactive terminal menu
│   ├── start_omni.ps1               # OmniRoute launcher
│   └── register_boot_tasks.ps1      # Task Scheduler registration
└── docs/
    └── home-lab-network.md          # Infrastructure documentation
```

### Project-Specific (TSE-Production-Lab)
```
Workspace/TSE-Production-Lab/
├── AGENTS.md                        # Project-specific instructions (16 lines)
├── GEMINI.md                        # TARS context & tech stack (91 lines)
├── docker-compose.yml               # Docker services
├── backend/
│   ├── main.py                      # FastAPI app (v1.2.2)
│   ├── requirements.txt
│   └── tars_backend_main_v1.2.2.py  # Versioned backup
└── frontend/
    └── [React files]
```

### Legacy/Scattered
```
.agents/AGENTS.md                   # "Coldest Engineer" persona (36 lines)
                                    # DUPLICATE of .agents/AGENTS.md concept
                                    # But DIFFERENT from Amir_OS/AGENT_RULES.md
```

---

## Specific Issues Identified

### Issue 1: Memory Files Incomplete
**Problem:** TSE-Production-Lab (TARS Pi, FastAPI, PostgreSQL, v1.2.2 backend) is NOT mentioned in:
- `CURRENT_STATE.md` - Only lists: Amir OS, Home Lab, My Agent
- `ACTIVE_PROJECT.md` - Only lists: Amir OS
- `PROJECTS.md` - Lists as "Side project" without details

**Impact:** New agents don't know TSE-Production-Lab exists or how critical it is.

**Solution:** Create v2 versions that explicitly include:
- TARS deployment status
- FastAPI backend location & version
- PostgreSQL container details
- Integration with Amir OS ecosystem

---

### Issue 2: Scattered Agent Boot Files
**Problem:** Three separate "agent personality" files exist:
1. `.agents/AGENTS.md` - "Coldest Engineer" persona with "Full Shebang" standard
2. `Amir_OS/AGENT_RULES.md` - Universal operating principles
3. `Workspace/TSE-Production-Lab/AGENTS.md` - Project-specific overrides

**Confusion:** Which takes precedence? Should all be merged? Should TSE have its own persona?

**Current behavior:** Unclear. System appears to work but relies on implicit knowledge.

---

### Issue 3: No Bootstrap Precedence Rules
**Problem:** Boot.md says "Load AGENT_RULES.md" but doesn't specify:
- What if a project folder also has AGENTS.md?
- Do they merge or override?
- What's the load order?

**Impact:** Inconsistent behavior across projects.

---

### Issue 4: Memory Character Limits Not Enforced
**Problem:** 
- `memory_compactor.py` has a 2,500 char budget for SESSION_LOG.md
- But CURRENT_STATE.md, ACTIVE_PROJECT.md, DECISIONS.md have NO hard limits
- Files can grow without constraint, increasing token usage

**Why this matters:** Hard caps force intelligent prioritization. Soft limits encourage bloat.

**Example:** ACTIVE_PROJECT.md is 99 lines (~3,200 chars). Should be ~1,500 chars.

---

### Issue 5: No Project Auto-Discovery
**Problem:** New projects like TSE-Production-Lab are manually added to memory.
- When Amir starts a new project, there's no system to auto-document it
- Requires manual updates to CURRENT_STATE.md, PROJECTS.md, etc.
- Creates gaps (like we just discovered with TARS)

---

## Proposed v2 Architecture

### Goal
- 🎯 **Centralize universal rules** (one authoritative AGENT_RULES.md)
- 🎯 **Clear project override pattern** (local AGENTS.md supplements, doesn't replace)
- 🎯 **Hard character limits** (enforced via Python scripts, suggested in docs)
- 🎯 **Complete project documentation** (TSE-Production-Lab added to memory)
- 🎯 **Bootstrap clarity** (explicit precedence rules in Boot.md)

### File Structure (v2)

```
Amir_OS/
├── Boot.md                           # [UPDATED] Add bootstrap precedence rules
├── AGENT_RULES.md                    # [KEEP] Universal rules (no consolidation needed)
├── BOOT_PRECEDENCE.md               # [NEW] Explicit priority order for agent loading
├── memory/
│   ├── CURRENT_STATE_v2.md          # [NEW] Compressed to 1,500 chars max
│   ├── ACTIVE_PROJECT_v2.md         # [NEW] Compressed to 1,500 chars max
│   ├── DECISIONS_v2.md              # [NEW] Compressed to 1,000 chars max
│   ├── LESSONS_v2.md                # [NEW] Compressed to 1,000 chars max
│   ├── SESSION_LOG_v2.md            # [NEW] Explicitly compacted to 2,500 chars
│   ├── BOOTSTRAP_v2.md              # [NEW] Generated by updated bootstrap script
│   └── PROJECT_REGISTRY.md          # [NEW] Auto-generated list of all projects
├── .agents/
│   └── AGENTS_GLOBAL.md             # [RENAMED] "Coldest Engineer" → global persona
└── tools/
    ├── continuity_bootstrap_v2.py    # [NEW] Enhanced with hard caps
    ├── memory_compactor_v2.py        # [NEW] Enforces limits across all files
    ├── project_autodiscovery.py      # [NEW] Scans workspace for new projects
    └── character_limiter.py          # [NEW] Validates memory files against hard limits
```

---

## Key Changes in v2

### 1. Boot Precedence Rules (BOOT_PRECEDENCE.md)
```markdown
# Agent Boot Priority Order

When initializing in any workspace:

**Priority 1 (Highest):** Current project's local AGENTS.md (if exists)
↓ Supplements with project-specific overrides
↓ Does NOT replace global rules

**Priority 2:** Amir_OS/AGENT_RULES.md (universal principles)
↓ These are non-negotiable baseline rules

**Priority 3:** .agents/AGENTS_GLOBAL.md (personality & persona)
↓ "Coldest Engineer" instructions
↓ Teaching style

**Priority 4:** identity/ files (COACH_MODE.md, PROFILE.md)
↓ How to interact with Amir

**Result:** Merged personality loaded, ready to work
```

### 2. Hard Character Limits (v2 files)

| File | Current | v2 Limit | Tokens Saved | Logic |
|------|---------|----------|--------------|-------|
| CURRENT_STATE_v2.md | ~2,500 chars | 1,500 chars | ~250 | Only: Active focus, learning areas, next action |
| ACTIVE_PROJECT_v2.md | ~3,200 chars | 1,500 chars | ~425 | Only: Current objective, last progress, next step |
| DECISIONS_v2.md | ~4,500 chars | 1,000 chars | ~875 | Only: Last 3 decisions + reasoning (oldest purged) |
| LESSONS_v2.md | ~4,200 chars | 1,000 chars | ~800 | Only: Last 5 lessons (oldest archived) |
| SESSION_LOG_v2.md | ~5,000 chars | 2,500 chars | ~625 | Existing compactor, more aggressive |
| **TOTAL SAVINGS** | | | **~3,000 tokens** per session | 15-20% of typical context window |

### 3. PROJECT_REGISTRY.md (NEW)
Auto-generated by `project_autodiscovery.py`, lists:
```markdown
# Active Projects Registry

| Project | Location | Status | Type | Last Updated |
|---------|----------|--------|------|--------------|
| Amir OS | Amir_OS/ | Active | System | 2026-07-26 |
| TSE-Production-Lab | Workspace/TSE-Production-Lab/ | Active | Agent/Backend | 2026-07-26 |
| Home Lab | docs/home-lab-network.md | Active | Infrastructure | 2026-07-23 |
| My Agent | Amir_OS/projects/my-agent/ | Active | Tool | 2026-07-24 |
```

### 4. character_limiter.py (NEW)
Validates on every session end:
```python
FILES_WITH_LIMITS = {
    'memory/CURRENT_STATE_v2.md': 1500,
    'memory/ACTIVE_PROJECT_v2.md': 1500,
    'memory/DECISIONS_v2.md': 1000,
    'memory/LESSONS_v2.md': 1000,
    'memory/SESSION_LOG_v2.md': 2500,
}

# If any file exceeds limit, triggers compaction
# Reports: "File X is 2,100 chars. Limit: 1,500. Over by 600 chars."
```

### 5. Updated continuity_bootstrap_v2.py
- Loads v2 files instead of originals
- Respects hard character limits
- Includes PROJECT_REGISTRY in bootstrap
- Reports character usage efficiency

---

## Consolidation Strategy (No Data Loss)

### Keep Everything (v1 files):
```
memory/CURRENT_STATE.md           # Original (archived)
memory/ACTIVE_PROJECT.md          # Original (archived)
memory/DECISIONS.md               # Original (archived)
memory/LESSONS.md                 # Original (archived)
memory/SESSION_LOG.md             # Original (archived)
.agents/AGENTS.md                 # Original (archived)
Workspace/TSE-Production-Lab/AGENTS.md    # Original (stays local)
```

### Create v2 Equivalents:
```
memory/CURRENT_STATE_v2.md        # NEW - compressed, with TSE-Production-Lab
memory/ACTIVE_PROJECT_v2.md       # NEW - compressed, with all projects listed
memory/DECISIONS_v2.md            # NEW - compressed, rolling window (last 3)
memory/LESSONS_v2.md              # NEW - compressed, rolling window (last 5)
memory/SESSION_LOG_v2.md          # NEW - aggressively compacted
```

### New Tools:
```
tools/continuity_bootstrap_v2.py  # Enhanced, respects hard limits
tools/memory_compactor_v2.py      # Same as v1, uses v2 files
tools/project_autodiscovery.py    # Scans workspace for new projects
tools/character_limiter.py        # Validates hard character limits
```

### Git Commit:
```bash
git add memory/*_v2.md tools/*_v2.py tools/project_autodiscovery.py tools/character_limiter.py BOOT_PRECEDENCE.md
git commit -m "v0.8.0 Memory Architecture Consolidation & Hard Limits

- Add hard character limits to all memory files (1,500-2,500 chars)
- Create v2 memory files with enforced constraints
- Add BOOT_PRECEDENCE.md for explicit agent loading order
- Include TSE-Production-Lab in CURRENT_STATE_v2.md and ACTIVE_PROJECT_v2.md
- Add PROJECT_REGISTRY.md for auto-discovered projects
- Create character_limiter.py to enforce hard limits
- Create project_autodiscovery.py to detect new projects

This consolidation reduces token usage by ~3,000 tokens per session (15-20%)
while maintaining all historical context in v1 files.

Co-authored-by: Claude <claude@anthropic.com>"
```

---

## Implementation Checklist

- [ ] **Step 1:** Create BOOT_PRECEDENCE.md
- [ ] **Step 2:** Create CURRENT_STATE_v2.md (with TSE-Production-Lab)
- [ ] **Step 3:** Create ACTIVE_PROJECT_v2.md
- [ ] **Step 4:** Create DECISIONS_v2.md (rolling window)
- [ ] **Step 5:** Create LESSONS_v2.md (rolling window)
- [ ] **Step 6:** Create SESSION_LOG_v2.md
- [ ] **Step 7:** Create PROJECT_REGISTRY.md
- [ ] **Step 8:** Create character_limiter.py
- [ ] **Step 9:** Create project_autodiscovery.py
- [ ] **Step 10:** Create continuity_bootstrap_v2.py
- [ ] **Step 11:** Update Boot.md with precedence rules
- [ ] **Step 12:** Verify all v1 files still exist (nothing deleted)
- [ ] **Step 13:** Git commit with "v0.8.0 Memory Architecture Consolidation"
- [ ] **Step 14:** Update version.md to v0.8.0
- [ ] **Step 15:** Test bootstrap with new files

---

## Why This Works (Claude Advantage)

### 1. **Character Limits Force Intelligence**
- Agents can't be lazy with memory
- Every file forces prioritization
- Results in smarter, more focused context

### 2. **Rolling Windows Preserve Knowledge**
- Keep last 3 decisions (not all 20+)
- Keep last 5 lessons (not all 30+)
- Oldest naturally archived, newest preserved
- New agents see the **recent, relevant** thinking

### 3. **Project Auto-Discovery**
- No more gaps like TSE-Production-Lab being undocumented
- PROJECT_REGISTRY auto-updated
- Future agents immediately know what exists

### 4. **Explicit Bootstrap Order**
- No ambiguity about which AGENTS.md applies
- Local project rules supplement, not replace
- Consistent behavior across all projects

### 5. **Token Efficiency**
- ~3,000 tokens saved per session
- Scales better as Amir_OS grows
- More context for actual work, less for metadata

### 6. **Future-Proof Architecture**
- Works with any AI model (local, cloud, future)
- Vendor independent (no API-specific memory)
- Handles context window limits gracefully

---

## Questions for Amir Before Implementation

1. **Rolling window sizes:** Should DECISIONS keep last 3 or 5? LESSONS keep last 5 or 10?
2. **Character limit adjustments:** Are 1,500/1,000/2,500 char limits reasonable, or should they be different?
3. **Project auto-discovery frequency:** Should `project_autodiscovery.py` run on every session end, or on-demand?
4. **v1 archival:** Should v1 files be moved to `memory/archive/v1/` or left in place?
5. **Bootstrap switching:** Should agents use v2 files by default, or offer a choice initially?

---

**Ready to proceed with implementation?**

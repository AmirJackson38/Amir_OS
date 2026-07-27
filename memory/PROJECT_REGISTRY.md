# Project Registry (Auto-Generated)

**Last Updated:** 2026-07-27 00:19:05 UTC  
**Status:** Active registry  
**Purpose:** Consolidated inventory of all active, paused, and archived projects

---

## Active Projects

| Project | Location | Type | Status | Git | Purpose |
|---------|----------|------|--------|-----|---------|
| **my-agent** | `projects\my-agent/` | Python | Active | ❌ | Terminal AI client (v1.1.0). Python + Rich TUI. Talks to OmniRoute. |

---

## Paused Projects

| Project | Location | Type | Status | Notes |
|---------|----------|------|--------|-------|
| (None currently) | — | — | — | — |

---

## Archived Projects

| Project | Location | Type | Status | Archived | Notes |
|---------|----------|------|--------|----------|-------|
| (None currently) | — | — | — | — | — |

---

## Newly Discovered Projects

(No new projects detected)

---

## Project Dependencies

```
Amir OS (Core System)
├── Supports My Agent (terminal client tool)
├── Manages Home Lab (infrastructure docs)
└── Provides context for TSE-Production-Lab (T.A.R.S. backend)

TSE-Production-Lab (T.A.R.S.)
├── Runs on TARS Raspberry Pi (part of Home Lab)
└── Uses Amir OS for continuity/memory

Home Lab (Infrastructure)
├── Hosts TARS Pi
├── Hosts TrueNAS
└── Uses Amir OS for documentation
```

---

## Adding New Projects

When starting a new project:

1. Create project folder in `Workspace/` or `Amir_OS/projects/`
2. Create local `AGENTS.md` if project-specific rules needed
3. Run `tools/project_autodiscovery.py` to auto-update registry
4. Update `CURRENT_STATE_v2.md` if it becomes active priority

---

## Project Statistics

- **Total Projects:** 1 discovered, 1 known, 0 new
- **Primary System:** Amir OS (v0.8.0)
- **Distributed Infrastructure:** Home Lab
- **Key Deployment:** TSE-Production-Lab / T.A.R.S.

---

**See also:** `CURRENT_STATE_v2.md`, `ACTIVE_PROJECT_v2.md`, `BOOTSTRAP_v2.md`

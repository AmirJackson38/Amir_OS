# Project Registry (Auto-Generated)

**Last Updated:** 2026-08-04 02:20:00 UTC  
**Status:** Active registry  
**Purpose:** Consolidated inventory of all active, paused, and archived projects

---

## Active Projects

| Project | Location | Type | Status | Git | Purpose |
|---------|----------|------|--------|-----|---------|
| **tars-face** | `projects/tars-face/` | Three.js + Node runtime | Active — **deployed** (Phase 9.5 done) | ✅ | TARS face/autonomy/world engine. Running as `tars_backend` on Pi `tars` `:8080` (image `tars-backend:1.0.0`, `tars_net` bridge, `unless-stopped`). Kiosk appliance live (Phase 9.4) + touch play verified (Phase 9.5). Next: play loop refinement, ambient awareness, LLM layer. |
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

| Project | Location | Type | Action |
|---------|----------|------|--------|
| (none) | — | — | — |

---

## Project Dependencies

```
Amir OS (Core System)
├── Supports My Agent (terminal client tool)
├── Manages Home Lab (infrastructure docs)
└── Provides context for TSE-Production-Lab (T.A.R.S. backend)

TARS Face (projects/tars-face)
├── Runs as tars_backend on TARS Raspberry Pi (Phase 9.2 deployed)
└── Uses Amir OS for continuity/memory

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

- **Total Projects:** 2 active (tars-face, my-agent), 2 known (TSE, Home Lab)
- **Primary System:** Amir OS (v0.9.0)
- **Distributed Infrastructure:** Home Lab
- **Key Deployment:** TARS Face → `tars_backend` on Pi `:8080` (Phase 9.2–9.5); TSE-Production-Lab / T.A.R.S.

---

**See also:** `CURRENT_STATE_v2.md`, `ACTIVE_PROJECT_v2.md`, `BOOTSTRAP_v2.md`

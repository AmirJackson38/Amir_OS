# Current State

## Last Updated

Date: July 24, 2026
Version: v1.1.0

---

# Current Focus

Current primary focus:

Building a strong technical foundation for advancing into Technical Support Engineer / Customer Support Engineer roles.

Current learning areas:

* Networking fundamentals
* Linux
* Docker
* APIs
* Security fundamentals
* Troubleshooting methodology

---

# Active Projects

## Amir OS

Status:
Active

Purpose:
Build a persistent AI-assisted operating environment that maintains continuity across models, projects, learning, and time.

Current milestone:
v1.1.0 My Agent Agent Runtime Complete

Next milestone:
Local model integration for tool execution

---

## Home Lab

Status:
Active

Purpose:
Use Raspberry Pi, networking equipment, Docker, and services to build practical infrastructure experience.

---

## TARS

Status:
Side project

Purpose:
Explore building a personal AI assistant system.

Important:
TARS is a project inside the larger Amir OS ecosystem, not the main objective.

---

## My Agent

Status:
Active (v1.1.0)

Purpose:
Terminal AI client with full agent runtime. Talks to OmniRoute at `http://localhost:20128/v1`. Built with Python + Rich TUI.

Capabilities:
- 14 built-in tools (8 filesystem/shell/search + 4 meta-tooling + 2 audit)
- Tool registry with runtime tool creation (`register_tool`, `update_tool`, `delete_tool`)
- System auditor: 6 checks (OmniRoute, config, memory freshness, git, custom tools, disk)
- ReAct agent loop with up to 10 iterations
- 3-layer tool dispatch: pre-fetch boot context → native OpenAI `tools` → text `TOOL_CALL:` fallback
- Per-tool permission prompts (y/N/a/s)
- Diagnostics log + session stats
- SQLite conversation persistence
- Boot identity injection (7.4K system prompt with condensed profile, goals, rules, state)
- Custom tools persist across restarts (`~/.myagent/custom_tools/`)

Known blocker:
- OmniRoute strips `tools` parameter from outbound API calls. Both Kimi and Claude ignore the tool system through OmniRoute. Tools work locally in the My Agent process but no model reached through OmniRoute will call them. Requires local/CLI-native model for tool execution.

---

## OmniRoute

Status:
Active — running on local ThinkPad

Purpose:
Local OpenAI-compatible AI routing gateway (`http://localhost:20128/v1`). 227 routes.

Notable:
- `auto/*` routes all resolve to kimi-web/k2d6 — virtual combos, not direct
- Direct routes like `claude-web/claude-sonnet-5`, `kr/claude-sonnet-5`, `cw/claude-sonnet-5` work but strip `tools` parameter
- Source of UTF-8 mojibake in streamed responses
- kimi-web backend leaked `.agent-gw.json` config during probing (documented)

---

## OpenCode Integration

Status:
Active

Note:
OpenCode configured with `omniroute/auto/best-chat` as default model. Config at `C:\Users\Admin\.config\opencode\opencode.jsonc`. Auth at `C:\Users\Admin\.local\share\opencode\auth.json`.

---

# Current Learning Progress

## Networking

Current level:
Building foundation

Hands-on experience:

* Home network configuration
* Omada router
* Raspberry Pi networking
* Docker networking

---

## Programming

Current level:
Beginner / developing

Experience:

* Python basics
* FastAPI experimentation
* APIs
* Databases

---

## Infrastructure

Experience:

* Docker
* Linux environments
* Home lab systems
* Servers

---

# Immediate Next Actions

1. Run a local LLM (Ollama, LM Studio) through OmniRoute — test if local models respect the `tools` parameter or `TOOL_CALL:` text protocol
2. If local model works, the full tool system is validated: file edits, shell, git, search, meta-tooling, audit all functional
3. If not, consider bypassing OmniRoute entirely for tool-capable operations
4. Continue with Networking (DNS, DHCP, Subnetting) and Security+ hands-on studies in the home lab

---

# Memory Management Rules

Memory is human-approved.

The AI should:

- Review current memory before beginning significant work.
- Suggest updates when important information changes.
- Ask for approval before modifying long-term memory.
- Avoid saving temporary thoughts as permanent facts.

The goal is maintaining accurate continuity, not storing everything.
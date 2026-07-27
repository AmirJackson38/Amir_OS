# T.A.R.S. & Amir OS — System Architecture & Backup Context (v0.9.0 Sync)
> **Generated:** July 26, 2026  
> **Target Audience:** External Backup LLM (ChatGPT / OpenAI)  
> **Author:** Antigravity AI Engineering Assistant & Amir Jackson  
> **Status:** Production Release v0.9.0 — Active & Clean  

---

## 1. Executive Summary & Persona Context

Amir is an indie rapper, system builder, and home lab engineer studying for his CompTIA Network+ and Security+ certifications.

**The Vision:**
Amir OS is the personal AI operating environment and cognitive blueprint for **T.A.R.S.**—a hybrid online/offline autonomous AI assistant running on a Raspberry Pi 4 (TARS Pi) with a terminal client (`my-agent`) and a dedicated physical display ("The Face").

---

## 2. Recent Major Architectural Upgrades (v0.8.0 ➡️ v0.9.0)

Today, we engineered and deployed major system hardening and memory efficiency upgrades to Amir OS:

### ⚡ A. Single-File Fast-Boot Continuity Engine (`memory/BOOTSTRAP_v2.md`)
* **Problem Solved:** Previously, booting an AI session required loading 6-8 separate memory files (~15,000+ tokens).
* **The Fix:** Created `tools/continuity_bootstrap_v2.py` which compiles all active context into a single, compact `BOOTSTRAP_v2.md` file (~4,400 characters / ~1,100 tokens).
* **Token Efficiency:** Reduced boot time to 1 tool call and cut token usage by **80%**.

### 🛡️ B. Pre-Execution Write-Ahead Intent Log (`memory/STAGING_INTENT.md`)
* **Problem Solved:** If an AI model hits a rate limit or crash mid-execution, the next session had no way of knowing what action was interrupted.
* **The Fix:** Implemented a mandatory pre-execution WAL protocol:
  1. Before any non-trivial code change, the AI MUST write `Status: In-Progress` to `STAGING_INTENT.md`.
  2. Upon completion, it updates to `Status: Completed`.
  3. If rate-limited mid-task, the incoming AI model reads `BOOTSTRAP_v2.md`, detects `Status: In-Progress`, and immediately resumes the unfinished work.

### 🩺 C. Sub-Second Diagnostic Health Engine (`tools/health_check.py`)
* **Capabilities:** Checks memory character budgets (`CURRENT_STATE_v2.md` 1.5k, `ACTIVE_PROJECT_v2.md` 1.5k, `SESSION_LOG_v2.md` 2.5k), audits Python script syntax across core tools, and verifies Git workspace cleanliness in <1 second.

### 🩹 D. Self-Healing Remediation Engine (`tools/auto_heal.py`)
* **Capabilities:** If `health_check.py` fails, `auto_heal.py` automatically compacts memory logs, prunes/archives old sessions into `SESSION_LOG_ARCHIVE.md`, runs project auto-discovery, and recompiles `BOOTSTRAP_v2.md` without requiring human intervention.

### 🔐 E. Zero-Data-Loss Secret Shielding
* **Security Rule:** Local `.env` files, config files, and credential stores are **100% preserved and never modified or redacted**.
* **Dynamic Masking:** Regex secret sanitization (`sanitize_secrets`) applies **strictly in-memory** to Git diffs and `BOOTSTRAP_v2.md` to prevent GitHub token leak triggers.

### 🎯 F. Hardcoded Command Behaviors
We hardcoded key workflow command behaviors directly into `.agents/AGENTS.md` and `AGENT_RULES.md`:
* **/plan**: Generate an architectural blueprint and edge-case assessment before writing code.
* **/grill-me**: Interview Amir with targeted engineering questions when trade-offs are ambiguous.
* **/learn**: Save non-trivial bugs and Network+/Security+ lessons to `memory/LESSONS_v2.md`.
* **/goal**: Execute long-running tasks autonomously and verify outputs with `health_check.py`.

---

## 3. Infrastructure & Network Topology

```
                                  INTERNET
                                     |
                          XFINITY GATEWAY (10.0.0.1)
                                     |
              +----------------------+----------------------+
              | WAN: 10.0.0.0/24                           |
              v                                            v
    TP-LINK OMADA ER605 v2                        Apple iMac (10.0.0.190)
    WAN: 10.0.0.170 | LAN: 192.168.0.1             Linux Device (10.0.0.7)
    WireGuard VPN: UDP 51820                       Workstation (10.0.0.246)
              |
              v (192.168.0.0/24 LAN)
    REALHD SW8-25G-MGV2 (2.5GbE Core Switch)
              |
    +---------+----------------------+----------------------+
    |                                |                      |
    v                                v                      v
TrueNAS Storage Server          TARS Raspberry Pi 4     Admin Laptop
192.168.0.100                   192.168.0.102           192.168.0.101
(Plex, Radarr, qBittorrent)    (Docker, TSE Lab)       (WireGuard: 10.10.0.3)
```

### Active TARS Pi Status (`admin@tars` / `192.168.0.102`):
* **OS:** Debian 12 (6.12.47+rpt-rpi-v8 aarch64)
* **SSH:** Verified key-based access (`ssh tars`).
* **Active Services / Folders:**
  * `tse-production-lab/` — FastAPI + PostgreSQL Docker stack.
  * `tars-assistant/` — Legacy assistant codebase.
  * `worldmonitor/` — Monitoring service.
  * `duckdns/` — Dynamic IP updater.

---

## 4. Current System File Map

| File Path | Purpose | Status |
| :--- | :--- | :--- |
| `memory/BOOTSTRAP_v2.md` | Single-File Fast Boot WAL Payload | ✅ ACTIVE (v0.9.0) |
| `memory/STAGING_INTENT.md` | Pre-Execution Intent WAL | ✅ ACTIVE (Status: Completed) |
| `tools/health_check.py` | 1-Second Diagnostic Audit | ✅ PASS (0 errors) |
| `tools/auto_heal.py` | Self-Remediating Repair Engine | ✅ PASS |
| `tools/continuity_bootstrap_v2.py` | Fast Boot Compiler | ✅ PASS |
| `tools/memory_compactor.py` | Log Compactor & Archiver | ✅ PASS |
| `tools/project_autodiscovery.py` | Auto-detects workspace projects | ✅ PASS |
| `version.md` | System Version Master | **v0.9.0** |
| `docs/CHANGELOG.md` | Full Historical Release Record | Updated up to v0.9.0 |

---

## 5. Active Objectives & Immediate Roadmap

1. **T.A.R.S. Physical Display UI ("The Face"):**
   Design and deploy a dedicated visual interface ("T.A.R.S. Face") running directly on the Raspberry Pi display (Pygame / Web Kiosk framebuffer display).
2. **Terminal AI Client (`my-agent` v1.2.0):**
   Integrate `BOOTSTRAP_v2.md` and our local tool registry directly into `projects/my-agent/src/myagent`.
3. **OmniRoute Tool Execution Dispatcher:**
   Resolve OmniRoute model tool-stripping by adding text-based JSON prompt dispatching to `agent_loop.py`.
4. **Network+ / Security+ Hands-on Labs:**
   Home lab firewall rules, WireGuard subnet routing, and service isolation.

---

*This document contains 100% of the active architectural state for Amir OS v0.9.0 and T.A.R.S. Upload this directly to ChatGPT to maintain 1-to-1 sync across AI assistants.*

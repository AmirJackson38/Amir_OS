#!/usr/bin/env python3
"""
continuity_bootstrap_v2.py — Generate session resume state (v2 with hard limits, System File Index, and Staging Intent).
"""

import os
import sys
import subprocess
import io
import re
from datetime import datetime, timezone

# Force UTF-8 output on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def get_repo_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def run_git_command(args, cwd):
    """Run git command, return output."""
    try:
        result = subprocess.run(
            ["git"] + args,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding='utf-8',
            check=False
        )
        if result.returncode == 0:
            return result.stdout.strip()
        else:
            return f"Error: {result.stderr.strip()}"
    except FileNotFoundError:
        return "Git not found in PATH"
    except Exception as e:
        return f"Error: {str(e)}"

def sanitize_secrets(text):
    """
    Mask sensitive secret patterns (PAT tokens, API keys, JWTs) ONLY when rendering git diffs 
    or bootstrap summaries for public export. NEVER touches original local files or user secret stores.
    """
    if not text:
        return text
    text = re.sub(r'(gh[pousr]_[A-Za-z0-9_]{36,255})', '[REDACTED_GITHUB_TOKEN]', text)
    text = re.sub(r'(sk-[A-Za-z0-9_-]{32,})', '[REDACTED_API_KEY]', text)
    text = re.sub(r'eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}', '[REDACTED_JWT_TOKEN]', text)
    text = re.sub(r'https?://([^:]+):([^@]+)@', r'https://\1:[REDACTED_PASSWORD]@', text)
    return text


def extract_section(file_path, header_pattern, next_header_pattern=r'^#+ '):
    """Extract a markdown section from a file."""
    if not os.path.exists(file_path):
        return "File not found."
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return f"Error: {str(e)}"
    
    lines = content.split('\n')
    section_lines = []
    in_section = False
    
    for line in lines:
        if re.search(header_pattern, line):
            in_section = True
            section_lines.append(line)
            continue
        if in_section:
            if re.search(next_header_pattern, line) and not re.search(header_pattern, line):
                break
            section_lines.append(line)
    
    return '\n'.join(section_lines).strip()

def get_file_stats(file_path):
    """Get character count for a file."""
    if not os.path.exists(file_path):
        return 0
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return len(f.read())
    except:
        return 0

def run_project_autodiscovery(root):
    """Auto-run project autodiscovery tool to keep registry fresh."""
    autodiscovery_script = os.path.join(root, "tools", "project_autodiscovery.py")
    if os.path.exists(autodiscovery_script):
        try:
            subprocess.run([sys.executable, autodiscovery_script], cwd=root, check=False)
        except Exception as e:
            print(f"[WARN] Auto-discovery execution skipped: {e}")

def main():
    root = get_repo_root()
    print(f"Initializing Amir OS Continuity Bootstrap Compiler v2...")
    print(f"Working Directory: {root}\n")
    
    # 0. Run Project Auto-Discovery
    print("Executing project auto-discovery...")
    run_project_autodiscovery(root)
    
    # 1. Gather Git Status & Diff (Capped at 50 lines max)
    print("Gathering Git status...")
    git_status = run_git_command(["status", "--porcelain"], root)
    if not git_status:
        git_status = "Clean (No uncommitted changes)"
    
    print("Gathering Git diff...")
    git_diff = run_git_command(["diff"], root)
    if git_diff and "Error" not in git_diff:
        git_diff = sanitize_secrets(git_diff)
        lines = git_diff.split('\n')
        if len(lines) > 50:
            git_diff = '\n'.join(lines[:50]) + "\n\n... [DIFF TRUNCATED TO 50 LINES FOR BREVITY] ..."
    elif not git_diff or "Error" in git_diff:
        git_diff = "No active diff or diff unavailable."

    
    # 2. Load v2 Memory Files & Staging Intent
    print("Loading v2 memory files...")
    
    staging_intent_path = os.path.join(root, "memory", "STAGING_INTENT.md")
    staging_intent = "No active staging intent."
    if os.path.exists(staging_intent_path):
        try:
            with open(staging_intent_path, 'r', encoding='utf-8') as f:
                staging_intent = f.read().strip()
        except:
            pass

    current_state_path = os.path.join(root, "memory", "CURRENT_STATE_v2.md")
    current_state = extract_section(current_state_path, r'^#')
    current_state_chars = get_file_stats(current_state_path)
    
    active_proj_path = os.path.join(root, "projects", "ACTIVE_PROJECT_v2.md")
    active_project = extract_section(active_proj_path, r'^#')
    active_proj_chars = get_file_stats(active_proj_path)
    
    session_log_path = os.path.join(root, "memory", "SESSION_LOG_v2.md")
    session_log = extract_section(session_log_path, r'^#')
    session_log_chars = get_file_stats(session_log_path)
    
    project_registry_path = os.path.join(root, "memory", "PROJECT_REGISTRY.md")
    project_registry = "No PROJECT_REGISTRY found"
    if os.path.exists(project_registry_path):
        try:
            with open(project_registry_path, 'r', encoding='utf-8') as f:
                registry_content = f.read()
            project_registry = "\n".join(registry_content.split("\n")[:30])
        except:
            pass
    
    # 3. Load compact version
    print("Reading version info...")
    version_path = os.path.join(root, "version.md")
    version_info = extract_section(version_path, r'^#')
    
    # 4. Compile Bootstrap Document
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    
    bootstrap_template = f"""# Amir OS Session Resume Bootstrap (v2 Fast-Boot)
> Generated: {timestamp}
> Amir OS Version: v0.8.0 (Single-File Fast-Boot Engine)
> Memory Efficiency: {current_state_chars + active_proj_chars + session_log_chars} / 5,500 chars used

This file contains the consolidated runtime state of Amir OS v0.8.0.
Single-File Fast Boot: Reading this file provides 100% of the active context in 1 tool call.

---

## 1. System File Index (Memory Map & On-Demand Registry)
> *The AI agent uses this index to know where files exist, when to fetch them on-demand, and when to write updates.*

| File Path | Purpose | On-Demand Read Trigger | Write / Update Trigger |
| :--- | :--- | :--- | :--- |
| `memory/BOOTSTRAP_v2.md` | Single-File Fast Boot & Active Context WAL | Loaded automatically at session start | Recompiled by `continuity_bootstrap_v2.py` |
| `memory/STAGING_INTENT.md` | Pre-Execution Intent WAL (in-flight actions) | Read on boot to check for interrupted tasks | Written BEFORE major code/system changes |
| `version.md` | Compact version summary & current milestone | Checked on boot or version query | Updated on version releases |
| `docs/CHANGELOG.md` | Complete historical release notes (v0.1.0+) | Read when researching historical changes | Updated on milestone releases |
| `memory/CURRENT_STATE_v2.md` | Active focus, study areas, next actions | Read if detailed state inspection needed | Updated when active focus shifts |
| `projects/ACTIVE_PROJECT_v2.md` | Deep breakdown of current active project | Read when deep-diving current project | Updated when project phase changes |
| `memory/SESSION_LOG_v2.md` | Rolling flight recorder (latest sessions) | Read if deep session history required | Updated continuously during session |
| `memory/PROJECT_REGISTRY.md` | Inventory of all active/paused projects | Read when discovering or listing projects | Updated by `project_autodiscovery.py` |
| `memory/DECISIONS_v2.md` | Architectural decision log | Read when evaluating past design choices | Updated when making high-impact decisions |
| `memory/LESSONS_v2.md` | Troubleshooting & operational lessons | Read when fixing complex bugs/issues | Updated when a key lesson is learned |
| `identity/PROFILE.md` | Amir's profile, career goals, preferences | Read when personal context needed | Updated when goals/profile change |
| `identity/COACH_MODE.md` | Coaching philosophy & interaction rules | Read when reviewing teaching rules | Rare system updates |

---

## 2. In-Flight Staged Intent (Pre-Execution WAL)

{staging_intent}

---

## 3. Active Context

### Version
{version_info}

### Current State
{current_state}

### Active Project
{active_project}

---

## 4. Recent Work & Journal (Flight Recorder)

{session_log}

---

## 5. Project Registry Summary

{project_registry}

---

## 6. Active Workspace Changes (Git Status)

```
{git_status}
```

---

## 7. Current Code Diffs (Capped at 50 Lines)

```diff
{git_diff}
```

---

## 8. Fast-Boot Instructions for AI Agent

If you are an AI model initializing this session:
1. You have loaded `BOOTSTRAP_v2.md`. Check Section 2 (`In-Flight Staged Intent`).
   - If `Status == In-Progress`, an action was interrupted mid-flight. Resume it immediately.
   - If `Status == Completed` or clear, proceed normally.
2. Use the **System File Index** in Section 1 to fetch extra files on-demand (`docs/CHANGELOG.md`, `DECISIONS_v2.md`, etc.) only when requested or needed.
3. State active project, last progress, and ask Amir: "How should I proceed?"

Session Ready. Proceed with confidence.
"""
    
    bootstrap_out_path = os.path.join(root, "memory", "BOOTSTRAP_v2.md")
    try:
        with open(bootstrap_out_path, 'w', encoding='utf-8') as f:
            f.write(bootstrap_template)
        print(f"\n[SUCCESS] Fast-Boot Continuity Bootstrap v2 written to: {bootstrap_out_path}")
        print(f"\nCharacter Efficiency Report:")
        print(f"  CURRENT_STATE_v2.md:  {current_state_chars:,} / 1,500 chars ({int(current_state_chars/1500*100)}%)")
        print(f"  ACTIVE_PROJECT_v2.md: {active_proj_chars:,} / 1,500 chars ({int(active_proj_chars/1500*100)}%)")
        print(f"  SESSION_LOG_v2.md:    {session_log_chars:,} / 2,500 chars ({int(session_log_chars/2500*100)}%)")
        total_memory = current_state_chars + active_proj_chars + session_log_chars
        print(f"  TOTAL:                {total_memory:,} / 5,500 chars ({int(total_memory/5500*100)}%)")
        print(f"\nFast-Boot Payload Ready.")
    except Exception as e:
        print(f"\n[ERROR] Failed to write bootstrap file: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()

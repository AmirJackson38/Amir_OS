import os
import sys
import subprocess
from datetime import datetime
import re

def get_repo_root():
    # The script is located in the 'tools' subdirectory of the repo root
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def run_git_command(args, cwd):
    try:
        result = subprocess.run(
            ["git"] + args,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        return f"Error running git command: {e.stderr.strip()}"
    except FileNotFoundError:
        return "Git is not installed or not in the PATH."

def extract_section(file_path, header_pattern, next_header_pattern=r'^#+ '):
    if not os.path.exists(file_path):
        return "File not found."
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return f"Error reading file: {str(e)}"

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

def main():
    root = get_repo_root()
    print(f"\033[1;36mInitializing Amir OS Continuity Bootstrap Compiler...\033[0m")
    print(f"Working Directory: {root}\n")

    # 1. Gather Git Status & Diff
    print("Gathering Git status...")
    git_status = run_git_command(["status", "--porcelain"], root)
    if not git_status:
        git_status = "Clean (No uncommitted changes)"
        
    print("Gathering Git diff...")
    git_diff = run_git_command(["diff"], root)
    # Truncate diff if it's too long to prevent token overflow
    if len(git_diff) > 4000:
        git_diff = git_diff[:4000] + "\n\n... [DIFF TRUNCATED FOR BREVITY] ..."
    elif not git_diff:
        git_diff = "No active diff."

    # 2. Extract Active Project & Objectives
    print("Parsing Active Project...")
    active_proj_path = os.path.join(root, "projects", "ACTIVE_PROJECT.md")
    active_project_info = extract_section(active_proj_path, r'^#+ Project')
    current_objective = extract_section(active_proj_path, r'^#+ Current Objective')

    # 3. Extract Current Focus
    print("Parsing Current State...")
    current_state_path = os.path.join(root, "memory", "CURRENT_STATE.md")
    current_focus = extract_section(current_state_path, r'^#+ Current Focus')
    next_actions = extract_section(current_state_path, r'^#+ Immediate Next Actions')

    # 4. Read Latest Session Log
    print("Reading Session Log...")
    session_log_path = os.path.join(root, "memory", "SESSION_LOG.md")
    latest_journal = "No session log found. Creating a new journal entry is recommended."
    if os.path.exists(session_log_path):
        try:
            with open(session_log_path, 'r', encoding='utf-8') as f:
                log_content = f.read()
            # Find the most recent session entries (up to 3)
            sessions = re.split(r'^## Session ', log_content, flags=re.MULTILINE)
            if len(sessions) > 1:
                # The first split element is headers/metadata, actual sessions start from index 1
                latest_sessions = [s.strip() for s in sessions[1:4]]
                latest_journal = "\n\n---\n\n### Session ".join([f"## Session {s}" for s in latest_sessions])
            else:
                latest_journal = log_content.strip()
        except Exception as e:
            latest_journal = f"Error reading session log: {str(e)}"

    # 5. Compile Bootstrap Document
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    bootstrap_template = f"""# Amir OS Session Resume Bootstrap
> **Generated:** {timestamp}
> **Amir OS Version:** v0.6.0 (Continuity Work-in-Progress)

This file contains the consolidated runtime state of Amir OS. It is designed to be read by any newly booted AI model to quickly reconstruct the active project, goals, code diffs, and recent context after a session drop.

---

## 1. Active Context

### Active Project & Phase
{active_project_info}

### Current Objective
{current_objective}

### High-Level Focus
{current_focus}

### Immediate Next Actions
{next_actions}

---

## 2. Recent Work & Journal (Flight Recorder)

{latest_journal}

---

## 3. Active Workspace Changes (Git Status)

```
{git_status}
```

---

## 4. Current Code Diffs (Write-Ahead Log)

```diff
{git_diff}
```

---

## 5. Bootstrap Instruction for Next Model
If you are a new AI model booting into this session:
1. Review the details above.
2. Formulate your response as the Coldest Engineer, adopting the "Full Shebang" Standard.
3. Confirm that you have loaded the bootstrap context, state the active project, the last known action, and ask Amir how he wishes to proceed.
"""

    bootstrap_out_path = os.path.join(root, "memory", "BOOTSTRAP.md")
    try:
        with open(bootstrap_out_path, 'w', encoding='utf-8') as f:
            f.write(bootstrap_template)
        print(f"\n\033[1;32m[SUCCESS]\033[0m Continuity Bootstrap written to: {bootstrap_out_path}")
        print("You can now commit this state or copy it to resume in a new stateless session.")
    except Exception as e:
        print(f"\n\033[1;31m[ERROR]\033[0m Failed to write bootstrap file: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()

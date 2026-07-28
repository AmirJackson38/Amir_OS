#!/usr/bin/env python3
"""
health_check.py — 1-Second Diagnostic Health & Governance Audit for Amir OS.
Audits memory character limits, core tools, git status, and system integrity.
"""

import os
import sys
import io
import subprocess
import py_compile

# Force UTF-8 output on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# ANSI Color Codes
GREEN = "\033[1;32m"
YELLOW = "\033[1;33m"
RED = "\033[1;31m"
CYAN = "\033[1;36m"
BOLD = "\033[1m"
RESET = "\033[0m"

BUDGETS = {
    "CURRENT_STATE_v2.md": 1500,
    "ACTIVE_PROJECT_v2.md": 1500,
    "SESSION_LOG_v2.md": 2500,
    "DECISIONS_v2.md": 1000,
    "LESSONS_v2.md": 1000
}

CORE_TOOLS = [
    "continuity_bootstrap_v2.py",
    "memory_compactor.py",
    "project_autodiscovery.py",
    "health_check.py",
    "auto_heal.py",
    "character_limiter.py"
]


def get_repo_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def audit_memory_files(root):
    results = []
    all_passed = True
    
    for filename, budget in BUDGETS.items():
        # Check v2 location first, fallback to memory dir
        path = os.path.join(root, "memory", filename)
        if not os.path.exists(path) and "ACTIVE_PROJECT" in filename:
            path = os.path.join(root, "projects", filename)
            
        if not os.path.exists(path):
            results.append((filename, 0, budget, f"{RED}MISSING{RESET}"))
            all_passed = False
            continue
            
        try:
            with open(path, 'r', encoding='utf-8') as f:
                char_count = len(f.read())
            status = f"{GREEN}PASS{RESET}" if char_count <= budget else f"{RED}EXCEEDED ({char_count - budget} OVER){RESET}"
            if char_count > budget:
                all_passed = False
            results.append((filename, char_count, budget, status))
        except Exception as e:
            results.append((filename, 0, budget, f"{RED}ERROR: {e}{RESET}"))
            all_passed = False
            
    return all_passed, results

def audit_core_tools(root):
    results = []
    all_passed = True
    
    for tool_name in CORE_TOOLS:
        path = os.path.join(root, "tools", tool_name)
        if not os.path.exists(path):
            results.append((tool_name, f"{RED}MISSING{RESET}"))
            all_passed = False
            continue
            
        try:
            py_compile.compile(path, doraise=True)
            results.append((tool_name, f"{GREEN}PASS (Syntax OK){RESET}"))
        except py_compile.PyCompileError as e:
            results.append((tool_name, f"{RED}SYNTAX ERROR{RESET}"))
            all_passed = False
            
    return all_passed, results

def audit_git_status(root):
    try:
        res = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=root,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding='utf-8',
            check=False
        )
        if res.returncode == 0:
            uncommitted = [line for line in res.stdout.strip().split('\n') if line]
            count = len(uncommitted)
            if count == 0:
                return True, f"{GREEN}CLEAN (0 uncommitted files){RESET}"
            else:
                return True, f"{YELLOW}DIRTY ({count} uncommitted file(s)){RESET}"
        else:
            return False, f"{RED}Git status failed: {res.stderr.strip()}{RESET}"
    except Exception as e:
        return False, f"{RED}Git check error: {e}{RESET}"

def extract_frontmatter_field(path, field):
    """Extract a YAML frontmatter field from a Markdown file."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        if not content.startswith('---'):
            return None
        end = content.index('---', 3)
        frontmatter = content[3:end].strip()
        for line in frontmatter.split('\n'):
            if line.startswith(field + ':'):
                return line[len(field)+1:].strip().strip('"').strip("'")
        return None
    except Exception:
        return None

def audit_manifest(root):
    """Validate manifest.json structure and dependency references."""
    manifest_path = os.path.join(root, "manifest.json")
    results = []
    errors = []

    if not os.path.exists(manifest_path):
        return False, [(f"{RED}MISSING{RESET}", "manifest.json not found")]

    try:
        import json as json_module
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json_module.load(f)
    except Exception as e:
        return False, [(f"{RED}PARSE ERROR{RESET}", str(e))]

    # Collect all valid IDs
    all_skill_ids = {s["id"] for s in manifest.get("skills", [])}
    all_workflow_ids = {w["id"] for w in manifest.get("workflows", [])}
    all_tool_ids = {t["id"] for t in manifest.get("tools", [])}

    # Check skill dependencies
    for skill in manifest.get("skills", []):
        for dep in skill.get("requires", []):
            if dep not in all_skill_ids:
                errors.append(f"Skill '{skill['id']}' requires unknown skill '{dep}'")
            skill_path = os.path.join(root, skill["path"])
            if not os.path.exists(skill_path):
                errors.append(f"Skill '{skill['id']}' path missing: {skill['path']}")

    # Check workflow dependencies
    for wf in manifest.get("workflows", []):
        for dep in wf.get("requires_skills", []):
            if dep not in all_skill_ids:
                errors.append(f"Workflow '{wf['id']}' requires unknown skill '{dep}'")
        wf_path = os.path.join(root, wf["path"])
        if not os.path.exists(wf_path):
            errors.append(f"Workflow '{wf['id']}' path missing: {wf['path']}")

    # Check config files
    for cfg in manifest.get("configs", []):
        cfg_path = os.path.join(root, cfg["path"])
        if not os.path.exists(cfg_path):
            errors.append(f"Config '{cfg['id']}' path missing: {cfg['path']}")

    # Check tool files
    for tool in manifest.get("tools", []):
        tool_path = os.path.join(root, tool["path"])
        if not os.path.exists(tool_path):
            errors.append(f"Tool '{tool['id']}' path missing: {tool['path']}")

    if errors:
        for err in errors:
            results.append((f"{RED}ERROR{RESET}", err))
        return False, results

    return True, [(f"{GREEN}PASS{RESET}", f"All {len(manifest.get('skills', []))} skills, {len(manifest.get('workflows', []))} workflows, {len(manifest.get('configs', []))} configs, {len(manifest.get('tools', []))} tools verified")]

def main():
    root = get_repo_root()
    print(f"\n{CYAN}{BOLD}========================================================{RESET}")
    print(f"{CYAN}{BOLD}       Amir OS v0.9.0 Health & Architecture Audit        {RESET}")
    print(f"{CYAN}{BOLD}========================================================{RESET}\n")


    # 1. Audit Memory Files
    print(f"{BOLD}[1/4] Memory Character Budget Audit:{RESET}")
    mem_passed, mem_results = audit_memory_files(root)
    for filename, count, budget, status in mem_results:
        pct = (count / budget * 100) if budget else 0
        print(f"  • {filename:<22} : {count:>5,}/{budget:>5,} chars ({pct:>5.1f}%) -> {status}")
        
    # 2. Audit Core Tools
    print(f"\n{BOLD}[2/4] Core Python Tools Syntax Check:{RESET}")
    tools_passed, tools_results = audit_core_tools(root)
    for tool_name, status in tools_results:
        print(f"  • {tool_name:<22} : {status}")

    # 3. Manifest & Dependency Validation
    print(f"\n{BOLD}[3/4] Manifest & Dependency Validation:{RESET}")
    manifest_passed, manifest_results = audit_manifest(root)
    for status, msg in manifest_results:
        print(f"  • {status:<10} {msg}")

    # 4. Audit Git Repository
    print(f"\n{BOLD}[4/4] Workspace & Git Sync Status:{RESET}")
    git_passed, git_msg = audit_git_status(root)
    print(f"  • Repository Status       : {git_msg}")

    print(f"\n{CYAN}--------------------------------------------------------{RESET}")
    overall = mem_passed and tools_passed and manifest_passed and git_passed
    if overall:
        print(f"{GREEN}{BOLD} OVERALL HEALTH CHECK: PASS — All System Metrics Healthy {RESET}\n")
        sys.exit(0)
    else:
        print(f"{RED}{BOLD} OVERALL HEALTH CHECK: FAIL — Issues Detected Above {RESET}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()

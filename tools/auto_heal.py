#!/usr/bin/env python3
"""
auto_heal.py — Self-Healing Diagnostic & Remediation Engine for Amir OS.
If health_check.py fails, auto_heal.py automatically remediates memory overruns,
updates project discovery, and recompiles fast-boot continuity.
"""

import os
import sys
import io
import subprocess

# Force UTF-8 output on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

GREEN = "\033[1;32m"
YELLOW = "\033[1;33m"
RED = "\033[1;31m"
CYAN = "\033[1;36m"
BOLD = "\033[1m"
RESET = "\033[0m"

def get_repo_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def run_script(script_name, root):
    path = os.path.join(root, "tools", script_name)
    if not os.path.exists(path):
        return False, f"Script missing: {script_name}"
    try:
        res = subprocess.run([sys.executable, path], cwd=root, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8')
        return res.returncode == 0, res.stdout
    except Exception as e:
        return False, str(e)

def main():
    root = get_repo_root()
    print(f"\n{CYAN}{BOLD}===================================================={RESET}")
    print(f"{CYAN}{BOLD}       Amir OS Self-Healing Engine (Auto-Heal)       {RESET}")
    print(f"{CYAN}{BOLD}===================================================={RESET}\n")

    print(f"{BOLD}[1/3] Running initial health check...{RESET}")
    passed, output = run_script("health_check.py", root)
    
    if passed:
        print(f"{GREEN}✓ System is 100% healthy. No auto-healing required.{RESET}\n")
        sys.exit(0)
        
    print(f"{YELLOW}⚠️ System health check failed. Initiating auto-remediation protocol...{RESET}\n")

    # Step 1: Run Memory Compactor
    print(f"{BOLD}[2/3] Compacting session logs & enforcing memory character budgets...{RESET}")
    compact_ok, compact_out = run_script("memory_compactor.py", root)
    if compact_ok:
        print(f"{GREEN}✓ Memory compaction complete.{RESET}")
    else:
        print(f"{YELLOW}⚠️ Memory compaction note: {compact_out.strip()}{RESET}")

    # Step 2: Run Project Auto-Discovery & Recompile Bootstrap
    print(f"{BOLD}[3/3] Running project auto-discovery & recompiling fast-boot state...{RESET}")
    boot_ok, boot_out = run_script("continuity_bootstrap_v2.py", root)
    if boot_ok:
        print(f"{GREEN}✓ Fast-boot state successfully recompiled.{RESET}")
    else:
        print(f"{RED}❌ Fast-boot recompile failed: {boot_out.strip()}{RESET}")

    # Verification: Final Health Check
    print(f"\n{BOLD}Re-evaluating system health post-healing...{RESET}")
    final_pass, final_out = run_script("health_check.py", root)
    
    if final_pass:
        print(f"{GREEN}{BOLD} AUTO-HEALING SUCCESSFUL: All system metrics restored to PASS!{RESET}\n")
        sys.exit(0)
    else:
        print(f"{RED}{BOLD} AUTO-HEALING PARTIAL: Manual inspection required.{RESET}")
        print(final_out)
        sys.exit(1)

if __name__ == "__main__":
    main()

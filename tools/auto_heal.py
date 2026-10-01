#!/usr/bin/env python3
"""Compatibility diagnostic: no automatic memory or project-state rewrites."""
import subprocess
import sys
from pathlib import Path


def main():
    tool = Path(__file__).with_name("health_check.py")
    print("Diagnostics only. Findings require targeted repair; source records are preserved.", flush=True)
    return subprocess.run([sys.executable, str(tool)], check=False).returncode


if __name__ == "__main__":
    raise SystemExit(main())

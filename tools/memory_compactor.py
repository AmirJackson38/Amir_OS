#!/usr/bin/env python3
"""Compatibility command: preserve source records and report size."""
from pathlib import Path
from character_limiter import main


def compact_session_log(session_log_path, char_budget=2500):
    path = Path(session_log_path)
    if not path.exists():
        return False, f"Session log not found: {path}"
    size = len(path.read_text(encoding="utf-8-sig"))
    return False, (f"Preserved {size} source characters. Budget {char_budget} applies only "
                   "to generated context; use continuity_bootstrap_v2.py.")


if __name__ == "__main__":
    raise SystemExit(main())

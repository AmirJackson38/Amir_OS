#!/usr/bin/env python3
"""Report legacy sizes. Never truncate or rewrite durable memory."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIMITS = {
    "memory/CURRENT_STATE_v2.md": 1500,
    "memory/ACTIVE_PROJECT_v2.md": 1500,
    "memory/DECISIONS_v2.md": 1000,
    "memory/LESSONS_v2.md": 1000,
    "memory/SESSION_LOG_v2.md": 2500,
}


def inspect_sizes(root=ROOT):
    rows = []
    for name, old_budget in LIMITS.items():
        path = Path(root) / name
        size = len(path.read_text(encoding="utf-8-sig")) if path.exists() else None
        rows.append((name, size, old_budget))
    return rows


def main():
    for name, size, old_budget in inspect_sizes():
        print(f"{name}: {size if size is not None else 'missing'} chars; legacy briefing budget {old_budget}")
    print("Source records preserved. Generate bounded context with continuity_bootstrap_v2.py.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

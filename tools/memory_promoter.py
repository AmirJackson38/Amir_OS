#!/usr/bin/env python3
"""Propose candidates for review; never promote keyword matches to verified state."""
import argparse
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from memory_io import atomic_write, exclusive_writer
from continuity_bootstrap_v2 import redact

ROOT = Path(__file__).resolve().parents[1]


def detect_significant_changes(work_log=None, git_diff=None, agent_notes=None):
    candidates = []
    for label, content in (("work log", work_log), ("agent notes", agent_notes), ("diff", git_diff)):
        if content and content.strip():
            candidates.append(("REVIEW", f"Review supplied {label}", content.strip(), label))
    return candidates


def promote_to_memory(category, summary, details, evidence=None, root=None):
    root = Path(root) if root is not None else ROOT
    with exclusive_writer(root / "memory/REVIEW_QUEUE.md"):
        return _queue_candidate(category, summary, details, evidence, root)


def _queue_candidate(category, summary, details, evidence, root):
    safe = [redact(str(value or "")) for value in (category, summary, details, evidence)]
    candidate_id = hashlib.sha256("\n".join(safe).encode("utf-8")).hexdigest()[:20]
    path = root / "memory/REVIEW_QUEUE.md"
    content = path.read_text(encoding="utf-8-sig") if path.exists() else (
        "# Memory review queue\n\nCandidates are unverified. Review evidence before updating a source record.\n"
    )
    marker = f"<!-- candidate:{candidate_id} -->"
    if marker in content:
        return False
    entry = (
        f"\n{marker}\n## {safe[1]}\n"
        f"- Recorded UTC: {datetime.now(timezone.utc).isoformat()}\n"
        f"- Status: needs review\n- Source type: {safe[3]}\n"
        f"- Requested category: {safe[0]}\n\n{safe[2]}\n"
    )
    atomic_write(path, content + entry)
    return True


def session_end_checkpoint(work_log=None, git_diff=None, agent_notes=None, root=None):
    changes = detect_significant_changes(work_log, git_diff, agent_notes)
    queued = sum(promote_to_memory(*candidate, root=root) for candidate in changes)
    return {"candidates": len(changes), "queued": queued, "verified_promotions": 0}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--promote", action="store_true", help="Queue candidates for review")
    mode.add_argument("--session-end", action="store_true")
    parser.add_argument("--work-log")
    parser.add_argument("--git-diff")
    parser.add_argument("--notes")
    args = parser.parse_args()
    if args.check:
        candidates = detect_significant_changes(args.work_log, args.git_diff, args.notes)
        print(f"{len(candidates)} candidate(s); no files changed.")
        for _, summary, _, _ in candidates:
            print(summary)
    else:
        print(session_end_checkpoint(args.work_log, args.git_diff, args.notes))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Build bounded context. Never compact or rewrite source records."""
import argparse
import json
import re
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BUDGET = 6000


def redact(text):
    text = re.sub(r"gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|sk-[A-Za-z0-9_-]{20,}", "[REDACTED]", text)
    return re.sub(r"(https?://)[^/\s@]+@", r"\1[REDACTED]@", text)


def session_titles(text):
    return sorted(set(re.findall(r"^## Session (.+)$", text, re.MULTILINE)), reverse=True)


def build_packet(root=ROOT, budget=DEFAULT_BUDGET):
    if budget < 1500:
        raise ValueError("Context budget must be at least 1500 characters")
    root = Path(root)
    state = json.loads((root / "PROJECT_STATE.json").read_text(encoding="utf-8-sig"))
    tars = state.get("tars", {})
    log = root / "memory/SESSION_LOG_v2.md"
    titles = session_titles(log.read_text(encoding="utf-8-sig"))[:3] if log.exists() else []
    packet = (
        "# Amir OS context view\n\n"
        f"Generated UTC: {datetime.now(timezone.utc).isoformat()}\n"
        "Disposable briefing, not an authority or an instruction to resume old actions.\n\n"
        "## Collaboration\nRead identity/COLLABORATION.md and choose a route in START_HERE.md.\n"
        "Do not load TARS or personal history for unrelated tasks.\n\n"
        "## Declared TARS state (not a live runtime check)\n"
        f"- Software checkpoint: {tars.get('current_phase', 'unknown')}\n"
        f"- Status: {tars.get('phase_status', 'unknown')}\n"
        f"- Release label: {tars.get('latest_release', 'unknown')}\n"
        f"- Next gate: {tars.get('next_gate', 'Read HEAD.md')}\n"
        "- Check source with node tools/agent_bootstrap.mjs; verify the Pi separately.\n\n"
        "## Recent session index (headings only; newest first)\n"
        + ("\n".join("- " + title[:120] for title in titles) or "- No session headings found.")
        + "\n\n## On-demand sources\n"
        "- HEAD.md: TARS navigation and boundaries\n"
        "- PROJECT_STATE.json: declared workstream and acceptance gates\n"
        "- memory/FOUNDATION_HANDOFF.md: foundation repair status\n"
        "- memory/SESSION_LOG_v2.md: historical evidence\n"
        "- memory/STAGING_INTENT.md: historical plans; verify before resuming\n"
        "- MEMORY_PROTOCOL.md: ownership and retention\n"
        "- Obsidian Home.md / Learning Queue.md: personal learning workspace\n"
    )
    packet = redact(packet)
    if len(packet) > budget:
        suffix = "\n[Context view shortened; originals unchanged.]\n"
        packet = packet[:budget - len(suffix)] + suffix
    return packet


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Save memory/CONTEXT_PACKET.md")
    parser.add_argument("--budget", type=int, default=DEFAULT_BUDGET)
    args = parser.parse_args()
    packet = build_packet(budget=args.budget)
    if args.write:
        from memory_io import atomic_write
        atomic_write(ROOT / "memory/CONTEXT_PACKET.md", packet)
        print("Generated memory/CONTEXT_PACKET.md; historical sources unchanged.")
    else:
        print(packet, end="")


if __name__ == "__main__":
    main()

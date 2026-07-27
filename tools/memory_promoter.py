#!/usr/bin/env python3
"""
memory_promoter.py — Automatic memory promotion system for Amir OS.

Detects significant changes during work and promotes them to canonical v2 memory files.
Integrates with existing character_limiter.py for auto-compaction.

Usage:
    python tools/memory_promoter.py --check          # Check for promotable changes
    python tools/memory_promoter.py --promote        # Auto-promote detected changes
    python tools/memory_promoter.py --session-end    # Session-end checkpoint
"""

import io
import os
import sys
import re
import json
import hashlib
import subprocess
from datetime import datetime, timezone

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

MEMORY_CATEGORIES = {
    'CURRENT_STATE_v2.md': {
        'limit': 1500,
        'triggers': ['focus shift', 'active project change', 'next action change', 'learning area change'],
        'sections': ['Active Focus', 'Active Projects', 'Active Project', 'Next Actions', 'Learning', 'Key Files'],
    },
    'ACTIVE_PROJECT_v2.md': {
        'limit': 1500,
        'triggers': ['milestone', 'bug fix', 'feature complete', 'architecture change', 'phase complete', 'bug discovered'],
        'sections': ['Current Priority', 'Project Breakdown', 'Next Actions', 'Known Bugs', 'Key Files'],
    },
    'DECISIONS_v2.md': {
        'limit': 1000,
        'triggers': ['decision made', 'architecture choice', 'technology choice', 'strategy change', 'tradeoff'],
        'sections': ['Latest Decisions'],
        'max_entries': 3,
    },
    'LESSONS_v2.md': {
        'limit': 1000,
        'triggers': ['lesson learned', 'mistake', 'debugging insight', 'best practice', 'gotcha'],
        'sections': ['Recent Lessons'],
        'max_entries': 5,
    },
    'SESSION_LOG_v2.md': {
        'limit': 2500,
        'triggers': ['session start', 'session end', 'milestone reached', 'bug fixed', 'feature deployed'],
        'sections': ['Session'],
        'max_entries': None,
    },
    'STAGING_INTENT.md': {
        'limit': None,
        'triggers': ['phase change', 'plan update', 'interrupted work', 'next session plan'],
        'sections': ['Active Staged Action'],
    },
}

SIGNIFICANT_PATTERNS = [
    r'(?:fixed|resolved|solved)\s+(?:bug|issue|error|crash)',
    r'(?:implemented|added|created|built)\s+(?:feature|system|module|component)',
    r'(?:refactored|rewrote|restructured)\s+(?:code|logic|architecture)',
    r'(?:decided|chose|selected|picked)\s+(?:to|against)',
    r'(?:learned|discovered|realized|found\s+out)',
    r'(?:milestone|phase)\s+\d+\s+(?:complete|done|finished)',
    r'(?:architectural|strategic)\s+(?:decision|choice|direction)',
    r'(?:deployed|released|shipped|published)',
    r'(?:breaking change|breaking API|migration)',
]

TRIVIAL_PATTERNS = [
    r'(?:testing|debugging|trying|experimenting)\s+(?:with|out)',
    r'(?:temp|temporary|quick|hack)\s+(?:fix|workaround)',
    r'(?:typo|formatting|whitespace|indent)',
    r'(?:print|console\.log|debug)\s+statement',
    r'(?:commented|uncommented)\s+(?:out|code)',
    r'(?:renamed|moved)\s+(?:file|variable|function)',
]

LIMITS = {
    'memory/CURRENT_STATE_v2.md': 1500,
    'memory/ACTIVE_PROJECT_v2.md': 1500,
    'memory/DECISIONS_v2.md': 1000,
    'memory/LESSONS_v2.md': 1000,
    'memory/SESSION_LOG_v2.md': 2500,
}

TRIGGER_MAP = {
    'CURRENT_STATE_v2.md': ['focus shift', 'active project change', 'next action change', 'learning area change'],
    'ACTIVE_PROJECT_v2.md': ['milestone', 'bug fix', 'feature complete', 'architecture change', 'phase complete', 'bug discovered'],
    'DECISIONS_v2.md': ['decision made', 'architecture choice', 'technology choice', 'strategy change', 'tradeoff'],
    'LESSONS_v2.md': ['lesson learned', 'mistake', 'debugging insight', 'best practice', 'gotcha'],
    'SESSION_LOG_v2.md': ['session start', 'session end', 'milestone reached', 'bug fixed', 'feature deployed'],
    'STAGING_INTENT.md': ['phase change', 'plan update', 'interrupted work', 'next session plan'],
}


def get_repo_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read_file(path):
    full = os.path.join(get_repo_root(), path)
    if not os.path.exists(full):
        return None
    try:
        with open(full, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"[ERROR] Reading {path}: {e}")
        return None


def write_file(path, content):
    full = os.path.join(get_repo_root(), path)
    try:
        with open(full, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    except Exception as e:
        print(f"[ERROR] Writing {path}: {e}")
        return False


def count_chars(filepath):
    full = os.path.join(get_repo_root(), filepath)
    if not os.path.exists(full):
        return 0
    try:
        with open(full, 'r', encoding='utf-8') as f:
            return len(f.read())
    except Exception as e:
        print(f"[ERROR] Reading {filepath}: {e}")
        return 0


def is_memory_file_change(diff):
    for line in diff.split('\n'):
        if line.startswith('--- a/') or line.startswith('+++ b/'):
            if 'memory/' in line:
                return True
    return False


def detect_significant_changes(work_log=None, git_diff=None, agent_notes=None):
    significant = []
    all_text = ' '.join(filter(None, [work_log, agent_notes])).lower()

    for pattern in SIGNIFICANT_PATTERNS:
        m = re.search(pattern, all_text)
        if m:
            idx = all_text.find(m.group())
            context = all_text[max(0, idx - 100):idx + 200]
            significant.append(('general', m.group(), context, 'pattern'))

    all_text_lower = all_text
    for filename, triggers in TRIGGER_MAP.items():
        for trigger in triggers:
            if trigger.lower() in all_text_lower:
                idx = all_text_lower.find(trigger.lower())
                context = all_text_lower[max(0, idx - 100):idx + 200]
                significant.append((filename.replace('_v2.md', ''), trigger, context, 'trigger'))

    if git_diff and not is_memory_file_change(git_diff):
        added_lines = []
        for line in git_diff.split('\n'):
            if line.startswith('+') and not line.startswith('+++'):
                added_lines.append(line[1:])
        added_text = '\n'.join(added_lines).lower()

        if re.search(r'(?:def |class |function |interface |struct |type )', added_text):
            significant.append(('code_structure', 'function/class definition change', git_diff[:200], 'git'))
        if re.search(r'(?:architectur|decision|strategy|tradeoff)', added_text):
            significant.append(('DECISIONS', 'architectural decision in diff', git_diff[:200], 'git'))
        if re.search(r'(?:bug|fix|error|crash)', added_text):
            significant.append(('BUGS', 'bug fix in diff', git_diff[:200], 'git'))

    filtered = []
    seen = set()
    for cat, summary, details, evidence in significant:
        is_trivial = any(re.search(p, ' '.join([summary, details]), re.IGNORECASE) for p in TRIVIAL_PATTERNS)
        if is_trivial:
            continue
        key = (cat, summary[:50])
        if key in seen:
            continue
        if cat == 'general':
            continue
        seen.add(key)
        filtered.append((cat, summary, details, evidence))

    return filtered


FILENAME_MAP = {
    'CURRENT_STATE': 'CURRENT_STATE_v2.md',
    'ACTIVE_PROJECT': 'ACTIVE_PROJECT_v2.md',
    'DECISIONS': 'DECISIONS_v2.md',
    'LESSONS': 'LESSONS_v2.md',
    'SESSION_LOG': 'SESSION_LOG_v2.md',
    'STAGING_INTENT': 'STAGING_INTENT.md',
    'BUGS': 'ACTIVE_PROJECT_v2.md',
    'CODE_STRUCTURE': 'ACTIVE_PROJECT_v2.md',
    'GENERAL': 'SESSION_LOG_v2.md',
}


def promote_to_memory(category, summary, details, evidence=None, root=None):
    if root is None:
        root = get_repo_root()

    category = category.upper().replace('-', '_').replace(' ', '_')
    fname = FILENAME_MAP.get(category, 'SESSION_LOG_v2.md')
    path = os.path.join(root, 'memory', fname)

    if not os.path.exists(path):
        print(f"[PROMOTE] Memory file {fname} not found, skipping")
        return False

    content = read_file(os.path.join('memory', fname))
    if not content:
        return False

    timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')

    if fname == 'DECISIONS_v2.md':
        entry = f"\n### Decision: {summary}\n\n**Date:** {timestamp}\n\n**Decision:** {details}\n"
        if evidence:
            ev = evidence[:200] + '...' if len(evidence) > 200 else evidence
            entry += f"\n**Evidence:** {ev}\n"
        entry += "\n---\n"

    elif fname == 'LESSONS_v2.md':
        entry = f"\n### Lesson: {summary}\n\n**Date:** {timestamp}\n\n**Lesson:** {details}\n"
        if evidence:
            entry += f"\n**Context:** {evidence[:200]}...\n" if len(evidence) > 200 else f"\n**Context:** {evidence}\n"
        entry += "\n---\n"

    elif fname == 'ACTIVE_PROJECT_v2.md':
        entry = f"\n* {summary}: {details}\n"

    elif fname == 'SESSION_LOG_v2.md':
        entry = f"\n## Session {datetime.now().strftime('%Y-%m-%d-%H%M')}\n\n**Start Time:** {timestamp}\n**Status:** In Progress\n**Objective:** {summary}\n\n### Log\n\n* {details}\n"

    elif fname == 'CURRENT_STATE_v2.md':
        entry = f"\n* {summary}: {details}\n"

    elif fname == 'STAGING_INTENT.md':
        entry = f"\n## Active Staged Action\n\n- **Timestamp:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}\n- **Target Component:** {summary}\n- **Planned Action:** {details}\n- **Status:** In-Progress\n\n---\n"

    else:
        entry = f"\n### Update: {summary}\n\n{details}\n---\n"

    new_content = insert_entry(content, fname, entry)

    if new_content != content:
        if write_file(os.path.join('memory', fname), new_content):
            print(f"[PROMOTE] Promoted to {fname}: {summary}")
            return True

    return False


def insert_entry(content, filename, entry):
    lines = content.split('\n')

    if filename == 'DECISIONS_v2.md':
        insert_idx = len(lines)
        for i, line in enumerate(lines):
            if line.startswith('### Decision:'):
                insert_idx = i
                break
        lines.insert(insert_idx, entry)

    elif filename == 'LESSONS_v2.md':
        for i, line in enumerate(lines):
            if '## Recent Lessons' in line:
                lines.insert(i + 1, entry)
                break

    elif filename == 'SESSION_LOG_v2.md':
        for i, line in enumerate(lines):
            if line.startswith('## Session'):
                lines.insert(i, entry)
                break

    elif filename == 'ACTIVE_PROJECT_v2.md':
        for i, line in enumerate(lines):
            if '## Next Actions' in line or '## Known Bugs' in line or '### Known Bugs' in line:
                lines.insert(i + 1, entry)
                break

    elif filename == 'CURRENT_STATE_v2.md':
        for i, line in enumerate(lines):
            if '## Next Actions' in line:
                lines.insert(i + 1, entry)
                break

    elif filename == 'STAGING_INTENT.md':
        for i, line in enumerate(lines):
            if '## Active Staged Action' in line:
                lines.insert(i + 1, entry)
                break

    return '\n'.join(lines)


def run_character_limiter():
    try:
        result = subprocess.run([
            sys.executable, os.path.join(get_repo_root(), 'tools', 'character_limiter.py')
        ], cwd=get_repo_root(), capture_output=True, text=True, timeout=30, encoding='utf-8', errors='replace')
        if result.returncode == 0:
            print("[PROMOTE] Character limits enforced")
            return True
        else:
            print(f"[PROMOTE] Character limiter warning: {result.stderr}")
            return False
    except Exception as e:
        print(f"[PROMOTE] Character limiter failed: {e}")
        return False


def session_end_checkpoint(work_log=None, git_diff=None, agent_notes=None):
    print("\n[CHECKPOINT] Session-end checkpoint initiated...")

    changes = detect_significant_changes(work_log, git_diff, agent_notes)
    print(f"[CHECKPOINT] Detected {len(changes)} significant change(s)")

    promoted = 0
    for category, summary, details, evidence in changes:
        if promote_to_memory(category, summary, details, evidence):
            promoted += 1

    print(f"[CHECKPOINT] Promoted {promoted} change(s) to memory")

    try:
        result = subprocess.run([
            sys.executable, os.path.join(get_repo_root(), 'tools', 'character_limiter.py')
        ], cwd=get_repo_root(), capture_output=True, text=True, timeout=30, encoding='utf-8', errors='replace')
        if result.returncode == 0:
            print("[CHECKPOINT] Character limits enforced")
        else:
            print(f"[CHECKPOINT] Character limiter warning: {result.stderr}")
    except Exception as e:
        print(f"[CHECKPOINT] Character limiter failed: {e}")

    try:
        result = subprocess.run([
            sys.executable, os.path.join(get_repo_root(), 'tools', 'continuity_bootstrap_v2.py')
        ], cwd=get_repo_root(), capture_output=True, text=True, timeout=30, encoding='utf-8', errors='replace')
        if result.returncode == 0:
            print("[CHECKPOINT] Bootstrap regenerated for next session")
        else:
            print(f"[CHECKPOINT] Bootstrap warning: {result.stderr}")
    except Exception as e:
        print(f"[CHECKPOINT] Bootstrap failed: {e}")

    summary = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'changes_detected': len(changes),
        'promoted': promoted,
        'categories': list(set(c for c, _, _, _ in changes)) if changes else [],
    }

    print(f"[CHECKPOINT] Complete: {summary}")
    return summary


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Amir OS Memory Promoter')
    parser.add_argument('--check', action='store_true', help='Check for promotable changes')
    parser.add_argument('--promote', action='store_true', help='Auto-promote detected changes')
    parser.add_argument('--session-end', action='store_true', help='Run session-end checkpoint')
    parser.add_argument('--work-log', help='Work log text to analyze')
    parser.add_argument('--git-diff', help='Git diff to analyze')
    parser.add_argument('--notes', help='Agent notes to analyze')

    args = parser.parse_args()

    root = get_repo_root()

    work_log = args.work_log
    git_diff = args.git_diff
    agent_notes = args.notes

    if not git_diff:
        try:
            result = subprocess.run(['git', 'diff'], cwd=get_repo_root(),
                                    capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                git_diff = result.stdout
        except Exception:
            pass

    if args.check:
        changes = detect_significant_changes(work_log, git_diff, args.notes)
        if changes:
            print(f"[PROMOTE] Found {len(changes)} promotable change(s):")
            for cat, summary, details, ev in changes:
                print(f"  [{cat}] {summary}: {details[:100]}...")
        else:
            print("[PROMOTE] No significant changes detected")
        return 0

    if args.promote:
        changes = detect_significant_changes(work_log, git_diff, args.notes)
        promoted = 0
        for category, summary, details, evidence in changes:
            if promote_to_memory(category, summary, details, evidence):
                promoted += 1
        if promoted:
            run_character_limiter()
        print(f"[PROMOTE] Promoted {promoted} change(s)")
        return 0

    if args.session_end:
        session_end_checkpoint(args.work_log, args.git_diff, args.notes)
        return 0

    parser.print_help()
    return 1


if __name__ == '__main__':
    sys.exit(main())

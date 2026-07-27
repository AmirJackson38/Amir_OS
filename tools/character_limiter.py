#!/usr/bin/env python3
"""
character_limiter.py — Enforces hard character limits on v2 memory files.
"""
import os
import sys
import re
import io

# Force UTF-8 on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Hard character limits per file (as defined in ARCHITECTURE_AUDIT_v2.md)
LIMITS = {
    'memory/CURRENT_STATE_v2.md': 1500,
    'memory/ACTIVE_PROJECT_v2.md': 1500,
    'memory/DECISIONS_v2.md': 1000,
    'memory/LESSONS_v2.md': 1000,
    'memory/SESSION_LOG_v2.md': 2500,
}

def get_repo_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def count_chars(filepath):
    """Count characters in file."""
    full = os.path.join(get_repo_root(), filepath)
    if not os.path.exists(full):
        return 0
    try:
        with open(full, 'r', encoding='utf-8') as f:
            return len(f.read())
    except Exception as e:
        print(f"[ERROR] Reading {filepath}: {e}")
        return 0

def compact_session_log(root, limit=2500):
    """Compact SESSION_LOG_v2.md to fit within limit."""
    path = os.path.join(root, 'memory', 'SESSION_LOG_v2.md')
    if not os.path.exists(path):
        return False, "SESSION_LOG_v2.md not found"
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_len = len(content)
    if original_len <= limit:
        return False, f"Already within limit ({original_len} <= {limit})"
    
    # Split into header + sessions
    lines = content.split('\n')
    header_lines = []
    sessions = []
    current_session = None
    in_session = False
    
    for line in lines:
        if line.startswith('## Session'):
            if current_session:
                sessions.append(current_session)
            current_session = [line]
            in_session = True
        elif in_session:
            current_session.append(line)
        elif not in_session and not current_session:
            header_lines.append(line)
    
    if current_session:
        sessions.append(current_session)
    
    # Keep header + newest sessions that fit
    header = '\n'.join(header_lines)
    header_len = len(header)
    
    kept = []
    total = header_len
    
    for session in reversed(sessions):
        session_text = '\n'.join(session)
        if total + len(session_text) + 1 <= limit:
            kept.insert(0, session_text)
            total += len(session_text) + 1
        else:
            # Try condensed version (just objectives + key bullets)
            condensed = []
            for line in session:
                if (line.startswith('## Session') or 
                    line.startswith('**Objective:**') or 
                    line.startswith('* **') or
                    line.startswith('**Start Time:**') or
                    line.startswith('**Status:**')):
                    condensed.append(line)
            condensed_text = '\n'.join(condensed)
            if total + len(condensed_text) + 1 <= limit:
                kept.insert(0, condensed_text)
                total += len(condensed_text) + 1
            else:
                break
    
    new_content = header + '\n\n' + '\n\n'.join(kept) + '\n'
    if len(new_content) > limit:
        # Emergency truncate
        new_content = new_content[:limit] + '\n... [TRUNCATED]'
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    return True, f"Compacted {original_len} -> {len(new_content)} chars (limit: {limit})"

def compact_lessons(root, limit=1000):
    """Compact LESSONS_v2.md to fit within limit."""
    path = os.path.join(root, 'memory', 'LESSONS_v2.md')
    if not os.path.exists(path):
        return False, "LESSONS_v2.md not found"
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_len = len(content)
    if original_len <= limit:
        return False, f"Already within limit ({original_len} <= {limit})"
    
    # Keep header + last 5 lessons (rolling window)
    lines = content.split('\n')
    header_end = 0
    for i, line in enumerate(lines):
        if line.startswith('## Recent Lessons'):
            header_end = i
            break
    
    header = '\n'.join(lines[:header_end])
    
    # Find lessons (each starts with "### Lesson:")
    lessons = []
    current = None
    for line in lines[header_end:]:
        if line.startswith('### Lesson:'):
            if current:
                lessons.append(current)
            current = [line]
        elif current is not None:
            current.append(line)
    if current:
        lessons.append(current)
    
    # Keep last 5 lessons
    kept_lessons = lessons[-5:]
    kept_text = [header] + ['\n'.join(l) for l in kept_lessons]
    new_content = '\n'.join(kept_text) + '\n'
    
    if len(new_content) > limit:
        # Further compress - just titles + dates
        kept_text = [header]
        for lesson in lessons[-5:]:
            title_line = lesson[0] if lesson else ""
            if title_line:
                kept_text.append(title_line)
        new_content = '\n'.join(kept_text) + '\n'
    
    if len(new_content) > limit:
        new_content = new_content[:limit] + '\n... [TRUNCATED]'
    
    path_full = os.path.join(root, 'memory', 'LESSONS_v2.md')
    with open(path_full, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    return True, f"Compacted {original_len} -> {len(new_content)} chars (limit: {limit})"

def compact_decisions(root, limit=1000):
    """Compact DECISIONS_v2.md to fit within limit."""
    path = os.path.join(root, 'memory', 'DECISIONS_v2.md')
    if not os.path.exists(path):
        return False, "DECISIONS_v2.md not found"
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_len = len(content)
    if original_len <= limit:
        return False, f"Already within limit ({original_len} <= {limit})"
    
    # Keep header + last 3 decisions
    lines = content.split('\n')
    header_end = 0
    for i, line in enumerate(lines):
        if line.startswith('## Latest Decisions'):
            header_end = i
            break
    
    header = '\n'.join(lines[:header_end])
    
    # Find decisions (each starts with "### Decision:")
    decisions = []
    current = None
    for line in lines[header_end:]:
        if line.startswith('### Decision:'):
            if current:
                decisions.append(current)
            current = [line]
        elif current is not None:
            current.append(line)
    if current:
        decisions.append(current)
    
    # Keep last 3
    kept = decisions[-3:]
    kept_text = [header] + ['\n'.join(d) for d in kept]
    new_content = '\n'.join(kept_text) + '\n'
    
    if len(new_content) > limit:
        new_content = new_content[:limit] + '\n... [TRUNCATED]'
    
    path_full = os.path.join(root, 'memory', 'DECISIONS_v2.md')
    with open(path_full, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    return True, f"Compacted {original_len} -> {len(new_content)} chars (limit: {limit})"

def compact_active_project(root, limit=1500):
    """Compact ACTIVE_PROJECT_v2.md to fit within limit."""
    path = os.path.join(root, 'memory', 'ACTIVE_PROJECT_v2.md')
    if not os.path.exists(path):
        return False, "ACTIVE_PROJECT_v2.md not found"
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_len = len(content)
    if original_len <= limit:
        return False, f"Already within limit ({original_len} <= {limit})"
    
    # Keep only essential sections - remove verbose descriptions
    lines = content.split('\n')
    
    # Identify sections
    sections = {}
    current_section = None
    current_lines = []
    
    for line in lines:
        if line.startswith('## ') or line.startswith('### '):
            if current_section:
                sections[current_section] = current_lines
            current_section = line
            current_lines = [line]
        else:
            current_lines.append(line)
    
    if current_section:
        sections[current_section] = current_lines
    
    # Priority order - keep only essential sections, compress verbose ones
    priority = [
        '## Current Priority',
        '## Project Breakdown',
        '### 1. TARS World Engine',
        '### 2. Amir OS Memory Architecture',
        '### 3. Home Lab',
        '## Next Actions',
        '## Key Files',
        '## See Also'
    ]
    
    kept = []
    for section_name in priority:
        if section_name in sections:
            # For verbose sections, compress bullet points
            if section_name in ['### 1. TARS World Engine', '### 2. Amir OS Memory Architecture']:
                # Keep only first few lines of each subsection
                compressed = []
                for line in sections[section_name]:
                    compressed.append(line)
                    # Stop after reasonable length per subsection
                    if len('\n'.join(compressed)) > 200:
                        break
                kept.extend(compressed)
            else:
                kept.extend(sections[section_name])
            kept.append('')  # blank line
    
    new_content = '\n'.join(kept).strip() + '\n'
    
    if len(new_content) > limit:
        new_content = new_content[:limit] + '\n... [TRUNCATED]'
    
    path_full = os.path.join(root, 'memory', 'ACTIVE_PROJECT_v2.md')
    with open(path_full, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    return True, f"Compacted {original_len} -> {len(new_content)} chars (limit: {limit})"
    """Compact CURRENT_STATE_v2.md to fit within limit."""
    path = os.path.join(root, 'memory', 'CURRENT_STATE_v2.md')
    if not os.path.exists(path):
        return False, "CURRENT_STATE_v2.md not found"
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_len = len(content)
    if original_len <= limit:
        return False, f"Already within limit ({original_len} <= {limit})"
    
    # Keep only essential sections
    lines = content.split('\n')
    
    # Identify sections
    sections = {}
    current_section = None
    current_lines = []
    
    for line in lines:
        if line.startswith('## '):
            if current_section:
                sections[current_section] = current_lines
            current_section = line
            current_lines = [line]
        else:
            current_lines.append(line)
    
    if current_section:
        sections[current_section] = current_lines
    
    # Priority: Active Focus, Active Projects, Completed This Session, Next Actions
    priority = ['## Active Focus', '## Active Projects', '## Completed This Session', '## Next Actions', '## Key Files', '## See']
    
    kept = []
    for section_name in priority:
        if section_name in sections:
            kept.extend(sections[section_name])
            kept.append('')  # blank line
    
    new_content = '\n'.join(kept).strip() + '\n'
    
    if len(new_content) > limit:
        new_content = new_content[:limit] + '\n... [TRUNCATED]'
    
    path_full = os.path.join(root, 'memory', 'CURRENT_STATE_v2.md')
    with open(path_full, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    return True, f"Compacted {original_len} -> {len(new_content)} chars (limit: {limit})"

def main():
    root = get_repo_root()
    print(f"[CHARACTER_LIMITER] Checking v2 memory files against hard limits...\n")
    
    violations = []
    
    # Check all files
    for filepath, limit in LIMITS.items():
        full = os.path.join(root, filepath)
        if os.path.exists(full):
            chars = count_chars(filepath)
            if chars > limit:
                violations.append((filepath, chars, limit, chars - limit))
                print(f"[VIOLATION] {filepath}: {chars} chars (limit: {limit}, over by {chars - limit})")
            else:
                print(f"[OK]        {filepath}: {chars} / {limit} chars")
        else:
            print(f"[MISSING]   {filepath}")
    
    if not violations:
        print("\n✅ All memory files within hard limits.")
        return 0
    
    print(f"\n[CHARACTER_LIMITER] {len(violations)} file(s) over limit. Auto-compacting...")
    
    for filepath, chars, limit, over in violations:
        fname = os.path.basename(filepath)
        print(f"\n--- Compacting {fname} ---")
        
        if fname == 'SESSION_LOG_v2.md':
            ok, msg = compact_session_log(get_repo_root(), LIMITS[filepath])
        elif fname == 'LESSONS_v2.md':
            ok, msg = compact_lessons(get_repo_root(), LIMITS[filepath])
        elif fname == 'DECISIONS_v2.md':
            ok, msg = compact_decisions(get_repo_root(), LIMITS[filepath])
        elif fname == 'CURRENT_STATE_v2.md':
            ok, msg = compact_current_state(get_repo_root(), LIMITS[filepath])
        elif fname == 'ACTIVE_PROJECT_v2.md':
            ok, msg = compact_active_project(get_repo_root(), LIMITS[filepath])
        else:
            print(f"  [SKIP] No compaction logic for {fname}")
            continue
        
        if ok:
            print(f"  ✅ {msg}")
        else:
            print(f"  ⚠️  {msg}")
    
    # Final verification
    print("\n[VERIFICATION]")
    for filepath, limit in LIMITS.items():
        full = os.path.join(get_repo_root(), filepath)
        if os.path.exists(full):
            chars = count_chars(filepath)
            status = "✅" if chars <= limit else "❌"
            print(f"  {status} {os.path.basename(filepath)}: {chars} / {limit}")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
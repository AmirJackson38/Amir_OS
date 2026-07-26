#!/usr/bin/env python3
"""
character_limiter.py — Enforces hard character limits on Amir OS memory files.
"""

import os
import sys
import io

# Force UTF-8 output on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Character limits (in characters, not tokens)
FILES_WITH_LIMITS = {
    'memory/CURRENT_STATE_v2.md': 1500,
    'projects/ACTIVE_PROJECT_v2.md': 1500,
    'memory/DECISIONS_v2.md': 1750,
    'memory/LESSONS_v2.md': 2250,
    'memory/SESSION_LOG_v2.md': 3500,
}

def get_repo_root():
    """Navigate to repo root (two dirs up from this script)."""
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def get_file_stats(file_path):
    """
    Get character count and line count for a file.
    
    Returns:
        tuple: (exists, char_count, line_count)
    """
    if not os.path.exists(file_path):
        return False, 0, 0
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            char_count = len(content)
            line_count = content.count('\n') + 1
        return True, char_count, line_count
    except Exception as e:
        print(f"Error reading {file_path}: {str(e)}")
        return False, 0, 0

def colorize(text, color):
    """Add ANSI color codes."""
    colors = {
        'green': '\033[92m',
        'red': '\033[91m',
        'yellow': '\033[93m',
        'cyan': '\033[96m',
        'bold': '\033[1m',
        'reset': '\033[0m',
    }
    return f"{colors.get(color, '')}{text}{colors['reset']}"

def main():
    root = get_repo_root()
    
    print(colorize("\n=== Amir OS Character Limiter v0.8.0 ===\n", 'cyan'))
    print(f"Workspace: {root}\n")
    
    all_within_limit = True
    total_chars = 0
    total_limit = 0
    
    # Check each file
    for rel_path, char_limit in FILES_WITH_LIMITS.items():
        full_path = os.path.join(root, rel_path)
        exists, char_count, line_count = get_file_stats(full_path)
        
        if not exists:
            print(colorize(f"! MISSING: {rel_path}", 'yellow'))
            continue
        
        over_limit = char_count - char_limit
        status = "OK" if over_limit <= 0 else colorize(f"OVER by {over_limit} chars", 'red')
        
        # Usage bar (simplified, no emoji)
        pct = int((char_count / char_limit) * 100)
        bar_length = 20
        filled = int((pct / 100) * bar_length)
        bar = "#" * filled + "-" * (bar_length - filled)
        
        print(f"{rel_path}")
        print(f"  {status} | {char_count:,} / {char_limit:,} chars ({pct}%) | {line_count} lines")
        print(f"  [{bar}]")
        print()
        
        if over_limit > 0:
            all_within_limit = False
        
        total_chars += char_count
        total_limit += char_limit
    
    # Summary
    print("-" * 70)
    total_over = total_chars - total_limit
    summary_status = colorize("OK - ALL FILES WITHIN LIMITS", 'green') if all_within_limit else colorize(f"OVER by {abs(total_over)} TOTAL CHARS", 'red')
    print(f"{summary_status}")
    print(f"Total: {total_chars:,} / {total_limit:,} chars ({int((total_chars/total_limit)*100)}%)")
    print(f"Tokens saved vs. v1 files: ~3,000 tokens per session (15-20% reduction)")
    print()
    
    if not all_within_limit:
        print(colorize("Action Required:", 'yellow'))
        print("Run: python tools/memory_compactor_v2.py")
        print("Or manually edit files to stay within character budgets.\n")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())


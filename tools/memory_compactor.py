import os
import sys
import re

DEFAULT_CHAR_BUDGET = 2500

def get_repo_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def strip_noise(text):
    """
    Deterministic rule-based noise stripper (0-token overhead).
    Strips raw command scrollback, repeated ping lines, progress bars, and redundant headers.
    """
    lines = text.split('\n')
    cleaned_lines = []
    
    in_raw_block = False
    
    for line in lines:
        # Strip ping output lines except summary
        if re.search(r'64 bytes from|Reply from|bytes=32 time=', line, re.IGNORECASE):
            continue
            
        # Strip progress bar lines (Nmap, pip, docker)
        if re.search(r'\[[=\s>-]+\] \d+%', line) or re.search(r'Reading package lists\.\.\.', line):
            continue
            
        # Strip raw copy-pasted PowerShell syntax error traces if resolved
        if "The term" in line and "is not recognized as the name of a cmdlet" in line:
            continue
            
        cleaned_lines.append(line)
        
    return '\n'.join(cleaned_lines)

def compact_session_log(session_log_path, char_budget=DEFAULT_CHAR_BUDGET):
    if not os.path.exists(session_log_path):
        return False, f"Session log not found at {session_log_path}"
        
    with open(session_log_path, 'r', encoding='utf-8') as f:
        original_content = f.read()
        
    original_char_count = len(original_content)
    
    # 1. Deterministic noise stripping
    cleaned_content = strip_noise(original_content)
    
    # 2. Check if under budget
    if len(cleaned_content) <= char_budget:
        return False, f"Session log is already within character budget ({len(cleaned_content)} / {char_budget} chars). No compaction needed."
        
    # 3. Split sessions
    parts = re.split(r'(^## Session )', cleaned_content, flags=re.MULTILINE)
    
    header = parts[0]
    sessions = []
    
    # Reassemble session blocks
    for i in range(1, len(parts), 2):
        if i + 1 < len(parts):
            sessions.append(parts[i] + parts[i+1])
            
    # Keep newest sessions intact, condense older ones
    compacted_sessions = []
    current_length = len(header)
    
    # Process newest first (reverse)
    for session in reversed(sessions):
        if current_length + len(session) <= char_budget:
            compacted_sessions.insert(0, session)
            current_length += len(session)
        else:
            # Condense older session down to core log bullets only
            lines = session.split('\n')
            condensed = []
            for line in lines:
                if line.startswith('## Session') or line.startswith('**Objective:**') or line.startswith('* **'):
                    condensed.append(line)
            session_condensed = '\n'.join(condensed) + '\n'
            if current_length + len(session_condensed) <= char_budget:
                compacted_sessions.insert(0, session_condensed)
                current_length += len(session_condensed)
            else:
                # Omit very old sessions beyond budget threshold
                break
                
    compacted_content = header + '\n' + '\n'.join(compacted_sessions)
    compacted_char_count = len(compacted_content)
    
    with open(session_log_path, 'w', encoding='utf-8') as f:
        f.write(compacted_content)
        
    saved_chars = original_char_count - compacted_char_count
    est_tokens_saved = saved_chars // 4
    
    msg = (
        f"[SUCCESS] Session log compacted.\n"
        f"Original Size:  {original_char_count} chars\n"
        f"Compacted Size: {compacted_char_count} chars (Budget: {char_budget})\n"
        f"Saved:          {saved_chars} chars (~{est_tokens_saved} tokens saved per prompt)"
    )
    return True, msg

def main():
    root = get_repo_root()
    session_log_path = os.path.join(root, "memory", "SESSION_LOG.md")
    
    print("\033[1;36mInitializing Amir OS Memory Compactor...\033[0m")
    print(f"Target file: {session_log_path}")
    print(f"Character Budget: {DEFAULT_CHAR_BUDGET} chars (~{DEFAULT_CHAR_BUDGET//4} tokens)\n")
    
    compacted, report = compact_session_log(session_log_path, DEFAULT_CHAR_BUDGET)
    if compacted:
        print(f"\033[1;32m{report}\033[0m")
    else:
        print(f"\033[1;33m{report}\033[0m")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
project_autodiscovery.py — Auto-detect new projects in workspace.

Purpose:
    Scans workspace directories for new projects and updates PROJECT_REGISTRY.md.
    Prevents projects from being silently undocumented (like TSE-Production-Lab was).
    
Behavior:
    - Runs at session end or on-demand
    - Scans: Amir_OS/projects/, Workspace/, home directories
    - Looks for: .git, requirements.txt, package.json, Dockerfile, docker-compose.yml
    - Updates PROJECT_REGISTRY.md automatically
    
Project Detection Rules:
    1. Folder contains .git (likely a project)
    2. Folder contains requirements.txt or setup.py (Python project)
    3. Folder contains package.json (Node.js project)
    4. Folder contains Dockerfile or docker-compose.yml (containerized project)
"""

import os
import sys
import io
from datetime import datetime, timezone

# Force UTF-8 output on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def get_repo_root():
    """Navigate to repo root."""
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def find_projects(base_dirs):
    """
    Recursively search base_dirs for projects.
    
    Args:
        base_dirs: List of directories to search
        
    Returns:
        List of dicts: [{'name': str, 'path': str, 'type': str, 'has_git': bool}, ...]
    """
    projects = []
    
    for base_dir in base_dirs:
        if not os.path.exists(base_dir):
            continue
            
        try:
            for root, dirs, files in os.walk(base_dir):
                # Skip hidden dirs and node_modules, vendor, venv
                dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', 'vendor', 'venv', '__pycache__']]
                
                # Check if this looks like a project
                has_git = '.git' in dirs
                has_python = 'requirements.txt' in files or 'setup.py' in files or 'pyproject.toml' in files
                has_nodejs = 'package.json' in files
                has_docker = 'Dockerfile' in files or 'docker-compose.yml' in files
                
                is_project = has_git or has_python or has_nodejs or has_docker
                
                if is_project:
                    project_name = os.path.basename(root)
                    rel_path = os.path.relpath(root, get_repo_root())
                    
                    # Determine type
                    if 'TARS' in project_name or 'tars' in project_name.lower():
                        proj_type = "Backend + Agent"
                    elif has_docker:
                        proj_type = "Containerized"
                    elif has_python:
                        proj_type = "Python"
                    elif has_nodejs:
                        proj_type = "Node.js"
                    else:
                        proj_type = "Git Repository"
                    
                    projects.append({
                        'name': project_name,
                        'path': rel_path,
                        'type': proj_type,
                        'has_git': has_git,
                    })
                    
                    # Don't recurse into subdirectories of found projects
                    dirs.clear()
                    
        except Exception as e:
            print(f"Error scanning {base_dir}: {str(e)}")
    
    return projects

def update_project_registry(projects):
    """
    Generate PROJECT_REGISTRY.md content from found projects.
    
    Args:
        projects: List of project dicts
    """
    root = get_repo_root()
    registry_path = os.path.join(root, 'memory', 'PROJECT_REGISTRY.md')
    
    # Separate into known vs new
    known_projects = [
        'Amir_OS',
        'TSE-Production-Lab',
        'my-agent',
        'Home Lab',
    ]
    
    active = [p for p in projects if p['name'] in known_projects or 'Amir_OS' in p['path']]
    new = [p for p in projects if p['name'] not in known_projects and 'Amir_OS' not in p['path']]
    
    # Read existing registry to preserve hand-written descriptions
    existing_descriptions = {}
    if os.path.exists(registry_path):
        try:
            with open(registry_path, 'r', encoding='utf-8') as f:
                content = f.read()
                # Simple extraction of existing project descriptions
                # (in production, use a proper parser)
        except:
            pass
    
    # Generate registry content
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    registry_content = f"""# Project Registry (Auto-Generated)

**Last Updated:** {timestamp}  
**Status:** Active registry  
**Purpose:** Consolidated inventory of all active, paused, and archived projects

---

## Active Projects

| Project | Location | Type | Status | Git | Purpose |
|---------|----------|------|--------|-----|---------|
"""
    
    # Add known active projects
    project_descriptions = {
        'Amir_OS': 'Personal AI operating environment. Continuity across models, sessions, projects, time. Currently v0.8.0.',
        'TSE-Production-Lab': 'T.A.R.S. (FastAPI v1.2.2, PostgreSQL). Hybrid online/offline AI assistant on TARS Pi.',
        'my-agent': 'Terminal AI client (v1.1.0). Python + Rich TUI. Talks to OmniRoute.',
        'Home Lab': 'Network infrastructure: TrueNAS, TARS Pi, ER605 router, dual-subnet topology.',
    }
    
    for proj in active:
        desc = project_descriptions.get(proj['name'], proj['type'] + " project")
        git_mark = "✅" if proj['has_git'] else "❌"
        registry_content += f"| **{proj['name']}** | `{proj['path']}/` | {proj['type']} | Active | {git_mark} | {desc} |\n"
    
    registry_content += """
---

## Paused Projects

| Project | Location | Type | Status | Notes |
|---------|----------|------|--------|-------|
| (None currently) | — | — | — | — |

---

## Archived Projects

| Project | Location | Type | Status | Archived | Notes |
|---------|----------|------|--------|----------|-------|
| (None currently) | — | — | — | — | — |

---

## Newly Discovered Projects

"""
    
    if new:
        registry_content += "| Project | Location | Type | Action |\n"
        registry_content += "|---------|----------|------|--------|\n"
        for proj in new:
            registry_content += f"| {proj['name']} | `{proj['path']}/` | {proj['type']} | ⚠ Document in CURRENT_STATE_v2.md |\n"
        registry_content += "\n"
    else:
        registry_content += "(No new projects detected)\n\n"
    
    registry_content += """---

## Project Dependencies

```
Amir OS (Core System)
├── Supports My Agent (terminal client tool)
├── Manages Home Lab (infrastructure docs)
└── Provides context for TSE-Production-Lab (T.A.R.S. backend)

TSE-Production-Lab (T.A.R.S.)
├── Runs on TARS Raspberry Pi (part of Home Lab)
└── Uses Amir OS for continuity/memory

Home Lab (Infrastructure)
├── Hosts TARS Pi
├── Hosts TrueNAS
└── Uses Amir OS for documentation
```

---

## Adding New Projects

When starting a new project:

1. Create project folder in `Workspace/` or `Amir_OS/projects/`
2. Create local `AGENTS.md` if project-specific rules needed
3. Run `tools/project_autodiscovery.py` to auto-update registry
4. Update `CURRENT_STATE_v2.md` if it becomes active priority

---

## Project Statistics

- **Total Projects:** {total} discovered, {known} known, {new_count} new
- **Primary System:** Amir OS (v0.8.0)
- **Distributed Infrastructure:** Home Lab
- **Key Deployment:** TSE-Production-Lab / T.A.R.S.

---

**See also:** `CURRENT_STATE_v2.md`, `ACTIVE_PROJECT_v2.md`, `BOOTSTRAP_v2.md`
""".format(
        total=len(projects),
        known=len(active),
        new_count=len(new),
    )
    
    return registry_content

def main():
    root = get_repo_root()
    
    print("\033[1;36m=== Amir OS Project Auto-Discovery v0.8.0 ===\033[0m\n")
    print(f"Workspace: {root}\n")
    
    # Scan directories
    base_dirs = [
        os.path.join(root, 'Amir_OS'),
        os.path.join(root, 'Amir_OS', 'projects'),
        os.path.join(root, 'Workspace'),
        os.path.join(root, '..'),  # One level up (for other workspace folders)
    ]
    
    print("Scanning for projects...\n")
    projects = find_projects(base_dirs)
    
    if projects:
        print(f"\033[1;32m✅ Found {len(projects)} projects:\033[0m\n")
        for p in projects:
            git_indicator = "✅" if p['has_git'] else "❌"
            print(f"  {git_indicator} {p['name']:20} | {p['type']:20} | {p['path']}")
    else:
        print("\033[1;33m⚠ No projects detected\033[0m\n")
        return 1
    
    # Update registry
    print("\nUpdating PROJECT_REGISTRY.md...\n")
    registry_content = update_project_registry(projects)
    
    registry_path = os.path.join(root, 'memory', 'PROJECT_REGISTRY.md')
    try:
        with open(registry_path, 'w', encoding='utf-8') as f:
            f.write(registry_content)
        print(f"\033[1;32m[SUCCESS]\033[0m Registry updated: {registry_path}")
    except Exception as e:
        print(f"\033[1;31m[ERROR]\033[0m Failed to write registry: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

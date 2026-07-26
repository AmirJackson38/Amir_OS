import os
import re
import subprocess
import time
import inspect
from pathlib import Path

TOOL_CALL_RE = re.compile(r'TOOL_CALL:\s*(\w+)(.*)', re.DOTALL)
TOOL_RESULT_RE = re.compile(r'TOOL_RESULT:\s*(\w+)\s+(\S+)')
ARG_RE = re.compile(r'(\w+)=("(?:[^"\\]|\\.)*"|\S+)')

SANDBOX_ROOT = Path(os.environ.get(
    "MY_AGENT_SANDBOX",
    Path(__file__).resolve().parents[4]
)).resolve()

MEMORY_DIR = SANDBOX_ROOT / "memory"
CUSTOM_TOOLS_DIR = Path.home() / ".myagent" / "custom_tools"


def _resolve_path(path_str):
    p = (SANDBOX_ROOT / path_str).resolve()
    if not str(p).startswith(str(SANDBOX_ROOT) + os.sep) and p != SANDBOX_ROOT:
        raise PermissionError(f"Path {p} is outside sandbox {SANDBOX_ROOT}")
    return p


def _parse_args(args_str):
    args = {}
    for m in ARG_RE.finditer(args_str):
        key = m.group(1)
        val = m.group(2)
        if val.startswith('"') and val.endswith('"'):
            val = val[1:-1]
            val = val.replace('\\"', '"').replace('\\n', '\n').replace('\\t', '\t')
        args[key] = val
    return args


def parse_tool_call(text):
    for m in TOOL_CALL_RE.finditer(text):
        name = m.group(1).strip()
        args_str = m.group(2).strip()
        return name, _parse_args(args_str)
    return None, None


def format_tool_result(name, success, output, duration_ms):
    status = "success" if success else "error"
    lines = [f"TOOL_RESULT: {name} {status}", f"Duration: {duration_ms}ms"]
    if isinstance(output, str):
        lines.append(output)
    elif isinstance(output, dict):
        for k, v in output.items():
            lines.append(f"{k}: {v}")
    return "\n".join(lines)


def read_file(path):
    p = _resolve_path(path)
    if not p.is_file():
        return {"success": False, "error": f"File not found: {p}"}
    content = p.read_text(encoding="utf-8")
    return {"success": True, "content": content, "lines": len(content.splitlines())}


def write_file(path, content):
    p = _resolve_path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return {"success": True, "path": str(p.relative_to(SANDBOX_ROOT)), "bytes": len(content.encode("utf-8"))}


def run_shell(command):
    try:
        result = subprocess.run(
            command, shell=True, capture_output=True, text=True, timeout=30, cwd=SANDBOX_ROOT
        )
        output = result.stdout
        if result.stderr:
            output += "\n[stderr]\n" + result.stderr
        return {"success": result.returncode == 0, "output": output, "returncode": result.returncode}
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Command timed out after 30s"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def git_run(args):
    return run_shell(f"git {args}")


def grep_search(pattern, include=None):
    matches = []
    try:
        for p in SANDBOX_ROOT.rglob("*"):
            if p.is_file():
                if include and not p.match(include):
                    continue
                try:
                    text = p.read_text(encoding="utf-8", errors="replace")
                    for i, line in enumerate(text.splitlines(), 1):
                        if re.search(pattern, line):
                            rel = str(p.relative_to(SANDBOX_ROOT))
                            matches.append(f"{rel}:{i}: {line.strip()}")
                except (OSError, UnicodeDecodeError):
                    pass
        return {"success": True, "matches": matches, "count": len(matches)}
    except Exception as e:
        return {"success": False, "error": str(e)}


def glob_search(pattern):
    files = [str(p) for p in SANDBOX_ROOT.rglob(pattern) if p.is_file()]
    rel_files = [str(Path(f).relative_to(SANDBOX_ROOT)) for f in sorted(files)]
    return {"success": True, "files": rel_files, "count": len(rel_files)}


def list_dir(path=""):
    target = SANDBOX_ROOT if not path else _resolve_path(path)
    if not target.is_dir():
        return {"success": False, "error": f"Not a directory: {target}"}
    entries = []
    for e in sorted(target.iterdir()):
        rel = str(e.relative_to(SANDBOX_ROOT)) if e != SANDBOX_ROOT else "."
        info = {"name": rel, "type": "dir" if e.is_dir() else "file"}
        if e.is_file():
            info["size"] = e.stat().st_size
        entries.append(info)
    return {"success": True, "path": str(target.relative_to(SANDBOX_ROOT)) if target != SANDBOX_ROOT else ".", "entries": entries}


def memory_read(path):
    p = (MEMORY_DIR / path).resolve()
    if not str(p).startswith(str(MEMORY_DIR) + os.sep) and p != MEMORY_DIR:
        return {"success": False, "error": f"Path {p} is outside memory directory"}
    if not p.is_file():
        return {"success": False, "error": f"Memory file not found: {p}"}
    content = p.read_text(encoding="utf-8")
    return {"success": True, "content": content, "lines": len(content.splitlines())}


CUSTOM_TOOLS_DIR.mkdir(parents=True, exist_ok=True)


def _load_custom_tools():
    loaded = 0
    for f in sorted(CUSTOM_TOOLS_DIR.glob("*.py")):
        try:
            name = f.stem
            code = f.read_text(encoding="utf-8")
            ns = {}
            exec(code, ns)
            if name not in ns or not callable(ns[name]):
                continue
            sig = inspect.signature(ns[name])
            params = {p: f"Parameter: {p}" for p in sig.parameters}
            desc = f"Custom tool: {name}"
            TOOL_DEFINITIONS[name] = {
                "func": ns[name],
                "description": desc,
                "params": params,
                "custom": True,
            }
            loaded += 1
        except Exception:
            pass
    return loaded


def register_tool(name, python_code, description=""):
    if not name.isidentifier():
        return {"success": False, "error": f"Invalid tool name: '{name}' — must be a valid Python identifier"}
    if name in TOOL_DEFINITIONS and not TOOL_DEFINITIONS[name].get("custom"):
        return {"success": False, "error": f"'{name}' is a built-in tool and cannot be overridden"}
    clean = python_code.strip()
    if not clean:
        return {"success": False, "error": "No code provided"}
    try:
        compile(clean, f"<tool:{name}>", "exec")
    except SyntaxError as e:
        return {"success": False, "error": f"Syntax error: {e}"}
    ns = {}
    try:
        exec(clean, ns)
    except Exception as e:
        return {"success": False, "error": f"Execution error: {e}"}
    if name not in ns or not callable(ns[name]):
        return {"success": False, "error": f"Function '{name}()' not defined in provided code"}
    sig = inspect.signature(ns[name])
    params = {p: f"Parameter: {p}" for p in sig.parameters}
    tool_path = CUSTOM_TOOLS_DIR / f"{name}.py"
    tool_path.write_text(clean, encoding="utf-8")
    TOOL_DEFINITIONS[name] = {
        "func": ns[name],
        "description": description or f"Custom tool: {name}({', '.join(params)})",
        "params": params,
        "custom": True,
    }
    return {"success": True, "tool": name, "params": list(params.keys()), "file": str(tool_path)}


def update_tool(name, python_code, description=""):
    tool_path = CUSTOM_TOOLS_DIR / f"{name}.py"
    if not tool_path.exists():
        return {"success": False, "error": f"Custom tool '{name}' not found. Use register_tool to create it first."}
    if name in TOOL_DEFINITIONS and not TOOL_DEFINITIONS[name].get("custom"):
        return {"success": False, "error": f"'{name}' is a built-in tool and cannot be modified"}
    return register_tool(name, python_code, description)


def delete_tool(name):
    tool_path = CUSTOM_TOOLS_DIR / f"{name}.py"
    if name in TOOL_DEFINITIONS and not TOOL_DEFINITIONS[name].get("custom"):
        return {"success": False, "error": f"'{name}' is a built-in tool and cannot be deleted"}
    if name in TOOL_DEFINITIONS:
        del TOOL_DEFINITIONS[name]
    if tool_path.exists():
        tool_path.unlink()
        return {"success": True, "tool": name, "action": "deleted"}
    return {"success": False, "error": f"Tool '{name}' not found"}


def list_custom_tools():
    custom = {n: info for n, info in TOOL_DEFINITIONS.items() if info.get("custom")}
    return {"success": True, "tools": list(custom.keys()), "count": len(custom)}


def _run_audit():
    from .os_auditor import run_audit as _ra
    return _ra()


def _read_audit_report():
    from .os_auditor import read_latest_report as _rlr
    return _rlr()


TOOL_DEFINITIONS = {
    "read_file": {
        "func": read_file,
        "description": "Read contents of a file. Path is relative to project root.",
        "params": {"path": "Path to the file (relative to project root)"},
    },
    "write_file": {
        "func": write_file,
        "description": "Write content to a file. Creates parent directories if needed. Path is relative to project root.",
        "params": {"path": "Path to the file (relative to project root)", "content": "Text content to write"},
    },
    "run_shell": {
        "func": run_shell,
        "description": "Execute a shell command. Working directory is project root. 30s timeout.",
        "params": {"command": "Shell command to execute"},
    },
    "git_run": {
        "func": git_run,
        "description": "Run a git command. Working directory is project root. 30s timeout.",
        "params": {"args": "Git arguments (without the 'git' prefix)"},
    },
    "grep_search": {
        "func": grep_search,
        "description": "Search file contents using a regex pattern within the project.",
        "params": {"pattern": "Regex pattern to search for", "include": "Optional glob pattern to filter files (e.g. '*.py')"},
    },
    "glob_search": {
        "func": glob_search,
        "description": "Find files matching a glob pattern within the project.",
        "params": {"pattern": "Glob pattern (e.g. 'src/**/*.py', '*.md')"},
    },
    "list_dir": {
        "func": list_dir,
        "description": "List contents of a directory within the project.",
        "params": {"path": "Directory path relative to project root (default: root)"},
    },
    "memory_read": {
        "func": memory_read,
        "description": "Read a file from the memory/ directory (session logs, decisions, goals, etc.).",
        "params": {"path": "Path relative to memory/ directory"},
    },
    "register_tool": {
        "func": register_tool,
        "description": "Create a new custom tool at runtime. Provide Python code that defines a function with the same name as the tool. The function must return a dict. Saved to disk and available in future sessions.",
        "params": {"name": "Tool name (must match the function name in your code)", "python_code": "Python code defining the function", "description": "Optional description of what the tool does"},
    },
    "update_tool": {
        "func": update_tool,
        "description": "Modify an existing custom tool's code. Same parameters as register_tool.",
        "params": {"name": "Tool name to update", "python_code": "New Python code", "description": "Optional updated description"},
    },
    "delete_tool": {
        "func": delete_tool,
        "description": "Delete a custom tool permanently. Cannot delete built-in tools.",
        "params": {"name": "Tool name to delete"},
    },
    "list_custom_tools": {
        "func": list_custom_tools,
        "description": "List all user-created custom tools currently loaded.",
        "params": {},
    },
    "run_audit": {
        "func": _run_audit,
        "description": "Run a full system audit of Amir OS. Checks OmniRoute connectivity, config validity, memory file freshness, git health, custom tools consistency, and disk usage. Saves report to ~/.myagent/audit/latest_report.md.",
        "params": {},
    },
    "read_audit_report": {
        "func": _read_audit_report,
        "description": "Read the latest audit report. Shows pass/warn/fail status for all system checks.",
        "params": {},
    },
}

_initial_custom_count = _load_custom_tools()


def get_openai_tools():
    tools = []
    for name, info in TOOL_DEFINITIONS.items():
        properties = {}
        required = []
        for pname, pdesc in info["params"].items():
            properties[pname] = {"type": "string", "description": pdesc}
            required.append(pname)
        tool = {
            "type": "function",
            "function": {
                "name": name,
                "description": info["description"],
                "parameters": {
                    "type": "object",
                    "properties": properties,
                },
            },
        }
        if required:
            tool["function"]["parameters"]["required"] = required
        tools.append(tool)
    return tools


def get_tool_schemas_prompt():
    lines = [
        "## Available Tools",
        "",
        "You have access to tools that let you read/write files, run shell commands, search the codebase, and access memory files.",
        "",
        "CRITICAL RULE: You MUST use tools to answer questions about the environment. Never speculate about files, directories, or system state. If the user asks about your home directory, files, memory, or anything that requires checking the system, ALWAYS call the appropriate tool.",
        "",
        "To use a tool, output EXACTLY this format on its own line:",
        "",
        "TOOL_CALL: tool_name param1=\"value1\" param2=\"value2\"",
        "",
        "After the tool executes, you will receive a TOOL_RESULT message with the output. You MUST check the result and use it to inform your response.",
        "You can make multiple tool calls sequentially if needed.",
        "",
        "Examples of when to use tools:",
        '- User asks "what files are in my project?" → call list_dir()',
        '- User asks "can you see my home dir?" → call run_shell(command="echo $HOME") or list_dir()',
        '- User asks "what is in the memory folder?" → call list_dir(path="memory")',
        '- User asks "read my goals" → call memory_read(path="GOALS.md")',
        "",
        "### Tools:",
    ]
    for name, info in TOOL_DEFINITIONS.items():
        params_str = ", ".join(f"{k}" for k in info["params"])
        lines.append(f"")
        lines.append(f"**{name}({params_str})**")
        lines.append(f"  {info['description']}")
        for param, desc in info["params"].items():
            lines.append(f"  - {param}: {desc}")
    lines.append("")
    lines.append("### Meta-Tooling (Create Your Own Tools)")
    lines.append("")
    lines.append("If you encounter a task that no existing tool handles, or a tool fails with an error you can work around, you can create a new tool using register_tool.")
    lines.append("")
    lines.append("The function must: (1) be named the same as the tool, (2) accept only string parameters, (3) return a dict with at minimum {'success': bool}. Add 'error' key on failure, or any other data keys on success.")
    lines.append("")
    lines.append("Example — creating a YAML reader:")
    lines.append('TOOL_CALL: register_tool name="read_yaml" python_code="def read_yaml(path):\\n    import yaml\\n    try:\\n        with open(path) as f:\\n            data = yaml.safe_load(f)\\n        return {\\"success\\": True, \\"data\\": str(data)}\\n    except Exception as e:\\n        return {\\"success\\": False, \\"error\\": str(e)}" description="Read and parse a YAML file"')
    lines.append("")
    lines.append("If a tool fails, analyze the error and either: (a) retry with different arguments, (b) use a different tool, or (c) create a new tool that handles the edge case.")
    lines.append("")
    lines.append("### System Audit")
    lines.append("")
    lines.append("At the start of each session, call read_audit_report to check for any system issues or improvement opportunities detected by the last audit. If the report is stale (>24h) or shows warnings/failures, run run_audit to get fresh results and fix any issues found.")
    lines.append("")
    lines.append("IMPORTANT: Always check tool results before deciding the next step. If you need more information, call a tool again or ask the user.")
    return "\n".join(lines)

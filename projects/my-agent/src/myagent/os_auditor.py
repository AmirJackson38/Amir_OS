import os
import json
import subprocess
import shutil
from datetime import datetime, timezone
from pathlib import Path
from collections import OrderedDict

AUDIT_DIR = Path.home() / ".myagent" / "audit"
REPORT_FILE = AUDIT_DIR / "latest_report.md"
SANDBOX_ROOT = Path(os.environ.get(
    "MY_AGENT_SANDBOX",
    Path(__file__).resolve().parents[4]
)).resolve()

CHECKS = OrderedDict()


def check(name, description=None):
    def decorator(f):
        CHECKS[name] = {"func": f, "description": description or name}
        return f
    return decorator


@check("omniroute_connection", "Check if OmniRoute is reachable")
def _check_omniroute():
    try:
        import httpx
        r = httpx.get("http://localhost:20128/v1/models", timeout=5)
        if r.status_code == 200:
            data = r.json()
            count = len(data.get("data", []))
            return {"status": "pass", "message": f"OmniRoute reachable ({count} routes)"}
        return {"status": "warn", "message": f"OmniRoute returned status {r.status_code}"}
    except Exception as e:
        return {"status": "fail", "message": f"OmniRoute unreachable: {e}"}


@check("config_validity", "Check ~/.myagent/config.json is valid")
def _check_config():
    config_path = Path.home() / ".myagent" / "config.json"
    if not config_path.exists():
        return {"status": "fail", "message": "config.json not found"}
    try:
        data = json.loads(config_path.read_text(encoding="utf-8"))
        omni = data.get("omniroute", {})
        if not omni.get("base_url"):
            return {"status": "warn", "message": "config.json missing omniroute.base_url"}
        if not omni.get("api_key"):
            return {"status": "warn", "message": "config.json missing omniroute.api_key"}
        return {"status": "pass", "message": "config.json valid"}
    except json.JSONDecodeError as e:
        return {"status": "fail", "message": f"config.json parse error: {e}"}


@check("memory_freshness", "Check if memory files have been updated recently")
def _check_memory():
    memory_dir = SANDBOX_ROOT / "memory"
    if not memory_dir.exists():
        return {"status": "warn", "message": "memory/ directory not found"}
    stale = []
    now = datetime.now(timezone.utc).timestamp()
    for f in sorted(memory_dir.glob("*.md")):
        age_days = (now - f.stat().st_mtime) / 86400
        if age_days > 14:
            stale.append(f"{f.name} ({int(age_days)}d old)")
    if stale:
        return {"status": "warn", "message": f"{len(stale)} stale memory files", "detail": "; ".join(stale)}
    return {"status": "pass", "message": "All memory files recent"}


@check("git_health", "Check git status of the Amir_OS repo")
def _check_git():
    git_dir = SANDBOX_ROOT / ".git"
    if not git_dir.exists():
        return {"status": "warn", "message": "Not a git repository"}
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True, text=True, timeout=10, cwd=SANDBOX_ROOT
        )
        if result.returncode != 0:
            return {"status": "warn", "message": "git status failed", "detail": result.stderr.strip()}
        changes = result.stdout.strip()
        if changes:
            lines = changes.split("\n")
            return {"status": "warn", "message": f"{len(lines)} uncommitted change(s)"}
        return {"status": "pass", "message": "Working tree clean"}
    except FileNotFoundError:
        return {"status": "warn", "message": "git not installed"}
    except subprocess.TimeoutExpired:
        return {"status": "warn", "message": "git status timed out"}


@check("custom_tools", "Check custom tools directory consistency")
def _check_custom_tools():
    custom_dir = Path.home() / ".myagent" / "custom_tools"
    if not custom_dir.exists():
        return {"status": "pass", "message": "No custom tools directory"}
    files = list(custom_dir.glob("*.py"))
    if not files:
        return {"status": "pass", "message": "No custom tools defined"}
    from .tool_registry import TOOL_DEFINITIONS
    loaded_custom = {n for n, info in TOOL_DEFINITIONS.items() if info.get("custom")}
    file_names = {f.stem for f in files}
    orphaned = file_names - loaded_custom
    if orphaned:
        detail = ", ".join(orphaned)
        return {"status": "warn", "message": f"{len(orphaned)} orphaned tool file(s)", "detail": detail}
    return {"status": "pass", "message": f"{len(files)} custom tool(s) loaded"}


@check("disk_usage", "Check free disk space on the Amir_OS drive")
def _check_disk():
    try:
        usage = shutil.disk_usage(SANDBOX_ROOT)
        free_gb = usage.free / (1024 ** 3)
        total_gb = usage.total / (1024 ** 3)
        pct = (usage.used / usage.total) * 100
        if free_gb < 1:
            return {"status": "fail", "message": f"Critically low disk: {free_gb:.1f}GB free"}
        if free_gb < 5:
            return {"status": "warn", "message": f"Low disk: {free_gb:.1f}GB free ({pct:.0f}% used of {total_gb:.0f}GB)"}
        return {"status": "pass", "message": f"{free_gb:.1f}GB free ({pct:.0f}% used of {total_gb:.0f}GB)"}
    except Exception as e:
        return {"status": "warn", "message": f"Disk check failed: {e}"}


def run_audit():
    AUDIT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    results = []
    summary = {"pass": 0, "warn": 0, "fail": 0}
    for name, info in CHECKS.items():
        try:
            result = info["func"]()
        except Exception as e:
            result = {"status": "fail", "message": f"Check error: {e}"}
        results.append((name, info["description"], result))
        summary[result["status"]] = summary.get(result["status"], 0) + 1

    lines = [f"# Amir OS Audit Report", f"**{timestamp}**", ""]
    lines.append(f"## Summary")
    lines.append(f"- Pass: {summary.get('pass', 0)}")
    lines.append(f"- Warn: {summary.get('warn', 0)}")
    lines.append(f"- Fail: {summary.get('fail', 0)}")
    lines.append(f"- Total: {len(results)}")
    lines.append("")
    lines.append(f"## Details")
    for name, desc, result in results:
        icon = {"pass": "OK", "warn": "!", "fail": "X"}.get(result["status"], "?")
        lines.append(f"")
        lines.append(f"### {icon} {name}")
        lines.append(f"  {desc}")
        lines.append(f"  Status: **{result['status'].upper()}**")
        lines.append(f"  {result['message']}")
        if result.get("detail"):
            lines.append(f"  Detail: {result['detail']}")
    lines.append("")
    lines.append("---")
    lines.append(f"_Audit completed at {timestamp}_")

    report = "\n".join(lines)
    REPORT_FILE.write_text(report, encoding="utf-8")
    return report


def read_latest_report():
    if REPORT_FILE.exists():
        return REPORT_FILE.read_text(encoding="utf-8")
    return "No audit report found. Run run_audit to generate one."


def report_age_hours():
    if not REPORT_FILE.exists():
        return -1
    age = (datetime.now(timezone.utc).timestamp() - REPORT_FILE.stat().st_mtime) / 3600
    return age

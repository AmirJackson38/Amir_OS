import os
import json
from collections import OrderedDict
from pathlib import Path

CONFIG_DIR = Path.home() / ".myagent"
CONFIG_FILE = CONFIG_DIR / "config.json"
SYSTEM_PROMPT_FILE = CONFIG_DIR / "system_prompt.md"
DEFAULT_SYSTEM_PROMPT = """You are a personal AI assistant running through OmniRoute.

You are helpful, technically capable, and communicate clearly and concisely.

The user may be working on home lab infrastructure, software projects, networking, Docker, Linux, and personal development.

Respond naturally and conversationally. Be direct and avoid unnecessary fluff."""

DEFAULT_CONFIG = {
    "omniroute": {
        "base_url": "http://localhost:20128/v1",
        "api_key": "sk-omniroute",
        "default_route": "auto/best-chat"
    },
    "ui": {
        "theme": "dark"
    }
}


def ensure_config_dir():
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)


def load_config():
    ensure_config_dir()
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE) as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            pass
    return dict(DEFAULT_CONFIG)


def save_config(config):
    ensure_config_dir()
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)


def get_omniroute_config():
    config = load_config()
    omni = config.get("omniroute", {})

    base_url = os.environ.get("OMNIROUTE_BASE_URL") or omni.get("base_url", DEFAULT_CONFIG["omniroute"]["base_url"])
    api_key = os.environ.get("OMNIROUTE_API_KEY") or omni.get("api_key", DEFAULT_CONFIG["omniroute"]["api_key"])
    default_route = os.environ.get("OMNIROUTE_MODEL") or omni.get("default_route", DEFAULT_CONFIG["omniroute"]["default_route"])

    return {
        "base_url": base_url.rstrip("/"),
        "api_key": api_key,
        "default_route": default_route
    }


def load_system_prompt():
    ensure_config_dir()
    if SYSTEM_PROMPT_FILE.exists():
        try:
            return SYSTEM_PROMPT_FILE.read_text(encoding="utf-8").strip()
        except OSError:
            pass
    return DEFAULT_SYSTEM_PROMPT


def save_system_prompt(text):
    ensure_config_dir()
    SYSTEM_PROMPT_FILE.write_text(text.strip(), encoding="utf-8")


PROJECT_ROOT = Path(os.environ.get(
    "MY_AGENT_SANDBOX",
    Path(__file__).resolve().parents[4]
)).resolve()

def _summarize_file(rel_path, max_lines=4):
    full_path = PROJECT_ROOT / rel_path
    if not full_path.exists():
        return ""
    try:
        lines = full_path.read_text(encoding="utf-8").strip().split("\n")
        headings = [l.strip("# ") for l in lines if l.startswith("#")]
        important = [l.strip() for l in lines if ":" in l or "Rule" in l or "Purpose" in l or "Goal" in l]
        parts = []
        if headings:
            parts.append("Sections: " + ", ".join(h for h in headings if h.lower() not in ("purpose", "")[:5]))
        if important:
            parts.extend(important[:max_lines])
        return "; ".join(parts)
    except OSError:
        return ""


BOOT_SUMMARIES = OrderedDict([
    ("PROFILE.md", ("identity/PROFILE.md", "Amir's learning preferences and communication style")),
    ("COACH_MODE.md", ("identity/COACH_MODE.md", "Coaching principles, memory tiers, decision framework")),
    ("AGENT_RULES.md", ("AGENT_RULES.md", "10 operating rules for AI agents in Amir OS")),
    ("GOALS.md", ("goals/GOALS.md", "Career goals (TSE/CSE), learning priorities, project philosophy")),
    ("CURRENT_STATE.md", ("memory/CURRENT_STATE.md", "Current milestone v0.7.0, active projects, learning progress")),
])


def build_system_prompt():
    base = load_system_prompt()

    identity_block = """### Amir OS Identity (summarized)
You are Amir's personal AI assistant. These files define who he is and how to work with him:"""
    for label, (rel_path, _) in BOOT_SUMMARIES.items():
        summary = _summarize_file(rel_path)
        if summary:
            identity_block += f"\n- **{label}**: {summary}"

    try:
        from .tool_registry import get_tool_schemas_prompt
        tools = get_tool_schemas_prompt()
        return f"""{base}

--- SYSTEM IDENTITY OVERRIDE ---

You are NOT a generic AI assistant. You are Amir's personal AI assistant operating within Amir OS.

{identity_block}

{tools}"""
    except ImportError:
        return base

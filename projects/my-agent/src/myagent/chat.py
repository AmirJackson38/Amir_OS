import sys
import io
from rich.console import Console
from rich.text import Text
from rich.prompt import Prompt

from . import config
from .omni_client import OmniRouteClient
from . import conversation_store as convo_store
from .commands import handle_slash_command
from .agent_loop import run_agent_cycle
from .permissions import PermissionManager
from .diagnostics import Diagnostics
from .ui.banner import render_banner, render_status_panel
from .ui.styles import THEME


def run(debug_mode=False):
    if sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    console = Console(theme=THEME)
    cfg = config.get_omniroute_config()
    omni = OmniRouteClient(cfg)

    diag = Diagnostics()
    perm = PermissionManager()

    state = {
        "omni_client": omni,
        "config": config,
        "conversation_store": convo_store,
        "endpoint": cfg["base_url"],
        "current_route": cfg["default_route"],
        "debug": debug_mode,
        "running": True,
        "conversation_id": None,
        "conversation_title": "Untitled",
        "messages": [],
        "diagnostics": diag,
        "permissions": perm,
    }

    system_prompt = config.build_system_prompt()
    boot_context = [{"role": "system", "content": system_prompt}]

    try:
        from .os_auditor import read_latest_report, report_age_hours
        report = read_latest_report()
        age_h = report_age_hours()
        if age_h >= 0:
            freshness = "fresh" if age_h < 24 else f"{int(age_h)}h old"
            summary_lines = []
            for line in report.split("\n"):
                if line.startswith("-") or line.startswith("|"):
                    summary_lines.append(line)
            summary = "\n".join(summary_lines[:10])
            boot_context.append({
                "role": "system",
                "content": f"[Boot Context — Audit Report ({freshness})]\n{summary}"
            })
    except Exception:
        pass

    state["messages"] = boot_context

    console.clear()
    console.print(render_banner())

    ok, detail = omni.check_connection()
    models = []
    if ok:
        try:
            all_models = omni.list_models()
            models = all_models
        except Exception:
            models = []
    else:
        console.print(Text(f"  OmniRoute: [OFFLINE]", style="bold red"))
        console.print(Text(f"  Endpoint: {cfg['base_url']}", style="dim"))
        console.print(Text(f"  Error: {detail}", style="bold red"))
        console.print()
        retry = Prompt.ask("Retry connection?", choices=["y", "n"], default="y")
        if retry == "y":
            ok, detail = omni.check_connection()
            if ok:
                models = omni.list_models()
            else:
                console.print(Text("Could not connect. Exiting.", style="bold red"))
                return

    panel = render_status_panel(
        connected=ok,
        endpoint=cfg["base_url"],
        route=cfg["default_route"],
        routes_count=len(models)
    )
    console.print(panel)

    if state["debug"]:
        console.print(Text(f"[DEBUG] Routes discovered: {len(models)}", style="dim cyan"))
        if models:
            console.print(Text(f"[DEBUG] First 5: {models[:5]}", style="dim cyan"))

    cid = convo_store.create_conversation(route=cfg["default_route"])
    state["conversation_id"] = cid

    console.print()
    console.print(Text("Type your message or /help for commands.", style="dim italic"))
    console.print()

    while state["running"]:
        try:
            user_input = console.input("[bold cyan]You:[/] ")
        except (EOFError, KeyboardInterrupt):
            console.print()
            console.print(Text("Goodbye.", style="bold cyan"))
            break

        if not user_input.strip():
            continue

        if user_input.startswith("/"):
            state = handle_slash_command(user_input, console, state)
            continue

        state["messages"].append({"role": "user", "content": user_input})
        convo_store.add_message(state["conversation_id"], "user", user_input)

        if state["debug"]:
            console.print(Text(f"[DEBUG] Sending {len(state['messages'])} messages to OmniRoute", style="dim cyan"))

        run_agent_cycle(state, console)

        if state["messages"] and state["messages"][-1]["role"] == "assistant":
            last = state["messages"][-1]
            convo_store.add_message(
                state["conversation_id"], "assistant", last["content"]
            )

    convo_store.close()

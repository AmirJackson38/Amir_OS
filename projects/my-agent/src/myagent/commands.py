from .ui.render import (
    render_help, render_models,
    render_conversations_list, render_metadata_panel
)
from .ui.banner import render_banner, render_status_panel
from rich.text import Text


def cmd_help(console):
    console.print(render_help())


def cmd_status(console, connected, endpoint, route, routes_count, model_info=None, provider_info=None):
    panel = render_status_panel(
        connected=connected,
        endpoint=endpoint,
        route=route,
        routes_count=routes_count,
        model_info=model_info,
        provider_info=provider_info
    )
    console.print(panel)


def cmd_models(console, models, current_route):
    console.print(render_models(models, current_route))


def cmd_new(console, convo_store, route):
    cid = convo_store.create_conversation(route=route)
    return cid


def cmd_history(console, convo_store):
    convos = convo_store.list_conversations()
    console.print(render_conversations_list(convos))


def cmd_load(console, convo_store, cid, current_route):
    convo = convo_store.get_conversation(cid)
    if convo is None:
        console.print(Text(f"Conversation '{cid}' not found.", style="bold red"))
        return None, None
    messages = convo_store.get_messages(cid)
    route = convo.get("route", current_route)
    title = convo.get("title", "Untitled")
    console.print(Text(f"Loaded conversation: {title} [{cid}]", style="bold green"))
    return cid, route, title


def cmd_rename(console, convo_store, cid, title):
    convo_store.rename_conversation(cid, title)
    console.print(Text(f"Renamed to: {title}", style="bold green"))


def cmd_delete(console, convo_store, cid):
    convo_store.delete_conversation(cid)
    console.print(Text(f"Deleted conversation: {cid}", style="bold yellow"))


def cmd_clear(console):
    console.print(Text("Conversation cleared.", style="bold yellow"))


def cmd_config(console, config):
    from rich.table import Table
    t = Table.grid(padding=(0, 2))
    t.add_column(style="bold white")
    t.add_column(style="white")
    omni = config.get("omniroute", {})
    t.add_row("Base URL:", omni.get("base_url", "not set"))
    t.add_row("Route:", omni.get("default_route", "not set"))
    t.add_row("Config file:", str(config.config_file) if hasattr(config, 'config_file') else "~/.myagent/config.json")
    console.print(t)


def cmd_debug(console, debug_on):
    if debug_on:
        console.print(Text("Debug mode: ON", style="bold green"))
    else:
        console.print(Text("Debug mode: OFF", style="bold yellow"))
    return not debug_on


def handle_slash_command(cmd_line, console, state):
    parts = cmd_line.strip().split(maxsplit=1)
    cmd = parts[0].lower()
    arg = parts[1] if len(parts) > 1 else ""

    omni = state["omni_client"]
    config = state["config"]
    convo_store = state["conversation_store"]
    debug = state["debug"]

    if cmd == "/help":
        cmd_help(console)
        return state

    elif cmd == "/status":
        ok, detail = omni.check_connection()
        models = []
        model_info = None
        provider_info = None
        if ok:
            try:
                models = omni.list_models()
            except Exception:
                models = []
        cmd_status(
            console, ok, state["endpoint"],
            state["current_route"], len(models) if ok else 0,
            model_info, provider_info
        )
        return state

    elif cmd == "/models":
        try:
            models = omni.list_models()
            cmd_models(console, models[:20], state["current_route"])
            if len(models) > 20:
                console.print(Text(f"... and {len(models) - 20} more", style="dim"))
        except Exception as e:
            console.print(Text(f"Error: {e}", style="bold red"))
        return state

    elif cmd == "/route":
        if not arg:
            console.print(Text(f"Current route: {state['current_route']}", style="bold yellow"))
            return state
        new_route = arg
        state["current_route"] = new_route
        if state["conversation_id"]:
            convo_store.update_conversation_route(state["conversation_id"], new_route)
        config_data = config.load_config()
        config_data["omniroute"]["default_route"] = new_route
        config.save_config(config_data)
        console.print(Text(f"Route switched to: {new_route}", style="bold green"))
        return state

    elif cmd == "/new":
        cid = cmd_new(console, convo_store, state["current_route"])
        state["conversation_id"] = cid
        state["conversation_title"] = "Untitled"
        state["messages"] = [{"role": "system", "content": config.build_system_prompt()}]
        return state

    elif cmd == "/history":
        cmd_history(console, convo_store)
        return state

    elif cmd == "/load":
        if not arg:
            console.print(Text("Usage: /load <conversation_id>", style="bold yellow"))
            return state
        result = cmd_load(console, convo_store, arg, state["current_route"])
        if result[0] is None:
            return state
        cid, route, title = result
        msgs = convo_store.get_messages(cid)
        state["conversation_id"] = cid
        state["conversation_title"] = title
        state["current_route"] = route
        state["messages"] = msgs
        return state

    elif cmd == "/save":
        if not state["conversation_id"]:
            cid = convo_store.create_conversation(route=state["current_route"])
            state["conversation_id"] = cid
        prompt = config.load_system_prompt()
        unsaved_msgs = [m for m in state["messages"] if m.get("content") != prompt]
        for m in unsaved_msgs:
            meta = m.get("metadata", {})
            convo_store.add_message(state["conversation_id"], m["role"], m["content"], meta)
        console.print(Text(f"Saved ({len(unsaved_msgs)} messages)", style="bold green"))
        return state

    elif cmd.startswith("/rename"):
        if not arg:
            console.print(Text("Usage: /rename <new title>", style="bold yellow"))
            return state
        cid = state.get("conversation_id")
        if not cid:
            console.print(Text("No active conversation to rename.", style="bold yellow"))
            return state
        cmd_rename(console, convo_store, cid, arg)
        state["conversation_title"] = arg
        return state

    elif cmd == "/delete":
        if not arg:
            console.print(Text("Usage: /delete <conversation_id>", style="bold yellow"))
            return state
        cmd_delete(console, convo_store, arg)
        if state.get("conversation_id") == arg:
            state["conversation_id"] = None
            state["messages"] = []
        return state

    elif cmd == "/clear":
        state["messages"] = [{"role": "system", "content": config.build_system_prompt()}]
        cmd_clear(console)
        return state

    elif cmd == "/config":
        cmd_config(console, config)
        return state

    elif cmd == "/debug":
        state["debug"] = cmd_debug(console, debug)
        return state

    elif cmd == "/tools":
        from .tool_registry import TOOL_DEFINITIONS
        from rich.table import Table
        t = Table(title="Available Tools", border_style="cyan")
        t.add_column("Tool", style="bold cyan")
        t.add_column("Description", style="white")
        for name, info in TOOL_DEFINITIONS.items():
            t.add_row(name, info["description"])
        console.print(t)
        return state

    elif cmd == "/diag":
        diag = state.get("diagnostics")
        if diag:
            diag.render_log(console, n=15)
            diag.render_session_stats(console)
        else:
            console.print("[yellow]No diagnostics available.[/]")
        return state

    elif cmd == "/quit" or cmd == "/exit":
        console.print(Text("Goodbye.", style="bold cyan"))
        state["running"] = False
        return state

    else:
        console.print(Text(f"Unknown command: {cmd}", style="bold red"))
        console.print(Text("Type /help for available commands.", style="dim"))
        return state

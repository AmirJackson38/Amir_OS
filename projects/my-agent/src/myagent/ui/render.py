from rich.console import Console, Group
from rich.panel import Panel
from rich.text import Text
from rich.markdown import Markdown
from rich.live import Live
from rich.table import Table
from rich.style import Style
from rich import box
from datetime import datetime


def render_message(role, content, metadata=None):
    label_style = {
        "user": "bold green",
        "assistant": "bold blue",
        "system": "bold yellow"
    }.get(role, "bold white")

    icon = {"user": ">", "assistant": "<", "system": "#"}.get(role, "?")

    panel_content = Group(
        Text(f"{icon} {role.title()}", style=label_style),
        Text(""),
        Markdown(content) if role == "assistant" else Text(content)
    )

    subtitle = None
    if metadata and role == "assistant":
        parts = []
        if metadata.get("model"):
            parts.append(f"model: {metadata['model']}")
        if metadata.get("latency_ms"):
            parts.append(f"{metadata['latency_ms']}ms")
        if metadata.get("tokens_out"):
            parts.append(f"tokens: {metadata['tokens_out']}")
        if parts:
            subtitle = "  ".join(parts)

    return Panel(
        panel_content,
        border_style=label_style,
        title=f"{role.title()}",
        title_align="left",
        subtitle=subtitle,
        subtitle_align="right",
        padding=(1, 2)
    )


def render_streaming_content(content, model=None):
    return Panel(
        Markdown(content) if content else Text("Waiting for response...", style="dim italic"),
        border_style="bright_blue",
        title="[bold blue]My Agent[/]",
        title_align="left",
        padding=(1, 2)
    )


def render_metadata_panel(metadata):
    if not metadata:
        return None

    rows = []
    wanted = [
        ("x-omniroute-provider", "Provider"),
        ("x-omniroute-model", "Model"),
        ("x-omniroute-version", "OmniRoute Version"),
        ("x-omniroute-latency-ms", "Latency (ms)"),
        ("x-omniroute-response-cost", "Cost"),
        ("x-omniroute-tokens-in", "Tokens In"),
        ("x-omniroute-tokens-out", "Tokens Out"),
        ("x-omniroute-cache-hit", "Cache Hit"),
        ("x-omniroute-route-class", "Route Class"),
    ]

    for header_key, display_name in wanted:
        val = metadata.get(header_key)
        if val is not None and val != "":
            rows.append((display_name, str(val)))

    if not rows:
        return None

    table = Table.grid(padding=(0, 2))
    table.add_column(style="bold white")
    table.add_column(style="white")
    for label, val in rows:
        table.add_row(f"{label}:", val)

    return Panel(
        table,
        border_style="dim cyan",
        title="[dim]OmniRoute Metadata[/]",
        padding=(1, 2)
    )


def render_help():
    help_text = Text()
    commands = [
        ("/help", "Show this help"),
        ("/status", "Show OmniRoute connection status"),
        ("/models", "List available OmniRoute routes"),
        ("/route <name>", "Switch to a different route"),
        ("/new", "Start a new conversation"),
        ("/history", "List saved conversations"),
        ("/load <id>", "Load a saved conversation"),
        ("/save", "Save current conversation"),
        ("/rename <title>", "Rename current conversation"),
        ("/delete <id>", "Delete a saved conversation"),
        ("/clear", "Clear the current conversation"),
        ("/config", "Show current configuration"),
        ("/debug", "Toggle debug mode"),
        ("/tools", "List available tools (agent mode)"),
        ("/diag", "Show tool execution diagnostics"),
        ("/quit", "Exit My Agent"),
    ]
    for cmd, desc in commands:
        help_text.append(f"  {cmd:<20}", style="bold cyan")
        help_text.append(f"{desc}\n", style="white")
    return Panel(
        help_text,
        border_style="cyan",
        title="[bold cyan]Commands[/]",
        padding=(1, 2)
    )


def render_models(models, current_route):
    if not models:
        return Text("No routes available.", style="italic")

    content = Text()
    for m in models:
        prefix = "[*]" if m == current_route else "[ ]"
        style = "bold yellow" if m == current_route else "dim white"
        content.append(f"  {prefix} ", style=style)
        content.append(f"{m}\n", style=style)

    return Panel(
        content,
        border_style="cyan",
        title="[bold cyan]Available Routes[/]",
        padding=(1, 2)
    )


def render_conversations_list(conversations):
    if not conversations:
        return Text("No saved conversations.", style="italic")

    content = Text()
    for c in conversations:
        content.append(f"  [{c['id']}] ", style="bold cyan")
        content.append(f"{c['title']:<30}", style="white")
        content.append(f"({c['msg_count']} msgs, {c['route']})", style="dim")
        content.append("\n")

    return Panel(
        content,
        border_style="cyan",
        title="[bold cyan]Conversations[/]",
        padding=(1, 2)
    )

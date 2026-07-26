from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from .. import __version__


def render_banner():
    lines = [
        "",
        "+" + "-" * 64 + "+",
        "|" + " " * 23 + "MY AGENT" + " " * 24 + "|",
        "|" + " " * 16 + "Personal AI Terminal Interface" + " " * 15 + "|",
        "|" + " " * 60 + "|",
        "|" + "     Powered by OmniRoute v" + __version__ + "       |",
        "+" + "-" * 64 + "+",
        "",
    ]
    return Text("\n".join(lines), style="bold cyan")


def render_status_panel(connected, endpoint, route, routes_count, model_info=None, provider_info=None):
    status_text = Text()
    if connected:
        status_text.append("[CONNECTED]", style="bold green")
    else:
        status_text.append("[OFFLINE]", style="bold red")

    lines = [
        ("OmniRoute", status_text),
        ("Endpoint", endpoint),
        ("Route", route),
        ("Routes Available", str(routes_count)),
    ]

    if model_info:
        lines.append(("Routed Model", model_info))
    if provider_info:
        lines.append(("Routed Provider", provider_info))

    panel_content = Text()
    for i, (label, value) in enumerate(lines):
        panel_content.append(f"  {label}: ", style="bold white")
        if isinstance(value, Text):
            panel_content.append(value)
        else:
            panel_content.append(str(value), style="white")
        if i < len(lines) - 1:
            panel_content.append("\n")

    return Panel(
        panel_content,
        border_style="cyan",
        title="[bold cyan]Connection Status[/]",
        padding=(1, 2)
    )

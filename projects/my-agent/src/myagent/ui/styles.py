from rich.style import Style
from rich.theme import Theme

THEME = Theme({
    "banner": "bold cyan",
    "banner.sub": "dim cyan",
    "status.on": "bold green",
    "status.off": "bold red",
    "label": "bold white",
    "value": "white",
    "dim": "dim white",
    "route": "bold yellow",
    "provider": "bright_magenta",
    "model": "bright_blue",
    "latency": "bright_green",
    "cost": "bright_yellow",
    "tokens": "bright_cyan",
    "user.label": "bold green",
    "assistant.label": "bold blue",
    "system.label": "bold yellow",
    "error": "bold red",
    "warning": "bold yellow",
    "success": "bold green",
    "info": "bold cyan",
    "cmd": "bold bright_magenta",
    "input_area": "white on #1a1a2e",
    "input_prompt": "bold cyan",
})

ACCENT = "cyan"
ACCENT2 = "bright_blue"
ACCENT3 = "bright_magenta"
PANEL_BORDER = Style(color="cyan", dim=True)
PANEL_BORDER_BRIGHT = Style(color="cyan")

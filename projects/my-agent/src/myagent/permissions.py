class PermissionManager:
    def __init__(self):
        self.always_allow = set()
        self.session_deny = set()

    def request(self, console, tool_name, args):
        if tool_name in self.always_allow:
            return True, "always"
        if tool_name in self.session_deny:
            return False, "denied"

        console.print()
        console.print(f"[bold yellow]Tool Request:[/] [bold]{tool_name}[/]")
        for k, v in args.items():
            val_str = v if len(v) < 120 else v[:117] + "..."
            console.print(f"  [dim]{k}:[/] {val_str}")
        console.print()

        while True:
            raw = console.input(
                "[yellow]Execute? [/]"
                "[bold](y)[/]es [bold](N)[/]o [bold](a)[/]lways [bold](s)[/]kip: "
            )
            raw = raw.strip().lower()
            if raw in ("y", "yes", ""):
                return True, "once"
            if raw in ("a", "always"):
                self.always_allow.add(tool_name)
                return True, "always"
            if raw in ("n", "no"):
                return False, "skipped"
            if raw in ("s", "skip"):
                self.session_deny.add(tool_name)
                return False, "denied"
            console.print("[red]Invalid choice. Enter y, n, a, or s.[/]")

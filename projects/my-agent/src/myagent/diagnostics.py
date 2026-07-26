import time
from datetime import datetime
from collections import deque

TOOL_LOG_MAX = 200


class Diagnostics:
    def __init__(self):
        self.tool_log = deque(maxlen=TOOL_LOG_MAX)
        self.start_time = time.time()

    def log_tool(self, tool_name, args, duration_ms, permission, result):
        self.tool_log.append({
            "timestamp": datetime.now().isoformat(timespec="seconds"),
            "tool": tool_name,
            "args": dict(args),
            "duration_ms": duration_ms,
            "permission": permission,
            "success": result.get("success", False) if isinstance(result, dict) else False,
            "error": result.get("error") if isinstance(result, dict) and "error" in result else None,
        })

    def get_recent(self, n=10):
        return list(self.tool_log)[-n:]

    def render_log(self, console, n=10):
        entries = self.get_recent(n)
        if not entries:
            console.print("[dim]No tool calls in this session.[/]")
            return

        console.print()
        console.print("[bold underline]Tool Execution Log[/]")
        for e in reversed(entries):
            status = "[green]OK[/]" if e["success"] else "[red]FAIL[/]"
            perm = f"[dim]({e['permission']})[/]"
            console.print(
                f"  {status} {perm} [bold]{e['tool']}[/] "
                f"[dim]{e['duration_ms']}ms[/]"
            )
            if e["args"]:
                args_short = " ".join(f"{k}={v}" for k, v in e["args"].items())
                if len(args_short) > 80:
                    args_short = args_short[:77] + "..."
                console.print(f"       [dim]{args_short}[/]")
            if e["error"]:
                console.print(f"       [red]error: {e['error']}[/]")
        console.print()

    def get_failure_patterns(self):
        failures = [e for e in self.tool_log if not e["success"]]
        if not failures:
            return {"success": True, "failures": [], "count": 0}
        by_tool = {}
        for e in failures:
            by_tool.setdefault(e["tool"], []).append(e)
        summary = []
        for tool, entries in sorted(by_tool.items()):
            errors = list(set(e["error"] for e in entries if e["error"]))
            summary.append({
                "tool": tool,
                "attempts": len(entries),
                "errors": errors,
            })
        return {"success": True, "patterns": summary, "total_failures": len(failures)}

    def render_session_stats(self, console):
        elapsed = time.time() - self.start_time
        total = len(self.tool_log)
        succeeded = sum(1 for e in self.tool_log if e["success"])
        console.print()
        console.print("[bold underline]Session Stats[/]")
        console.print(f"  Uptime: {int(elapsed // 60)}m {int(elapsed % 60)}s")
        console.print(f"  Tool calls: {total} ([green]{succeeded} OK[/], [red]{total - succeeded} failed[/])")
        if total:
            avg_ms = sum(e["duration_ms"] for e in self.tool_log) / total
            console.print(f"  Avg tool duration: {avg_ms:.0f}ms")
        console.print()

import time
import json
from rich.live import Live
from rich.text import Text
from . import config
from .omni_client import OmniRouteClient, OmniRouteError
from .tool_registry import (
    TOOL_DEFINITIONS, parse_tool_call, format_tool_result, get_openai_tools
)
from .permissions import PermissionManager
from .diagnostics import Diagnostics
from .ui.render import render_streaming_content, render_metadata_panel


def _execute_tool(state, console, tool_name, tool_args, permission_type):
    diag = state["diagnostics"]
    console.print(f"[dim]Running [bold]{tool_name}[/]...[/]")
    t0 = time.time()
    try:
        result = TOOL_DEFINITIONS[tool_name]["func"](**tool_args)
    except Exception as e:
        result = {"success": False, "error": str(e)}
    duration_ms = int((time.time() - t0) * 1000)
    diag.log_tool(tool_name, tool_args, duration_ms, permission_type, result)
    status = "[green]OK[/]" if result["success"] else "[red]FAIL[/]"
    console.print(f"  {status} [dim]({duration_ms}ms)[/]")
    console.print()
    return result, duration_ms


def run_agent_cycle(state, console):
    omni = state["omni_client"]
    diag = state["diagnostics"]
    perm = state["permissions"]
    tools_schema = get_openai_tools()

    MAX_ITERATIONS = 10

    for iteration in range(MAX_ITERATIONS):
        if state["debug"]:
            console.print(Text(f"[DEBUG] Agent cycle iteration {iteration + 1}", style="dim cyan"))

        try:
            start_time = time.time()
            collected = ""
            model_used = None
            metadata = {}
            native_tool_calls = None

            stream = omni.chat_completion(
                messages=state["messages"],
                model=state["current_route"],
                tools=tools_schema
            )

            with Live(render_streaming_content(""), console=console, refresh_per_second=15) as live:
                for event in stream:
                    if event["type"] == "delta":
                        if event.get("content"):
                            collected = event["full"]
                            live.update(render_streaming_content(collected))
                    elif event["type"] == "done":
                        if event.get("content"):
                            collected = event["content"]
                        model_used = event.get("model")
                        metadata_raw = event.get("metadata", {})
                        native_tool_calls = event.get("tool_calls")

                        latency_ms = int((time.time() - start_time) * 1000)
                        metadata = {"model": model_used, "latency_ms": latency_ms}
                        for key in [
                            "x-omniroute-provider", "x-omniroute-model",
                            "x-omniroute-version", "x-omniroute-latency-ms",
                            "x-omniroute-response-cost", "x-omniroute-tokens-in",
                            "x-omniroute-tokens-out", "x-omniroute-cache-hit",
                            "x-omniroute-route-class"
                        ]:
                            if key in metadata_raw:
                                metadata[key] = metadata_raw[key]

                        finish = event.get("finish_reason", "stop")
                        if state["debug"]:
                            dbg = f"  model={model_used} finish={finish} latency={latency_ms}ms"
                            if "x-omniroute-provider" in metadata:
                                dbg += f" provider={metadata['x-omniroute-provider']}"
                            console.print(Text(f"[DEBUG] {dbg}", style="dim cyan"))

            console.print()
            if metadata:
                meta_panel = render_metadata_panel(metadata)
                if meta_panel:
                    console.print(meta_panel)
            console.print()

            # Check for native tool_calls (OpenAI function calling format)
            if native_tool_calls:
                for tc in native_tool_calls:
                    fn = tc.get("function", {})
                    tool_name = fn.get("name", "")
                    if not tool_name or tool_name not in TOOL_DEFINITIONS:
                        continue
                    try:
                        tool_args = json.loads(fn.get("arguments", "{}"))
                    except json.JSONDecodeError:
                        tool_args = {}

                    allowed, permission_type = perm.request(console, tool_name, tool_args)

                state["messages"].append({
                    "role": "assistant",
                    "content": collected or None,
                    "tool_calls": native_tool_calls
                })

                for tc in native_tool_calls:
                    fn = tc.get("function", {})
                    tool_name = fn.get("name", "")
                    if not tool_name or tool_name not in TOOL_DEFINITIONS:
                        continue
                    try:
                        tool_args = json.loads(fn.get("arguments", "{}"))
                    except json.JSONDecodeError:
                        tool_args = {}

                    allowed, permission_type = perm.request(console, tool_name, tool_args)
                    if not allowed:
                        state["messages"].append({
                            "role": "tool",
                            "tool_call_id": tc.get("id", ""),
                            "content": f"Permission denied: {tool_name}"
                        })
                        continue

                    result, duration_ms = _execute_tool(state, console, tool_name, tool_args, permission_type)
                    result_text = json.dumps({"success": result.get("success", False), **result})
                    state["messages"].append({
                        "role": "tool",
                        "tool_call_id": tc.get("id", ""),
                        "content": result_text
                    })

                continue

            # Fallback: text-based TOOL_CALL: parsing
            tool_name, tool_args = parse_tool_call(collected)
            if tool_name and tool_name in TOOL_DEFINITIONS:
                allowed, permission_type = perm.request(console, tool_name, tool_args)

                state["messages"].append({
                    "role": "assistant",
                    "content": collected
                })

                if not allowed:
                    state["messages"].append({
                        "role": "user",
                        "content": f"TOOL_RESULT: {tool_name} permission_denied\nTool execution was not permitted by the user."
                    })
                    continue

                result, duration_ms = _execute_tool(state, console, tool_name, tool_args, permission_type)
                result_text = format_tool_result(tool_name, result["success"], result, duration_ms)
                state["messages"].append({
                    "role": "user",
                    "content": result_text
                })
                continue

            state["messages"].append({
                "role": "assistant",
                "content": collected
            })
            break

        except OmniRouteError as e:
            console.print(Text(f"  OmniRoute Error: {e}", style="bold red"))
            break
        except Exception as e:
            console.print(Text(f"  Error: {e}", style="bold red"))
            if state["debug"]:
                import traceback
                console.print(Text(traceback.format_exc(), style="dim red"))
            break

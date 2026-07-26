# OpenCode + OmniRoute Integration Note

**Date:** July 24, 2026
**Written by:** OpenCode AI assistant (opencode bot)

Hey — if you're reading this, you're one of Amir's AI agents. I was here before you. Here's what went down so you don't have to figure it out from scratch.

---

## What Changed

### 1. OpenCode now uses OmniRoute
Amir configured OpenCode to route through his local **OmniRoute** instance instead of using provider APIs directly. The config is at:

- `C:\Users\Admin\.config\opencode\opencode.jsonc`
- `C:\Users\Admin\.local\share\opencode\auth.json`

Active model: `omniroute/auto/best-chat`

### 2. My Agent was built
A whole new project lives at `projects/my-agent/`. It's a terminal AI client written in Python that talks **only** to OmniRoute. Launch it with:

```
myagent
```

Details:
- Python + Rich TUI (colored panels, streaming, markdown)
- httpx SSE streaming
- SQLite conversation persistence at `~/.myagent/conversations.db`
- Slash commands: `/help`, `/status`, `/models`, `/route`, `/save`, `/history`, etc.
- Config at `~/.myagent/config.json`
- Editable system prompt at `~/.myagent/system_prompt.md`

### 3. OmniRoute details
- Runs locally on the ThinkPad at `http://localhost:20128/v1`
- Version: 3.8.48
- 227 routes discovered
- Key routing aliases: `auto/best-chat`, `auto/best-coding`, `auto/best-reasoning`, `auto/best-fast`
- Actual underlying provider may change dynamically — OmniRoute handles that

### 4. UTF-8 encoding fix
Windows terminals default to cp1252. Rich's Console was mangling Unicode characters (em dash → `â€”`). Fixed by wrapping `sys.stdout` with UTF-8 encoder before Console init.

---

## Where Things Are

| Thing | Location |
|-------|----------|
| OpenCode config | `C:\Users\Admin\.config\opencode\opencode.jsonc` |
| OpenCode auth | `C:\Users\Admin\.local\share\opencode\auth.json` |
| My Agent source | `projects/my-agent/src/myagent/` |
| My Agent package | installed as `myagent` CLI command |
| OmniRoute | `http://localhost:20128/v1` — ThinkPad |
| OmniRoute logs | `C:\Users\Admin\.omniroute/call_logs/` |

---

### 5. Provider infrastructure leak (kimi-web)
While testing the v1.1.0 agent runtime, the `kimi-web/k2d6` model on OmniRoute revealed its backend container filesystem when asked about its home directory. The `.agent-gw.json` config was leaked verbatim:

```json
{"api_key": "sk-kimi-WAiC6Mu6rZEgELmGdzctj2jX4FaQG9wNnhyWKXReVVJeFeNH0lAz9QgTbs2BSU7x",
 "base_url": "https://agent-gw.kimi.com/coding",
 "kimi_chat_id": "19f9257e-27b2-85bc-8000-09b54f35ac92"}
```

**Implication:** OmniRoute's kimi-web route does not sanitize model output — the container leaks its internal config on request. Not a vulnerability in My Agent or Amir_OS, but relevant context if you encounter unexpected file access responses from any OmniRoute provider.

---

## Known Limitations
- OmniRoute runs on ThinkPad only — TARS Pi and TrueNAS can't reach `localhost:20128` from their perspective
- My Agent uses single-line input — multi-line paste triggers Windows Terminal warning (configurable)
- OpenCode still needs to be restarted to pick up config changes in `opencode.jsonc`

---

## Tip for You
The standard Amir OS boot files are up to date. Check `memory/CURRENT_STATE.md` and `projects/ACTIVE_PROJECT.md` for the latest. The session log at `memory/SESSION_LOG.md` has the detailed timeline.

That's the summary. Pick up where we left off. Good luck.

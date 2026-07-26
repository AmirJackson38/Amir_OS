# Boot Terminal Chooser - Preview

## What You'll See On Boot

```
╔════════════════════════════════════════╗
║         Amir OS Boot Menu              ║
╚════════════════════════════════════════╝

What would you like to open?

[1] My Agent Terminal     (Local OmniRoute client)
[2] GitHub Copilot CLI    (Cloud-based)
[3] Nothing               (Exit)

Select (1-3): █
```

## Interaction Flow

**Option 1 - My Agent:**
```
Select (1-3): 1

Launching My Agent...
```
→ Opens PowerShell window
→ Navigates to `projects/my-agent`
→ Starts: `python -m myagent`
→ You're in the agent chat loop

**Option 2 - GitHub Copilot CLI:**
```
Select (1-3): 2

Launching GitHub Copilot CLI...
```
→ Opens PowerShell window
→ Runs: `gh copilot`
→ You get Copilot terminal interface

**Option 3 - Nothing:**
```
Select (1-3): 3

Boot menu closed.
```
→ Menu exits cleanly
→ You have empty desktop (both still available in background)

---

## Colors in Real Terminal

- **Cyan**: Headers and section titles
- **Green**: My Agent option (success/positive)
- **Blue**: GitHub Copilot option
- **Yellow**: Exit option / warnings
- **Red**: Error messages (if any)

---

## Timeline on Boot

1. **T+0s** — Machine starts
2. **T+0.5s** — OmniRoute launches silently (invisible)
3. **T+3s** — OmniRoute ready at `localhost:20128/v1`
4. **T+5s** — Boot menu appears on screen
5. **T+10s** — User selects option, terminal opens

---

## What Happens Behind the Scenes

- OmniRoute startup is **logged** to `C:\Users\Admin\AppData\Local\Temp\omniroute_boot.log`
- Boot menu choice is **logged** to `C:\Users\Admin\AppData\Local\Temp\boot_chooser.log`
- Both processes run with **elevated privileges** (necessary for port 20128)
- Tasks are managed by **Windows Task Scheduler** under "Amir OS" folder
- Boot menu runs as your user (not SYSTEM), so it can open terminals

---

## Manual Testing (Before Reboot)

To preview the menu right now:

```powershell
# Open PowerShell and run:
& "C:\Users\Admin\Documents\Amir_OS\tools\boot_terminal_chooser.ps1"
```

Or test individual components:

```powershell
# Start OmniRoute manually
& "C:\Users\Admin\Documents\Amir_OS\tools\start_omni.ps1"

# Check if it's running
Get-Process omniroute

# Test My Agent
cd "C:\Users\Admin\Documents\Amir_OS\projects\my-agent"
python -m myagent
```

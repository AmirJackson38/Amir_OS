# Amir OS Boot Automation Setup
## Overview

OmniRoute and Boot Terminal Chooser are now registered to start automatically when your machine boots.

### What happens on boot:

1. **OmniRoute starts silently** (no window) at system startup
   - Runs in background at `http://localhost:20128/v1`
   - Output logged to: `C:\Users\Admin\AppData\Local\Temp\omniroute_boot.log`
   - Runs with elevated privileges

2. **Boot Terminal Chooser appears** (5 seconds after OmniRoute starts)
   - Interactive menu asking which terminal to open
   - Options:
     - [1] My Agent (local OmniRoute client)
     - [2] GitHub Copilot CLI
     - [3] Nothing (skip)
   - Logs saved to: `C:\Users\Admin\AppData\Local\Temp\boot_chooser.log`

### Files Created

- `tools/start_omni.ps1` — Launches OmniRoute in background
- `tools/boot_terminal_chooser.ps1` — Interactive terminal selection menu
- `tools/register_boot_tasks.ps1` — Manages Task Scheduler registration

### Task Scheduler Registration

Tasks are registered under: `Amir OS`

**Task 1: Start OmniRoute**
- Trigger: AtStartup
- Action: Run `start_omni.ps1` silently
- User: YOUR_USERNAME (elevated)

**Task 2: Boot Terminal Chooser**
- Trigger: AtStartup + 5 second delay
- Action: Run `boot_terminal_chooser.ps1`
- User: YOUR_USERNAME (elevated)

### Managing Tasks

To list tasks:
```powershell
& "C:\Users\Admin\Documents\Amir_OS\tools\register_boot_tasks.ps1" -ListTasks
```

To uninstall (remove from boot):
```powershell
& "C:\Users\Admin\Documents\Amir_OS\tools\register_boot_tasks.ps1" -Uninstall
```

### Testing

To test manually without rebooting:

**Start OmniRoute:**
```powershell
& "C:\Users\Admin\Documents\Amir_OS\tools\start_omni.ps1"
```

**Show Boot Menu:**
```powershell
& "C:\Users\Admin\Documents\Amir_OS\tools\boot_terminal_chooser.ps1"
```

### Next Reboot

On your next machine restart:
1. OmniRoute will start silently in the background
2. After ~5 seconds, the boot menu will appear in a terminal window
3. Choose which terminal instance to open (or skip)
4. Both My Agent and Copilot CLI will be immediately available

### Logs

Monitor boot performance:
- OmniRoute log: `C:\Users\Admin\AppData\Local\Temp\omniroute_boot.log`
- Boot menu log: `C:\Users\Admin\AppData\Local\Temp\boot_chooser.log`

### Troubleshooting

If OmniRoute doesn't start on next boot:
1. Check if omniroute is in PATH: `omniroute --version`
2. Review logs in `C:\Users\Admin\AppData\Local\Temp\`
3. Re-run registration: `& register_boot_tasks.ps1 -Install`

If boot menu doesn't appear:
1. Check Task Scheduler: search "Task Scheduler" in Start menu
2. Look under: `Task Scheduler Library > Amir OS`
3. Right-click task > "Run" to test manually

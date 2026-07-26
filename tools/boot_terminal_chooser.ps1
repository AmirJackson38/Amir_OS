# Boot Terminal Chooser - Interactive prompt at system startup
# Asks which terminal instance to open

param(
    [switch]$Silent
)

$logPath = "$env:TEMP\boot_chooser.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Add-Content -Path $logPath -Value "[$timestamp] Boot Chooser started"

# If run with -Silent, check if we should auto-open something
if ($Silent) {
    Add-Content -Path $logPath -Value "[$timestamp] Running in silent mode (no user interaction)"
    exit 0
}

# Clear screen and show boot menu
Clear-Host

Write-Host "`n" -ForegroundColor Cyan
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         Amir OS Boot Menu              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "`n"

Write-Host "What would you like to open?`n" -ForegroundColor White

Write-Host "[1] My Agent Terminal     (Local OmniRoute client)" -ForegroundColor Green
Write-Host "[2] GitHub Copilot CLI    (Cloud-based)" -ForegroundColor Blue
Write-Host "[3] Nothing               (Exit)" -ForegroundColor Yellow
Write-Host "`n"

$choice = Read-Host "Select (1-3)"

$myAgentPath = "C:\Users\Admin\Documents\Amir_OS\projects\my-agent"
$copilotCmd = "gh copilot"

switch ($choice) {
    "1" {
        Add-Content -Path $logPath -Value "[$timestamp] User selected: My Agent"
        Write-Host "`nLaunching My Agent..." -ForegroundColor Green
        try {
            Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$myAgentPath'; python -m myagent" -WindowStyle Normal
        }
        catch {
            Write-Host "ERROR: Failed to launch My Agent: $_" -ForegroundColor Red
            Add-Content -Path $logPath -Value "[$timestamp] ERROR launching My Agent: $_"
            Read-Host "Press Enter to exit"
        }
    }
    "2" {
        Add-Content -Path $logPath -Value "[$timestamp] User selected: GitHub Copilot CLI"
        Write-Host "`nLaunching GitHub Copilot CLI..." -ForegroundColor Blue
        try {
            Start-Process pwsh -ArgumentList "-NoExit", "-Command", "$copilotCmd" -WindowStyle Normal
        }
        catch {
            Write-Host "ERROR: Failed to launch Copilot CLI: $_" -ForegroundColor Red
            Add-Content -Path $logPath -Value "[$timestamp] ERROR launching Copilot CLI: $_"
            Read-Host "Press Enter to exit"
        }
    }
    "3" {
        Add-Content -Path $logPath -Value "[$timestamp] User selected: Nothing (exit)"
        Write-Host "`nBoot menu closed." -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host "`nInvalid choice. Exiting." -ForegroundColor Red
        Add-Content -Path $logPath -Value "[$timestamp] Invalid choice: $choice"
        exit 1
    }
}

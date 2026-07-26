# Register Amir OS boot tasks with Windows Task Scheduler
# This script must be run as Administrator

param(
    [switch]$Install,
    [switch]$Uninstall,
    [switch]$ListTasks
)

$taskFolder = "Amir OS"
$omnirouteTask = "Start OmniRoute"
$chooserTask = "Boot Terminal Chooser"

$omnirouteTaskPath = "Amir OS\$omnirouteTask"
$chooserTaskPath = "Amir OS\$chooserTask"

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Helper function to display task info
function ListTasks {
    Write-Host "`nAmir OS Boot Tasks:" -ForegroundColor Cyan
    Get-ScheduledTask -TaskPath "\$taskFolder\" -ErrorAction SilentlyContinue | ForEach-Object {
        $state = $_.State
        $stateColor = if ($state -eq "Ready") { "Green" } else { "Yellow" }
        Write-Host "  ✓ $($_.TaskName)" -ForegroundColor $stateColor
        Write-Host "    State: $state" -ForegroundColor Gray
        Write-Host "    Trigger: $($_.Triggers.TriggerType -join ', ')" -ForegroundColor Gray
        Write-Host ""
    }
}

# Function to install tasks
function InstallTasks {
    Write-Host "Installing Amir OS boot tasks..." -ForegroundColor Green

    # Create OmniRoute startup task
    Write-Host "`n[1/2] Registering OmniRoute startup task..." -ForegroundColor Cyan
    try {
        $omnirouteScript = "C:\Users\Admin\Documents\Amir_OS\tools\start_omni.ps1"
        
        $trigger = New-ScheduledTaskTrigger -AtStartup
        $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$omnirouteScript`""
        $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType ServiceAccount -RunLevel Highest
        $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

        Register-ScheduledTask -TaskName $omnirouteTask -TaskPath "\$taskFolder\" -Trigger $trigger -Action $action -Principal $principal -Settings $settings -Force | Out-Null
        Write-Host "  ✓ OmniRoute task registered" -ForegroundColor Green
    }
    catch {
        Write-Host "  ✗ ERROR: Failed to register OmniRoute task: $_" -ForegroundColor Red
        return $false
    }

    # Create boot chooser task (runs 5 seconds after startup)
    Write-Host "[2/2] Registering Boot Terminal Chooser task..." -ForegroundColor Cyan
    try {
        $chooserScript = "C:\Users\Admin\Documents\Amir_OS\tools\boot_terminal_chooser.ps1"
        
        $trigger = New-ScheduledTaskTrigger -AtStartup -RandomDelay (New-TimeSpan -Seconds 5)
        $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$chooserScript`""
        $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType ServiceAccount -RunLevel Highest
        $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

        Register-ScheduledTask -TaskName $chooserTask -TaskPath "\$taskFolder\" -Trigger $trigger -Action $action -Principal $principal -Settings $settings -Force | Out-Null
        Write-Host "  ✓ Boot Terminal Chooser task registered" -ForegroundColor Green
    }
    catch {
        Write-Host "  ✗ ERROR: Failed to register Boot Chooser task: $_" -ForegroundColor Red
        return $false
    }

    Write-Host "`n✓ All boot tasks installed successfully!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "  1. Restart your machine to test" -ForegroundColor Gray
    Write-Host "  2. OmniRoute will start silently in background" -ForegroundColor Gray
    Write-Host "  3. Boot menu will appear after 5 seconds" -ForegroundColor Gray
    Write-Host "  4. Logs saved to: C:\Users\Admin\AppData\Local\Temp\" -ForegroundColor Gray

    return $true
}

# Function to uninstall tasks
function UninstallTasks {
    Write-Host "Uninstalling Amir OS boot tasks..." -ForegroundColor Yellow

    try {
        Unregister-ScheduledTask -TaskPath "\$taskFolder\" -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
        Write-Host "✓ Boot tasks uninstalled" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ ERROR: Failed to uninstall tasks: $_" -ForegroundColor Red
        return $false
    }

    return $true
}

# Main logic
if ($Install) {
    InstallTasks
}
elseif ($Uninstall) {
    UninstallTasks
}
elseif ($ListTasks) {
    ListTasks
}
else {
    Write-Host "`nAmir OS Task Scheduler Setup" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Usage: .\register_boot_tasks.ps1 [option]" -ForegroundColor White
    Write-Host "`nOptions:" -ForegroundColor White
    Write-Host "  -Install      Register OmniRoute and terminal chooser at startup" -ForegroundColor Green
    Write-Host "  -Uninstall    Remove all Amir OS boot tasks" -ForegroundColor Red
    Write-Host "  -ListTasks    Show currently registered Amir OS tasks" -ForegroundColor Blue
    Write-Host "`nExample:" -ForegroundColor Yellow
    Write-Host "  .\register_boot_tasks.ps1 -Install" -ForegroundColor Gray
}

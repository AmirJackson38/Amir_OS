# ═══════════════════════════════════════════════════════════════════════
# WinTransparency.ps1 — System-Wide Acrylic/Transparency Script
# ═══════════════════════════════════════════════════════════════════════
# Edit the CONFIG section below to adjust everything.
# Run once to enable, run again to disable.
# Usage: .\win_transparency.ps1
#        .\win_transparency.ps1 toggle
#        .\win_transparency.ps1 boot (install startup)
# ═══════════════════════════════════════════════════════════════════════

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$StateFile  = Join-Path $ScriptDir "transparency_state.txt"
$DWMExe     = "C:\Program Files\DWMBlurGlass\Release\DWMBlurGlass.exe"

# ─── CONFIG ─────────────────────────────────────────────────────────
# $true = transparent everywhere, $false = disable all
$Enabled        = $true

# Accent color in hex (AARRGGBB). Change to whatever you like.
$AccentColor    = "0xC400B7C3"

# Dark theme (recommended for transparency look)
$DarkTheme      = $true

# Aero Peek (hover transparency on taskbar)
$AeroPeek       = $true

# Drop shadows on windows
$DropShadows    = $true

# ─── HELPERS ──────────────────────────────────────────────────────
function Get-Val { param($cond, $t, $f); if ($cond) { return $t } else { return $f } }

# ─── DWM BLUR GLASS ────────────────────────────────────────────────
function Start-DWMBlurGlass {
    if (Test-Path $DWMExe) {
        $running = Get-Process | Where-Object {$_.Name -match "DWMBlur"} | Select-Object -First 1
        if (-not $running) {
            Start-Process $DWMExe -WindowStyle Minimized
            Start-Sleep -Seconds 2
            Write-Host "DWMBlurGlass launched." -ForegroundColor Cyan
        } else {
            Write-Host "DWMBlurGlass already running (PID $($running.Id))." -ForegroundColor Cyan
        }
    } else {
        Write-Host "DWMBlurGlass not found at $DWMExe" -ForegroundColor Red
    }
}

# ─── APPLY ────────────────────────────────────────────────────────
function Apply-Transparency {
    Write-Host "Applying transparency settings..." -ForegroundColor Cyan

    $regPath = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize"
    $val_E = Get-Val $Enabled 1 0
    $val_CP = Get-Val $Enabled 1 0
    $val_UL = Get-Val $DarkTheme 0 1
    $val_SL = Get-Val $DarkTheme 0 1

    Set-ItemProperty -Path $regPath -Name "EnableTransparency"     -Value $val_E -Type DWord -Force
    Set-ItemProperty -Path $regPath -Name "ColorPrevalence"        -Value $val_CP -Type DWord -Force
    Set-ItemProperty -Path $regPath -Name "AppsUseLightTheme"      -Value $val_UL -Type DWord -Force
    Set-ItemProperty -Path $regPath -Name "SystemUsesLightTheme"   -Value $val_SL -Type DWord -Force

    $dwmPath = "HKCU:\SOFTWARE\Microsoft\Windows\DWM"
    $colorInt = [Convert]::ToInt32($AccentColor.Replace("0x",""), 16)
    Set-ItemProperty -Path $dwmPath -Name "ColorizationColor"    -Value $colorInt -Type DWord -Force
    Set-ItemProperty -Path $dwmPath -Name "ColorizationAfterglow" -Value $colorInt -Type DWord -Force
    Set-ItemProperty -Path $dwmPath -Name "EnableAeroPeek"       -Value (Get-Val $AeroPeek 1 0) -Type DWord -Force
    Set-ItemProperty -Path $dwmPath -Name "UseDropShadow"        -Value (Get-Val $DropShadows 1 0) -Type DWord -Force

    # Save state
    $state = @{
        Enabled        = $Enabled
        AccentColor    = $AccentColor
        DarkTheme      = $DarkTheme
        AeroPeek       = $AeroPeek
        DropShadows    = $DropShadows
    }
    $state | ConvertTo-Json | Set-Content -Path $StateFile -Force

    # Restart Explorer to apply
    Write-Host "Restarting Explorer..." -ForegroundColor Yellow
    # taskkill /F /IM explorer.exe (Disabled: breaks UWP shell & Lively)
    Start-Sleep -Seconds 2
    # Start-Process explorer.exe (Disabled)

    # taskkill StartMenuExperienceHost.exe (Disabled)

    # Launch DWMBlurGlass for full-window transparency
    Start-DWMBlurGlass

    Write-Host ""
    Write-Host "Done! Transparency is $(if ($Enabled) {'ON'} else {'OFF'})." -ForegroundColor Green
    Write-Host "Accent color: $AccentColor | Dark theme: $DarkTheme" -ForegroundColor Gray
    Write-Host "DWMBlurGlass: Full-window blur active." -ForegroundColor Cyan
}

# ─── TOGGLE ───────────────────────────────────────────────────────
function Toggle-Transparency {
    $state = $null
    if (Test-Path $StateFile) {
        $state = Get-Content $StateFile | ConvertFrom-Json
    }
    $Enabled = -not $state.Enabled
    Write-Host "Transparency toggled to: $(if ($Enabled) {'ON'} else {'OFF'})" -ForegroundColor Cyan
    Apply-Transparency
}

# ─── BOOT STARTUP ──────────────────────────────────────────────────
function Install-BootStartup {
    $Trigger = New-ScheduledTaskTrigger -AtLogOn
    $Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
    $Settings  = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

    # WinTransparency task
    $Action1 = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptDir\win_transparency.ps1`""
    Register-ScheduledTask -TaskName "WinTransparency" -Action $Action1 -Trigger $Trigger -Principal $Principal -Settings $Settings -Force

    # DWMBlurGlass task
    $Action2 = New-ScheduledTaskAction -Execute "cmd.exe" -Argument '/c start "" "C:\Program Files\DWMBlurGlass\Release\DWMBlurGlass.exe"'
    Register-ScheduledTask -TaskName "DWMBlurGlass" -Action $Action2 -Trigger $Trigger -Principal $Principal -Settings $Settings -Force

    Write-Host "Boot startup tasks installed: 'WinTransparency' + 'DWMBlurGlass'" -ForegroundColor Green
}

function Remove-BootStartup {
    Unregister-ScheduledTask -TaskName "WinTransparency" -Confirm:$false -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName "DWMBlurGlass" -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Boot startup tasks removed." -ForegroundColor Yellow
}

# ─── MAIN ────────────────────────────────────────────────────────
$arg = $args[0]
if ($arg -eq "toggle")       { Toggle-Transparency }
elseif ($arg -eq "boot")      { Install-BootStartup }
elseif ($arg -eq "remove")    { Remove-BootStartup }
elseif ($arg -eq "disable")   { $Enabled = $false; Apply-Transparency }
elseif ($arg -eq "enable")    { $Enabled = $true;  Apply-Transparency }
else                          { Apply-Transparency }

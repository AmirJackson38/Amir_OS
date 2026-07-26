# Start OmniRoute on boot (background, no window)
# This script starts OmniRoute and redirects output to a log file

$logPath = "$env:TEMP\omniroute_boot.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Add-Content -Path $logPath -Value "[$timestamp] Starting OmniRoute..."

try {
    # Start OmniRoute in background with no window
    $process = Start-Process -FilePath "omniroute" -WindowStyle Hidden -PassThru -NoNewWindow -RedirectStandardOutput $logPath -RedirectStandardError $logPath
    Add-Content -Path $logPath -Value "[$timestamp] OmniRoute started (PID: $($process.Id))"
}
catch {
    Add-Content -Path $logPath -Value "[$timestamp] ERROR: Failed to start OmniRoute: $_"
    exit 1
}

# Wait briefly for OmniRoute to initialize
Start-Sleep -Seconds 2

# Verify OmniRoute is running
$check = Get-Process omniroute -ErrorAction SilentlyContinue
if ($check) {
    Add-Content -Path $logPath -Value "[$timestamp] OmniRoute verification successful"
}
else {
    Add-Content -Path $logPath -Value "[$timestamp] WARNING: OmniRoute process not found after startup"
}

exit 0

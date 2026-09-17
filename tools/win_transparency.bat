@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0win_transparency.ps1" %*
start "" "C:\Program Files\DWMBlurGlass\Release\DWMBlurGlass.exe"
echo Transparency + DWMBlurGlass activated!

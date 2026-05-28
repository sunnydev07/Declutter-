@echo off
:: Emergency Unlock Script for Declutter Focus App
:: Run this as Administrator or from Safe Mode if your system is locked!
echo ===================================================
echo   Declutter Focus App - Emergency Unlock ^& Repair  
echo ===================================================
echo.

echo [1/3] Terminating Declutter background service and app...
taskkill /f /im declutter-service.exe >nul 2>&1
taskkill /f /im tauri-app.exe >nul 2>&1

echo [2/3] Forcefully resetting Windows Registry policies...

:: Reset Task Manager & Registry Tools restrictions
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System" /v DisableTaskMgr /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System" /v DisableRegistryTools /t REG_DWORD /d 0 /f >nul 2>&1

:: Reset Command Prompt restrictions
reg add "HKCU\Software\Policies\Microsoft\Windows\System" /v DisableCMD /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System" /v DisableCMD /t REG_DWORD /d 0 /f >nul 2>&1

echo [3/3] Flushing DNS cache...
ipconfig /flushdns >nul 2>&1

echo.
echo ===================================================
echo   SUCCESS: Windows Registry Policies Reset!
echo   Task Manager, CMD, and Registry Tools are enabled.
echo ===================================================
echo.
pause

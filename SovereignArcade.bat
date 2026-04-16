@echo off
title SOVEREIGN ARCADE — VERITAS OMEGA
color 0A
cd /d "%~dp0"

echo.
echo   ==========================================
echo     SOVEREIGN ARCADE — VERITAS OMEGA
echo   ==========================================
echo.

:: Check if node_modules exists
if not exist "node_modules\" (
  echo   [*] First run — installing dependencies...
  call npm install --prefix . 2>nul
  if errorlevel 1 (
    echo   [!] npm install failed. Ensure Node.js is installed.
    pause
    exit /b 1
  )
  echo   [OK] Dependencies installed.
  echo.
)

echo   [*] Launching Sovereign Arcade...
start "" /b npx electron . 2>nul
if errorlevel 1 (
  echo   [!] Launch failed. Trying alternate method...
  call npx electron .
)

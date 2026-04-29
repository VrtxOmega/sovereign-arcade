@echo off
cd /d "%~dp0"
echo Starting Sovereign Miner Telemetry Backend...
start "Sovereign Telemetry Backend" cmd /c "python server.py"

echo Starting Sovereign Miner Telemetry Dashboard...
cd dashboard
npm run dev -- --open

@echo off
title SOVEREIGN BREAKOUT — VERITAS OMEGA
cd /d "%~dp0"
if not exist node_modules (
  echo [VERITAS] Installing dependencies...
  npm install --silent
)
echo [VERITAS] Launching Sovereign Breakout...
npx electron .

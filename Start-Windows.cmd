@echo off
cd /d "%~dp0"
call pnpm start --hostname 127.0.0.1
if errorlevel 1 pause

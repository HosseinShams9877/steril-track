@echo off
cd /d "%~dp0"
call pnpm backup
if errorlevel 1 (pause & exit /b 1)
pause

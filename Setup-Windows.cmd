@echo off
cd /d "%~dp0"
call pnpm install --frozen-lockfile
if errorlevel 1 goto fail
call pnpm db:generate
if errorlevel 1 goto fail
call pnpm setup
if errorlevel 1 goto fail
call pnpm build
if errorlevel 1 goto fail
echo Ready. Run Start-Windows.cmd
pause
exit /b 0
:fail
echo Setup failed. Read the error above; existing v2 databases need pnpm db:baseline.
pause
exit /b 1

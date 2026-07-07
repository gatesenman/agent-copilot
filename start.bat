@echo off
rem ============================================================
rem  Agent Copilot - One-Click Start (Windows)
rem  ASCII-only on purpose: cmd parses .bat with the ANSI codepage
rem  BEFORE chcp takes effect, so non-ASCII text can crash parsing.
rem ============================================================
setlocal
title Agent Copilot - One-Click Start
cd /d "%~dp0"

echo ============================================
echo   Agent Copilot ^| Enterprise AI UI Kit
echo   One-Click Start (Windows)
echo ============================================
echo.

rem ---------- 1. Check Node.js ----------
echo [1/4] Checking Node.js ...
where node >nul 2>nul
if errorlevel 1 (
    echo   [ERROR] Node.js not found.
    echo   Please install Node.js 18+ from https://nodejs.org/
    goto :fail
)

set "NODE_VER="
for /f "delims=" %%v in ('node -v 2^>nul') do set "NODE_VER=%%v"
if not defined NODE_VER (
    echo   [ERROR] Failed to read Node.js version.
    goto :fail
)

set "NODE_MAJOR=0"
for /f "tokens=1 delims=." %%m in ("%NODE_VER:v=%") do set "NODE_MAJOR=%%m"
if "%NODE_MAJOR%"=="" set "NODE_MAJOR=0"
if %NODE_MAJOR% LSS 18 (
    echo   [ERROR] Node.js version too old: %NODE_VER% ^(need 18+^)
    echo   Please upgrade: https://nodejs.org/
    goto :fail
)
echo   [OK] Node.js %NODE_VER%

rem ---------- 2. Check pnpm ----------
echo [2/4] Checking pnpm ...
where pnpm >nul 2>nul
if errorlevel 1 (
    echo   [INFO] pnpm not found, trying corepack ...
    call corepack enable pnpm >nul 2>nul
    where pnpm >nul 2>nul
)
where pnpm >nul 2>nul
if errorlevel 1 (
    echo   [INFO] corepack unavailable, trying: npm install -g pnpm ...
    call npm install -g pnpm
    where pnpm >nul 2>nul
)
where pnpm >nul 2>nul
if errorlevel 1 (
    echo   [ERROR] Could not install pnpm. Run manually: npm install -g pnpm
    goto :fail
)
set "PNPM_VER="
for /f "delims=" %%v in ('pnpm -v 2^>nul') do set "PNPM_VER=%%v"
echo   [OK] pnpm %PNPM_VER%

rem ---------- 3. Install dependencies ----------
rem NOTE: no parenthesized block here on purpose - %ERRORLEVEL% inside
rem an ( ) block expands at parse time and would always read the old value.
echo [3/4] Checking dependencies ...
if exist "node_modules\" (
    echo   [OK] node_modules already present
    goto :port_check
)
echo   [INFO] Installing dependencies, first run takes 1-3 min ...
call pnpm install
if errorlevel 1 (
    echo   [ERROR] pnpm install failed. Check network and retry.
    goto :fail
)
echo   [OK] Dependencies installed

:port_check

rem ---------- 4. Check port and start ----------
echo [4/4] Checking port 3000 ...
netstat -ano 2>nul | findstr /r /c:":3000 .*LISTENING" >nul 2>nul
if not errorlevel 1 (
    echo   [INFO] Port 3000 already in use - another instance may be running.
    echo   Opening http://localhost:3000 in your browser ...
    start "" http://localhost:3000
    goto :done
)
echo   [OK] Port 3000 available
echo.
echo ============================================
echo   All checks passed. Starting dev server ...
echo   URL: http://localhost:3000
echo   Press Ctrl+C to stop
echo ============================================
echo.

rem Open the browser after 3 seconds (wait for Vite to be ready)
start "" cmd /c "timeout /t 3 /nobreak >nul 2>nul & start http://localhost:3000"

call pnpm dev
echo.
echo Dev server exited.
goto :done

:fail
echo.
echo Startup failed. Fix the issue above, then run this script again.
echo.
pause
exit /b 1

:done
echo.
pause
exit /b 0

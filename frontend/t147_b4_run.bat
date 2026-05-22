@echo off
REM ============================================================
REM  t147_b4_run.bat
REM  Session 147 - B4: extract Top 500 ja_value frequencies
REM  Input  : frontend\japanese_unmapped.csv
REM  Output : frontend\japanese_unmapped_top500.csv
REM ============================================================

setlocal

set "NODE=C:\Program Files\nodejs\node.exe"
set "ROOT=E:\project\GeniegoROI\frontend"
set "SCRIPT=%ROOT%\session147_b4_top_freq.mjs"
set "INPUT=%ROOT%\japanese_unmapped.csv"

echo.
echo [t147_b4] checking node...
if not exist "%NODE%" (
    echo [ERROR] node.exe not found at: %NODE%
    exit /b 1
)

echo [t147_b4] checking script...
if not exist "%SCRIPT%" (
    echo [ERROR] script not found: %SCRIPT%
    exit /b 1
)

echo [t147_b4] checking input...
if not exist "%INPUT%" (
    echo [ERROR] input csv not found: %INPUT%
    exit /b 1
)

echo [t147_b4] cd to: %ROOT%
cd /d "%ROOT%"
if errorlevel 1 (
    echo [ERROR] cd failed
    exit /b 1
)

echo [t147_b4] running node...
echo ============================================================
"%NODE%" "%SCRIPT%"
set RC=%ERRORLEVEL%
echo ============================================================

if not "%RC%"=="0" (
    echo [ERROR] node exited with code %RC%
    exit /b %RC%
)

echo [t147_b4] done. output: %ROOT%\japanese_unmapped_top500.csv
endlocal
exit /b 0

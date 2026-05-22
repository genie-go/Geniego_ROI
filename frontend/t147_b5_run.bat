@echo off
REM ============================================================
REM  t147_b5_run.bat
REM  Session 147 - B5: parse top500_raw.txt -> japanese_top500_mapped.csv
REM  Input  : frontend\top500_raw.txt   (user-saved 5 BATCH blocks)
REM  Output : frontend\japanese_top500_mapped.csv
REM ============================================================

setlocal

set "NODE=C:\Program Files\nodejs\node.exe"
set "ROOT=E:\project\GeniegoROI\frontend"
set "SCRIPT=%ROOT%\session147_b5_parse_top500.mjs"
set "INPUT=%ROOT%\top500_raw.txt"

echo.
echo [t147_b5] checking node...
if not exist "%NODE%" (
    echo [ERROR] node.exe not found at: %NODE%
    exit /b 1
)

echo [t147_b5] checking script...
if not exist "%SCRIPT%" (
    echo [ERROR] script not found: %SCRIPT%
    exit /b 1
)

echo [t147_b5] checking input...
if not exist "%INPUT%" (
    echo [ERROR] input txt not found: %INPUT%
    echo Please save the 5 BATCH blocks from chat to this file.
    exit /b 1
)

echo [t147_b5] cd to: %ROOT%
cd /d "%ROOT%"
if errorlevel 1 (
    echo [ERROR] cd failed
    exit /b 1
)

echo [t147_b5] running node...
echo ============================================================
"%NODE%" "%SCRIPT%"
set RC=%ERRORLEVEL%
echo ============================================================

if not "%RC%"=="0" (
    echo [ERROR] node exited with code %RC%
    exit /b %RC%
)

echo [t147_b5] done. output: %ROOT%\japanese_top500_mapped.csv
endlocal
exit /b 0

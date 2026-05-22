@echo off
REM ============================================================
REM  t147_b5v2_run.bat
REM  Session 147 - B5 V2: parse + script-purity validation
REM  Input  : frontend\top500_raw.txt
REM  Output : frontend\japanese_top500_mapped.csv
REM  V2 adds: hangul-in-ja, kana-in-ko, hanzi-in-ko warnings
REM ============================================================

setlocal

set "NODE=C:\Program Files\nodejs\node.exe"
set "ROOT=E:\project\GeniegoROI\frontend"
set "SCRIPT=%ROOT%\session147_b5_parse_top500_v2.mjs"
set "INPUT=%ROOT%\top500_raw.txt"

echo.
echo [t147_b5v2] checking node...
if not exist "%NODE%" (
    echo [ERROR] node.exe not found at: %NODE%
    exit /b 1
)

echo [t147_b5v2] checking script...
if not exist "%SCRIPT%" (
    echo [ERROR] script not found: %SCRIPT%
    exit /b 1
)

echo [t147_b5v2] checking input...
if not exist "%INPUT%" (
    echo [ERROR] input txt not found: %INPUT%
    exit /b 1
)

echo [t147_b5v2] cd to: %ROOT%
cd /d "%ROOT%"
if errorlevel 1 (
    echo [ERROR] cd failed
    exit /b 1
)

echo [t147_b5v2] running node...
echo ============================================================
"%NODE%" "%SCRIPT%"
set RC=%ERRORLEVEL%
echo ============================================================

if not "%RC%"=="0" (
    echo [ERROR] node exited with code %RC%
    exit /b %RC%
)

echo [t147_b5v2] done. output: %ROOT%\japanese_top500_mapped.csv
endlocal
exit /b 0

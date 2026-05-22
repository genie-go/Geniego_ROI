@echo off
REM ============================================================
REM  t147_b8a_run.bat
REM  Session 147 - B8-A: split unmapped CSV into 10 batches
REM  Input  : frontend\japanese_b1_b5_unmapped.csv
REM  Output : frontend\japanese_unmapped_batch_01.csv ... _batch_10.csv
REM ============================================================

setlocal

set "NODE=C:\Program Files\nodejs\node.exe"
set "ROOT=E:\project\GeniegoROI\frontend"
set "SCRIPT=%ROOT%\session147_b8a_split_unmapped.mjs"
set "INPUT=%ROOT%\japanese_b1_b5_unmapped.csv"

echo.
echo [t147_b8a] checking node...
if not exist "%NODE%" (
    echo [ERROR] node.exe not found at: %NODE%
    exit /b 1
)

echo [t147_b8a] checking script...
if not exist "%SCRIPT%" (
    echo [ERROR] script not found: %SCRIPT%
    exit /b 1
)

echo [t147_b8a] checking input...
if not exist "%INPUT%" (
    echo [ERROR] unmapped CSV not found: %INPUT%
    exit /b 1
)

echo [t147_b8a] cd to: %ROOT%
cd /d "%ROOT%"
if errorlevel 1 (
    echo [ERROR] cd failed
    exit /b 1
)

echo [t147_b8a] running node...
echo ============================================================
"%NODE%" "%SCRIPT%"
set RC=%ERRORLEVEL%
echo ============================================================

if not "%RC%"=="0" (
    echo [ERROR] node exited with code %RC%
    exit /b %RC%
)

echo [t147_b8a] done. 10 batch CSVs created in: %ROOT%
endlocal
exit /b 0

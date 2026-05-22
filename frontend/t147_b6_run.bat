@echo off
REM ============================================================
REM  t147_b6_run.bat
REM  Session 147 - B6: merge auto + top500 mappings
REM  Inputs : frontend\japanese_pollution_workbook.csv
REM           frontend\japanese_auto_mapped.csv
REM           frontend\japanese_top500_mapped.csv
REM  Outputs: frontend\japanese_b1_b5_merged.csv     (mapped 1,327)
REM           frontend\japanese_b1_b5_unmapped.csv   (tail ~3,300)
REM ============================================================

setlocal

set "NODE=C:\Program Files\nodejs\node.exe"
set "ROOT=E:\project\GeniegoROI\frontend"
set "SCRIPT=%ROOT%\session147_b6_merge_mappings.mjs"

echo.
echo [t147_b6] checking node...
if not exist "%NODE%" (
    echo [ERROR] node.exe not found at: %NODE%
    exit /b 1
)

echo [t147_b6] checking script...
if not exist "%SCRIPT%" (
    echo [ERROR] script not found: %SCRIPT%
    exit /b 1
)

echo [t147_b6] checking inputs...
if not exist "%ROOT%\japanese_pollution_workbook.csv" (
    echo [ERROR] workbook CSV missing
    exit /b 1
)
if not exist "%ROOT%\japanese_auto_mapped.csv" (
    echo [ERROR] auto-mapped CSV missing
    exit /b 1
)
if not exist "%ROOT%\japanese_top500_mapped.csv" (
    echo [ERROR] top500 CSV missing
    exit /b 1
)

echo [t147_b6] cd to: %ROOT%
cd /d "%ROOT%"
if errorlevel 1 (
    echo [ERROR] cd failed
    exit /b 1
)

echo [t147_b6] running node...
echo ============================================================
"%NODE%" "%SCRIPT%"
set RC=%ERRORLEVEL%
echo ============================================================

if not "%RC%"=="0" (
    echo [ERROR] node exited with code %RC%
    exit /b %RC%
)

echo [t147_b6] done.
echo   merged   : %ROOT%\japanese_b1_b5_merged.csv
echo   unmapped : %ROOT%\japanese_b1_b5_unmapped.csv
endlocal
exit /b 0

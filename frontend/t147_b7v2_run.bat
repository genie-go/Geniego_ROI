@echo off
REM ============================================================
REM  t147_b7v2_run.bat
REM  Session 147 - B7 V2: apply with full-path matching
REM
REM  DEFAULT: DRY-RUN (no writes)
REM  Pass --apply to actually patch ko.js:
REM    t147_b7v2_run.bat --apply
REM
REM  V2 fix: namespace-stack parsing of ko.js source so that
REM          each CSV row's full dotted path resolves to a UNIQUE
REM          string literal offset (no finalKey ambiguity).
REM ============================================================

setlocal

set "NODE=C:\Program Files\nodejs\node.exe"
set "ROOT=E:\project\GeniegoROI\frontend"
set "SCRIPT=%ROOT%\session147_b7_apply_patch_v2.mjs"
set "MERGED=%ROOT%\japanese_b1_b5_merged.csv"
set "KOJS=%ROOT%\src\i18n\locales\ko.js"

echo.
echo [t147_b7v2] checking node...
if not exist "%NODE%" (
    echo [ERROR] node.exe not found at: %NODE%
    exit /b 1
)

echo [t147_b7v2] checking script...
if not exist "%SCRIPT%" (
    echo [ERROR] script not found: %SCRIPT%
    exit /b 1
)

echo [t147_b7v2] checking merged.csv...
if not exist "%MERGED%" (
    echo [ERROR] merged CSV not found: %MERGED%
    exit /b 1
)

echo [t147_b7v2] checking ko.js...
if not exist "%KOJS%" (
    echo [ERROR] ko.js not found: %KOJS%
    exit /b 1
)

echo [t147_b7v2] cd to: %ROOT%
cd /d "%ROOT%"
if errorlevel 1 (
    echo [ERROR] cd failed
    exit /b 1
)

echo [t147_b7v2] running node (args: %*)...
echo ============================================================
"%NODE%" "%SCRIPT%" %*
set RC=%ERRORLEVEL%
echo ============================================================

if not "%RC%"=="0" (
    echo [ERROR] node exited with code %RC%
    exit /b %RC%
)

echo [t147_b7v2] done.
endlocal
exit /b 0

@echo off
REM 147차 STEP 2: 일본어 폴루션 자동 매핑
REM 입력: japanese_pollution_workbook.csv
REM 산출: japanese_auto_mapped.csv + japanese_unmapped.csv

set NODE="C:\Program Files\nodejs\node.exe"
set ROOT=E:\project\GeniegoROI\frontend

if not exist "%ROOT%\japanese_pollution_workbook.csv" (
  echo [ERROR] workbook not found: %ROOT%\japanese_pollution_workbook.csv
  exit /b 1
)
if not exist "%ROOT%\session147_b3_auto_map_japanese.mjs" (
  echo [ERROR] script not found: %ROOT%\session147_b3_auto_map_japanese.mjs
  exit /b 1
)

cd /d %ROOT%

echo [t147_b3] auto-mapping japanese pollution ...
%NODE% session147_b3_auto_map_japanese.mjs

if errorlevel 1 (
  echo [ERROR] mapping failed
  exit /b 1
)

echo.
echo [DONE]
echo  - japanese_auto_mapped.csv (auto mapped)
echo  - japanese_unmapped.csv    (needs manual review)

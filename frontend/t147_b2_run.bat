@echo off
REM 147차 STEP 1: ko.js JAPANESE 오염 추출
REM 산출물: D:\project\GeniegoROI\japanese_pollution_workbook.csv

cd /d D:\project\GeniegoROI

echo [t147_b2] extracting japanese pollution from ko.js ...
node session147_b2_extract_japanese.mjs

if errorlevel 1 (
  echo [ERROR] extraction failed
  exit /b 1
)

echo.
echo [DONE] japanese_pollution_workbook.csv generated
echo  → 검수자 검토 후 proposed_ko 컬럼 채워서 회신

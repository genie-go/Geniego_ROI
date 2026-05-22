@echo off
REM 147차 STEP 1 (v2): ko.js JAPANESE 오염 추출
REM 경로: E:\project\GeniegoROI\frontend\
REM 산출물: japanese_pollution_workbook.csv

cd /d E:\project\GeniegoROI\frontend

if not exist "src\i18n\locales\ko.js" (
  echo [ERROR] ko.js not found at src\i18n\locales\ko.js
  exit /b 1
)
if not exist "src\i18n\locales\ja.js" (
  echo [ERROR] ja.js not found at src\i18n\locales\ja.js
  exit /b 1
)

echo [t147_b2_v2] extracting japanese pollution from ko.js ...
node session147_b2_extract_japanese_v2.mjs

if errorlevel 1 (
  echo [ERROR] extraction failed
  exit /b 1
)

echo.
echo [DONE] japanese_pollution_workbook.csv generated
echo  location: E:\project\GeniegoROI\frontend\japanese_pollution_workbook.csv

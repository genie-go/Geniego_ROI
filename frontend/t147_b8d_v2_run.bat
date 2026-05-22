@echo off
chcp 65001 >nul
echo ===================================================================
echo  Session 147 - B8-D v2: Parse 10 batches + Top 500 -^> tail_mapped.csv
echo ===================================================================
echo.
echo V2 IMPROVEMENTS over v1:
echo   1. Un-escape \n \r \t in batch raw txt (handles reviews.aiReply*)
echo   2. ja_value normalization for round-trip corruption:
echo      - 適용 (Hangul) -^> 適用 (Kanji)
echo      - 🇯 / 🇰 (truncated flags) -^> 🇯🇵 / 🇰🇷
echo   3. ko-side flag normalization (same fix for proposed_ko)
echo.
echo Expected: FULL COVERAGE (2,505 / 2,505), 0 lookup misses
echo.
echo ===================================================================
echo.

cd /d E:\project\GeniegoROI\frontend
"C:\Program Files\nodejs\node.exe" session147_b8d_parse_and_expand_v2.mjs

echo.
echo ===================================================================
echo  B8-D v2 complete. Review outputs above.
echo ===================================================================
pause

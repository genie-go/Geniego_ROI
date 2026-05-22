@echo off
chcp 65001 >nul
echo ===================================================================
echo  Session 147 - B8-D: Parse 10 batches + Top 500 -^> tail_mapped.csv
echo ===================================================================
echo.
echo Inputs required in E:\project\GeniegoROI\frontend\ :
echo   - session147_b8b_batch_01_raw.txt .. _batch_10_raw.txt
echo   - top500_raw.txt
echo   - japanese_b1_b5_unmapped.csv
echo.
echo Outputs:
echo   - japanese_b8_combined_mapping.csv  (unique ja_value -^> proposed_ko)
echo   - japanese_tail_mapped.csv           (2,505 rows for b8e patch)
echo   - b8d_parse_log.txt                  (validation report)
echo.
echo ===================================================================
echo.

cd /d E:\project\GeniegoROI\frontend
"C:\Program Files\nodejs\node.exe" session147_b8d_parse_and_expand.mjs

echo.
echo ===================================================================
echo  B8-D complete. Review outputs above before proceeding to b8e.
echo ===================================================================
pause

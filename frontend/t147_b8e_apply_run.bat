@echo off
chcp 65001 >nul
echo ===================================================================
echo  Session 147 - B8-E APPLY: COMMIT to ko.js
echo ===================================================================
echo.
echo *** WARNING: This will MODIFY ko.js ***
echo.
echo Prerequisites (must pass DRY-RUN first):
echo   - t147_b8e_run.bat shows patched=2505, mismatch=0, not_found=0
echo   - All 7 safety guards green
echo.
echo Backup will be created at: backup_session147_B8E\ko.js.bak
echo.
echo ===================================================================
echo.

cd /d E:\project\GeniegoROI\frontend
"C:\Program Files\nodejs\node.exe" session147_b8e_apply_tail_patch.mjs --apply

echo.
echo ===================================================================
echo  B8-E APPLY complete. Review SUMMARY above for guard results.
echo  Expected: All 7 guards passed, exit 0
echo ===================================================================
pause

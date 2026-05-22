@echo off
chcp 65001 >nul
echo ===================================================================
echo  Session 147 - B8-E: Apply tail_mapped.csv to ko.js (DRY-RUN)
echo ===================================================================
echo.
echo This is DRY-RUN mode. ko.js will NOT be modified.
echo.
echo Algorithm: same as b7v2 (full-dotted-path + offset-based patch)
echo Input    : japanese_tail_mapped.csv (B8-D v2 output, 2,505 rows)
echo Backup   : backup_session147_B8E/ko.js.bak (created on --apply only)
echo.
echo Safety guards (N-145-B, 7 of them):
echo   G1. Backup ko.js to backup_session147_B8E/
echo   G2. ja.js bytes unchanged (SHA256, N-79 sacred)
echo   G3. zh.js bytes unchanged (SHA256, N-79 sacred)
echo   G4. en.js leaf count unchanged
echo   G5. ko.js leaf count unchanged (path-only edit)
echo   G6. Dry-run first (this); APPLY requires explicit --apply flag
echo   G7. ko.js re-import syntax check; rollback on fail
echo.
echo Expected DRY-RUN result:
echo   csv rows         : 2505
echo   patched (ok)     : 2505    (all rows match unambiguously)
echo   path not found   : 0
echo   value mismatch   : 0
echo   skipped (empty)  : 0
echo.
echo ===================================================================
echo.

cd /d E:\project\GeniegoROI\frontend
"C:\Program Files\nodejs\node.exe" session147_b8e_apply_tail_patch.mjs

echo.
echo ===================================================================
echo  B8-E DRY-RUN complete. To commit, run:
echo    "C:\Program Files\nodejs\node.exe" session147_b8e_apply_tail_patch.mjs --apply
echo  (or use t147_b8e_apply_run.bat)
echo ===================================================================
pause

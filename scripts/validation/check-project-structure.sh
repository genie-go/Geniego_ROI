#!/usr/bin/env bash
# Project Structure Validation Script for GeniegoROI CCIS Part001

echo "=== GeniegoROI Structure Check ==="
[ -d "frontend" ] && echo "[OK] frontend directory exists" || echo "[FAIL] frontend missing"
[ -d "backend" ] && echo "[OK] backend directory exists" || echo "[FAIL] backend missing"
[ -d "docs" ] && echo "[OK] docs directory exists" || echo "[FAIL] docs missing"
[ -d "docs/ccis" ] && echo "[OK] docs/ccis directory exists" || echo "[FAIL] docs/ccis missing"
[ -d "docs/implementation" ] && echo "[OK] docs/implementation directory exists" || echo "[FAIL] docs/implementation missing"
echo "==================================="

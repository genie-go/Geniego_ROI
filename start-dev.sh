#!/usr/bin/env bash
# GeniegoROI 로컬 개발 서버 동시 구동 (Linux/macOS)
# 백엔드 PHP(:8080) + 프론트 Vite(:5173, 백엔드로 프록시)
set -euo pipefail
cd "$(dirname "$0")"

[ -f backend/.env ] || { echo "backend/.env 없음 — 먼저 bash install.sh 실행"; exit 1; }

echo "▸ 백엔드 시작: http://localhost:8080"
php -S localhost:8080 -t backend/public >/tmp/geniego_backend.log 2>&1 &
BACKEND_PID=$!
trap 'echo; echo "종료 중…"; kill $BACKEND_PID 2>/dev/null || true' EXIT INT TERM
sleep 1

echo "▸ 프론트 시작: http://localhost:5173 (백엔드로 프록시)"
cd frontend
VITE_PROXY_TARGET=http://localhost:8080 npx vite --host localhost

# GeniegoROI 로컬 개발 서버 동시 구동 (Windows / PowerShell)
# 백엔드 PHP(:8080) + 프론트 Vite(:5173, 백엔드로 프록시)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if(-not (Test-Path backend/.env)){ Write-Host "backend/.env 없음 — 먼저 ./install.ps1 실행" -ForegroundColor Red; exit 1 }

Write-Host "▸ 백엔드 시작: http://localhost:8080" -ForegroundColor Cyan
$backend = Start-Process -FilePath "php" -ArgumentList "-S","localhost:8080","-t","backend/public" -PassThru -NoNewWindow
Start-Sleep -Seconds 1

try {
  Write-Host "▸ 프론트 시작: http://localhost:5173 (백엔드로 프록시)" -ForegroundColor Cyan
  $env:VITE_PROXY_TARGET = 'http://localhost:8080'
  Set-Location frontend
  npx vite --host localhost
} finally {
  Write-Host "`n종료 중…" -ForegroundColor Yellow
  if($backend -and -not $backend.HasExited){ Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue }
}

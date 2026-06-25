# ==============================================================================
# GeniegoROI 로컬 인스톨러 (Windows / PowerShell)
# 협업자가 클론 후 `./install.ps1` 한 번으로 웹(프론트+백엔드)+DB(SQLite 자동) 구성.
# 실행:  powershell -ExecutionPolicy Bypass -File install.ps1
# ==============================================================================
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$Root = (Get-Location).Path
function Say($m){ Write-Host "▸ $m" -ForegroundColor Cyan }
function Ok($m){ Write-Host "✓ $m" -ForegroundColor Green }
function Err($m){ Write-Host "✗ $m" -ForegroundColor Red }

Say "GeniegoROI 로컬 설치 시작 — $Root"

# ── 1. 사전 요구사항 ───────────────────────────────────────────────────
$missing = $false
function Need($cmd,$hint){ if(-not (Get-Command $cmd -ErrorAction SilentlyContinue)){ Err "$cmd 미설치 — $hint"; $script:missing=$true } }
Need node "Node.js 18+ (https://nodejs.org)"
Need npm  "npm (Node.js 동봉)"
Need php  "PHP 8.1+ (https://windows.php.net)"
Need composer "Composer (https://getcomposer.org)"
if($missing){ Err "필수 도구 설치 후 다시 실행하세요."; exit 1 }

$nodeMajor = [int](node -p "process.versions.node.split('.')[0]")
if($nodeMajor -lt 18){ Err "Node 18+ 필요 (현재 $(node -v))"; exit 1 }
$phpOk = (php -r 'echo version_compare(PHP_VERSION,"8.1.0",">=")?"1":"0";')
if($phpOk -ne "1"){ Err "PHP 8.1+ 필요"; exit 1 }
$hasSqlite = (php -r 'echo extension_loaded("pdo_sqlite")?"1":"0";')
if($hasSqlite -ne "1"){ Err "경고: php pdo_sqlite 확장 없음 — php.ini 에서 extension=pdo_sqlite 활성화 필요(SQLite 폴백용)" }
Ok "사전 요구사항 충족 (node $(node -v), php $(php -r 'echo PHP_VERSION;'))"

# ── 2. 프론트엔드 의존성 ───────────────────────────────────────────────
Say "프론트엔드 의존성 설치 (npm install)…"
Push-Location frontend; npm install --no-audit --no-fund; Pop-Location
npm install --no-audit --no-fund
Ok "프론트엔드 의존성 완료"

# ── 3. 백엔드 의존성 ───────────────────────────────────────────────────
Say "백엔드 의존성 설치 (composer install)…"
Push-Location backend; composer install --no-interaction --prefer-dist; Pop-Location
Ok "백엔드 의존성 완료"

# ── 4. .env 생성 + APP_KEY ─────────────────────────────────────────────
if(-not (Test-Path backend/.env)){
  Copy-Item backend/.env.local.example backend/.env
  $key = php -r 'echo base64_encode(random_bytes(32));'
  $envContent = Get-Content backend/.env -Raw
  $envContent = $envContent -replace '(?m)^APP_KEY=\s*$', "APP_KEY=$key"
  [System.IO.File]::WriteAllText("$Root\backend\.env", $envContent, (New-Object System.Text.UTF8Encoding $false))
  Ok "backend/.env 생성 + APP_KEY 발급 (MySQL 없으면 SQLite 자동)"
} else { Ok "backend/.env 이미 존재 — 보존" }

# ── 5. 프론트 로컬 env ─────────────────────────────────────────────────
if(-not (Test-Path frontend/.env.local)){
  "VITE_API_BASE=`nVITE_DEMO_MODE=false`n" | Out-File -FilePath frontend/.env.local -Encoding utf8 -NoNewline
  Ok "frontend/.env.local 생성 (API 상대경로 → vite 프록시 → 로컬 백엔드)"
}

# ── 6. SQLite 데이터 디렉터리 ──────────────────────────────────────────
if(-not (Test-Path data)){ New-Item -ItemType Directory -Path data | Out-Null }
Ok "data/ 디렉터리 준비 (SQLite 저장 위치)"

Write-Host "`n════════ 설치 완료 ════════" -ForegroundColor Green
Write-Host @"
실행:  ./start-dev.ps1      (백엔드 :8080 + 프론트 :5173 동시 구동)
  또는 수동:
    1) 백엔드:  php -S localhost:8080 -t backend/public
    2) 프론트:  cd frontend; `$env:VITE_PROXY_TARGET='http://localhost:8080'; npx vite
브라우저:  http://localhost:5173
DB:  MySQL 미설치 시 자동으로 data/genie_*.sqlite (스키마 자동 생성). 데이터 초기화는 그 파일 삭제.
"@

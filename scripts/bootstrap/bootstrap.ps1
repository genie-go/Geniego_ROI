# scripts/bootstrap/bootstrap.ps1
# GeniegoROI 개발환경 초기화 — Windows 런처
# CCIS Part003 — Development Environment
#
# ★ 이 파일은 로직을 갖지 않는다. bootstrap.sh 를 Git Bash 로 실행하는 얇은 런처다.
#   초기화 절차를 .sh 와 .ps1 두 벌로 유지하면 한쪽만 갱신되는 표류가 반드시 생긴다
#   (Makefile 의 존재하지 않는 .ps1 호출이 실제로 그렇게 죽어 있었다 — CCIS Part002).
#
# 사용법:
#   powershell -ExecutionPolicy Bypass -File scripts\bootstrap\bootstrap.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\bootstrap\bootstrap.ps1 -Check

param(
    [switch]$Check
)

$ErrorActionPreference = 'Stop'

# Git Bash 탐색 — PowerShell 의 `bash` 는 System32 WSL 스텁이라 쓸 수 없다.
$candidates = @(
    "$env:ProgramFiles\Git\bin\bash.exe",
    "${env:ProgramFiles(x86)}\Git\bin\bash.exe",
    "$env:LOCALAPPDATA\Programs\Git\bin\bash.exe"
)

$bash = $null
foreach ($c in $candidates) {
    if (Test-Path $c) { $bash = $c; break }
}

if (-not $bash) {
    $gitCmd = Get-Command git -ErrorAction SilentlyContinue
    if ($gitCmd) {
        # git.exe 가 <Git>\cmd\git.exe 이면 <Git>\bin\bash.exe 를 유추한다
        $guess = Join-Path (Split-Path (Split-Path $gitCmd.Source -Parent) -Parent) 'bin\bash.exe'
        if (Test-Path $guess) { $bash = $guess }
    }
}

if (-not $bash) {
    Write-Error @"
Git Bash(bash.exe)를 찾지 못했습니다.

이 스크립트는 scripts/bootstrap/bootstrap.sh 를 실행하기 위해 Git Bash 가 필요합니다.
PowerShell 의 'bash' 는 WSL 스텁이므로 사용할 수 없습니다.

해결: Git for Windows 를 설치하십시오 — https://git-scm.com/download/win
"@
    exit 1
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
# Git Bash 는 'E:/project/...' 형태(드라이브 문자 + 정방향 슬래시)를 그대로 받는다.
# ※ -replace 의 스크립트블록 치환은 PowerShell 6+ 전용이라 5.1 에서 깨진다 — 쓰지 않는다.
$repoRootUnix = $repoRoot -replace '\\', '/'

$scriptArgs = 'scripts/bootstrap/bootstrap.sh'
if ($Check) { $scriptArgs += ' --check' }

Write-Host "[bootstrap.ps1] Git Bash: $bash"
Write-Host "[bootstrap.ps1] repo    : $repoRoot"

& $bash -lc "cd '$repoRootUnix' && $scriptArgs"
exit $LASTEXITCODE

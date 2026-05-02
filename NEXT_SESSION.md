# GeniegoROI 다음 세션 인수인계 문서

> Last Updated: 2026-05-02 (12차 완료)
> Last Commit: 1f5055d (origin/master 동기화 완료)

---

## 새 Claude에게 보낼 메시지

GeniegoROI 프로젝트 작업을 이어서 진행합니다. 아래는 컨텍스트입니다.

### 프로젝트 정보
- GitHub: https://github.com/genie-go/Geniego_ROI (**Private repo**)
- 로컬 경로: D:\project\GeniegoROI
- 브랜치: master
- 환경: Windows + PowerShell + VS Code (Antigravity) + Cline 에이전트
- Cline 모델: claude-sonnet-4-5-20250929

### 프로젝트 성격
ROI 분석 통합 대시보드 (CRM, KPI, 시스템, P&L 4개 도메인)
- Python 백엔드 + React/Vite 프론트엔드 + PostgreSQL
- 다국어 15개 언어 지원
- 운영 서버: 1.201.177.46 (https://roi.genie-go.com)
- 배포 경로: /home/wwwroot/roi.geniego.com/frontend/dist

### 협업 방식
- Cline 토큰 절약을 위해 Claude 웹과 협업 중
- PowerShell로 가능한 작업은 PowerShell로 (무료)
- 실제 코드 변경만 Cline에 위임 (또는 VS Code 직접 편집)
- 한 줄씩 명령어 실행 (한꺼번에 붙여넣기 금지)
- 매 단계 검증

### 5월 2일 완료된 작업 (총 12차)

1차 (지난 세션)
- .clineignore 셋업 (commit b32ba89)
- 8개 fix 스크립트 archive (commit 3d2dfa3)

2차~8차 (이번 세션)
- 2차: 15개 patch_*.js archive (commit f71eb3a)
- 3차: 7개 patch_*.cjs archive (commit c89a27c)
- 4차: 17개 inject_*.cjs archive (commit 9366c04)
- 5차: 42개 fix_*.cjs archive (commit f6aca11)
- 6차: 33개 기타 일회성 스크립트 archive (commit 946d50a)
- 7차: 47개 misc 일회성 스크립트 archive (commit 8ea9bbb)
- 8차: 14개 misc 일회성 스크립트 archive (commit 4eec099)
- deploy_* 12개는 운영 critical로 판단되어 8차에서 의도적 제외 (옵션 A)
- NEXT_SESSION.md 업데이트 commit (605e209)

9차 (이번 세션)
- 9개 deploy_* 변형 스크립트 archive (commit ca00661)
  - .cjs 7개: deploy_all, deploy_demo_direct, deploy_demo_v2, deploy_kakao,
    deploy_nginx_root, deploy_prod, deploy_scp
  - .js 2개: deploy_ssh2.js, deploy_win.js
- **보존 확정 3개** (docs에서 운영 호출 발견):
  - `deploy_demo.cjs` — JOURNEY_BUILDER_KPI_FIX.md:283 (`node deploy_demo.cjs`),
    BUG-013_DEPLOY_ENCODING_FIX.md:152
  - `deploy_node.cjs` — BUG-013_DEPLOY_ENCODING_FIX.md:151
  - `deploy_ssh2.cjs` — WORK_PROCESS.md:456 (`./deploy_ssh2.cjs --env production --approve`)
- 5단 검증 모두 통과 (package.json 0, require 0, import 0, 인프라 8개 0, docs 5개 0)
- rename 100% 인식 (9 files changed, 0 insertions, 0 deletions)
- NEXT_SESSION.md 업데이트 commit (5361d9e)

10차 (이번 세션)
- **운영 critical 스크립트 3개 보존 확정** (Track B 그룹 1):
  - `deploy.ps1` (313 bytes) — Windows 빌드+배포 orchestrator
    chain: inject_journey_ko.cjs → npm build → package_deploy.py → deploy_paramiko.py
  - `deploy.sh` (652 bytes) — Linux rsync 배포 스크립트
    REMOTE: root@1.201.177.46:/home/wwwroot/roi.geniego.com/frontend/dist
  - `deploy_gitbash.sh` (1694 bytes) — Git Bash 환경 배포
- **deploy_*.txt 로그 3개 git untrack + .gitignore 추가** (commit 443f208):
  - deploy_final.txt, deploy_out.txt, deploy_output.txt (각 6418 bytes)
  - .gitignore에 `deploy_*.txt` 패턴 추가
  - git rm --cached로 추적 해제, 로컬 파일은 보존
- **deploy*.zip 2개 보존 결정** (이미 .gitignore 됨):
  - deploy.zip (3.2MB), deploy_clean.zip (2.3MB)
- **🚨 보안 이슈 발견 (긴급도 ❌, Private repo)**:
  - `deploy_gitbash.sh`에 평문 SSH 비밀번호 하드코딩
  - 노출 commit: `ac6b8be` (2026-05-01 15:19:44)
  - Private repo이므로 즉시 사고 대응은 불필요

11차 (이번 세션)
- **보안 이슈 정리: deploy_gitbash.sh 평문 비밀번호 제거** (commit 67da494)
  - 4단계 사전 점검 모두 통과 후 안전하게 처리
  - **핵심 발견: PASSWORD 변수는 dead code** (선언만 되고 미사용)
  - 운영 영향 0%, VS Code 직접 편집으로 처리, Cline 호출 0회
- **🚨 PowerShell 인코딩 함정 발견**:
  - `(Get-Content) | Where-Object | Set-Content` 패턴은 UTF-8 한글 파일을 깨뜨림
  - Set-Content는 시스템 기본 인코딩 사용 → 한글 주석 모두 `?<XX>` 형태로 깨짐
  - **운영 critical 파일에는 절대 사용 금지**
- **GitHub Actions deploy.yml 분석 결과 (참고용)**:
  - 트리거: `push to main` (현재 브랜치 master와 불일치 → CI 사실상 비활성 가능성)

12차 (이번 세션) ⭐ NEW
- **GitHub Actions CI/CD 활성화: deploy.yml 트리거 master로 변경 + AI 흔적 제거** (commit 1f5055d)
- **🎯 결정적 발견: master는 origin/main과 완전히 별개 history**
  - master root commit `98abb36` (2026-04-28 "production stable") - 단 1개 commit
  - main root commit `970b642` (2026-03-27, 36일 휴면) - 별개 history
  - `git merge-base origin/main origin/master` 출력 0건 → **공통 조상 없음 확정**
  - master에만 16개 commit / main에만 118개 commit (서로 무관)
  - **GitHub Actions가 5월 2일 commit들을 모두 미경유** (main 트리거인데 main에 push 0건)
- **Gemini AI 흔적 발견 — `[cite_start]`, `[cite: N]` 마커**
  - deploy.yml에 AI 도구가 생성한 출처 마커가 commit된 채로 남아있었음
  - `[cite_start]`는 라인 시작에 위치 → YAML 키 이름 변형 위험
- **작업 변경 사항 (총 9곳, 운영 critical)**:
  - 라인 5: `branches: [ main ]` → `branches: [ master ]` (트리거 활성화)
  - 라인 21, 23, 31, 49, 50, 54: `[cite: N]` 6곳 제거
  - 라인 40, 71: `[cite_start]` + `[cite: N]` 2곳 통합 정리
  - 추가: trailing whitespace 6곳 제거
- **검증 통계**:
  - 16개 검증 항목 모두 통과
  - cite 마커 0건, trailing whitespace 0건, BOM 없음 유지 (6E 61 6D)
  - 파일 크기: 2684 → 2582 bytes (-102 bytes)
  - git diff: 1 file changed, 9 insertions(+), 9 deletions(-)
- **🚨 PowerShell 추가 함정 발견 (12차 학습 사례)**:
  - 함정 1: PowerShell 출력 잔상 혼동 (11차 함정 재확인)
  - 함정 2: `Select-Object`가 git 출력 인코딩 변환
  - 함정 3: `git diff --stat` 출력의 `|` 문자가 PowerShell 파싱 에러 유발
  - 함정 4: VS Code Find/Replace All 실행 안 되는 케이스
  - 함정 5: VS Code Quick Open이 .gitignore 파일 못 찾음
- **PowerShell .NET API 안전 처리 패턴 확립** (12차에서 확립)
- **운영 영향**: 0% (운영 배포는 deploy.ps1/deploy.sh 수동 chain 별도 운영)
- **Cline 호출 0회**, 비용 $0 추가

### 누적 통계
- archive된 파일 수: **192개** (8 + 15 + 7 + 17 + 42 + 33 + 47 + 14 + 9)
- archive 위치: tools/migrations/_archived/
- 10차 git untrack: 3개 (deploy_*.txt)
- 10차 보존 확정: 3개 (.ps1, .sh, _gitbash.sh)
- 11차 보안 정리: 1개 (deploy_gitbash.sh PASSWORD 라인 제거)
- 12차 CI 활성화: 1개 (.github/workflows/deploy.yml — 9곳 변경)
- Cline 호출: **0회** (모든 작업 PowerShell + VS Code로 처리)
- 5월 2일 단일 세션 처리량: **184개 archive + 3개 git untrack + 6개 보존 결정 + 1개 보안 정리 + 1개 CI 활성화**
- 비용: $0.0585 유지

### 다음 작업 후보 (우선순위 순)

1. **비스크립트 잡파일 정리 — 별도 트랙**
   - .txt: find_out.txt, keys_out.txt, ko_check.txt, korean_lines.txt, missing_keys.txt 등
   - .json: ko_orderHub.json, korean_map.json, kpi_keys.json, missing_attrData.json 등
   - .py: fix_audit.py, fix_auth.py, restore_authpage.py
   - .sh: ssh_test.sh

2. **i18n 누락 키 9개 추가 — 별도 신중 작업**
   - ko.js에 channelKpiPage 6곳, 9개 키 누락
   - 누락 키: channelKpiPage, tabCommunity, tabContent, tabGoals,
     tabMonitor, tabRoles, tabSetup, tabSns, tabTargets
   - Cline 호출 필요

3. **🟡 GitHub Actions 첫 실행 결과 점검 — 12차 push 후속**
   - 12차 commit 1f5055d push가 master 트리거의 첫 워크플로우 실행
   - GitHub 웹: https://github.com/genie-go/Geniego_ROI/actions
   - 가능한 실패 요인: secrets 미등록, npm install 의존성 충돌, 테스트 API 응답 형식 등
   - 실패해도 운영 영향 0%

4. **🟡 git history 평문 PW 청소 — 선택 작업**
   - 11차에서 working tree는 정리했으나 ac6b8be 등에 잔존
   - Private repo이므로 긴급도 낮음
   - 옵션: BFG Repo-Cleaner / 운영 PW 변경 / 그대로 유지

5. **초고도화/엔터프라이즈급 분석 — 별도 새 세션 필수**

### 알려진 이슈
- clean_src 폴더: nested git repo, .clineignore로 차단 중, git status에서 modified 표시 무시 가능
- deploy_*.zip 빌드 산출물 2개: gitignore됨, 보존 결정
- **🚨 PowerShell `Set-Content` UTF-8 인코딩 깨짐 함정** (11차)
- **🚨 PowerShell 출력 잔상 혼동 함정** (11차/12차)
- **🚨 PowerShell `Select-Object`가 git 출력 인코딩 변환 함정** (12차)
- **🚨 PowerShell `git diff --stat` `|` 파싱 에러 함정** (12차)
- **🚨 VS Code Find/Replace All 실행 안 되는 케이스** (12차)
- **🟢 .github/workflows/deploy.yml 트리거 main → master 변경 완료** (12차)

### 운영 critical 파일 보존 매트릭스 (9차+10차+11차+12차 통합)

#### deploy 관련 .cjs/.js (9차에서 확정)
| 파일 | 상태 | 사유 / 호출 위치 |
|------|------|-----------------|
| deploy_demo.cjs | **보존** | docs/JOURNEY_BUILDER_KPI_FIX.md:283, docs/BUG-013:152 |
| deploy_node.cjs | **보존** | docs/BUG-013_DEPLOY_ENCODING_FIX.md:151 |
| deploy_ssh2.cjs | **보존** | docs/WORK_PROCESS.md:456 |
| deploy_all.cjs ~ deploy_win.js (9개) | archived (9차) | 외부 참조 0건 |

#### deploy 관련 .ps1/.sh (10차+11차 확정)
| 파일 | 상태 | 사유 |
|------|------|------|
| deploy.ps1 | **보존** | Windows 빌드+배포 orchestrator |
| deploy.sh | **보존** | Linux rsync 배포 스크립트 |
| deploy_gitbash.sh | **보존** (11차에 평문 PW 제거) | Git Bash 환경 배포, SSH key 인증 |

#### CI/CD (12차에서 확정) ⭐ NEW
| 파일 | 상태 | 처리 |
|------|------|------|
| .github/workflows/deploy.yml | **활성화** (12차 commit 1f5055d) | branches main → master, AI 마커 제거, trailing whitespace 정리 |

### GitHub Actions CI/CD 분석 (12차 활성화 후 최신 상태)

`.github/workflows/deploy.yml` (2582 bytes) 5단계 chain:

| Phase | 이름 | 내용 |
|-------|------|------|
| 1 | Syntax Guard & I18N Patch | 한국어 i18n 검증 + locales gen + ko 패치 |
| 2 | Production Build | `cd frontend && npm install && npm run build --silent` |
| 3 | Secure Deploy (SFTP) | scp-action으로 `frontend/dist/*` → 운영 서버 |
| 4 | Post-Deploy Infrastructure | `chown -R www:www`, `nginx -s reload` |
| 5 | Health Check & Rollback | `/api/auth/login` 호출, 실패 시 롤백 + Slack 알림 |

- 트리거: `on: push: branches: [ master ]` ✅ (12차에서 master로 변경)
- 인증: secrets.REMOTE_IP, secrets.REMOTE_USER, secrets.SSH_PRIVATE_KEY
- 알림: secrets.SLACK_WEBHOOK
- AI 마커 0건 (12차에서 [cite_start], [cite: N] 모두 제거)

### 작업 흐름 (검증된 8단계 패턴)

1단계: Get-ChildItem으로 파일 목록 조사
2단계: Select-String으로 package.json 참조 검증
3단계: Select-String으로 require/import 외부 참조 검증
4단계: git mv로 일괄 이동
5단계: git status --short로 renamed 검증
6단계: git commit
7단계: git push origin master
8단계: NEXT_SESSION.md 업데이트 및 commit/push

### 9차에서 확립된 5단 검증 패턴 (운영 critical 파일 검증용)

```powershell
$pattern = "deploy_(all|demo_direct|demo_v2|kakao|nginx_root|prod|scp|ssh2\.js|win)"

# 검증 1: package.json
(Select-String -Path "package.json" -Pattern $pattern | Measure-Object).Count

# 검증 2: require()
(Select-String -Path "*.js","*.cjs","*.mjs" -Pattern "require\(['""]\./$pattern" -List | Measure-Object).Count

# 검증 3: ES module import
(Select-String -Path "*.js","*.cjs","*.mjs" -Pattern "from\s+['""]\./$pattern" -List | Measure-Object).Count

# 검증 4: 인프라 파일
$infraFiles = @(".github/workflows/deploy.yml","frontend/Dockerfile","infra/docker-compose.yml","docker-compose.yml","deploy.sh","deploy_gitbash.sh","ssh_test.sh","deploy.ps1") | Where-Object { Test-Path $_ }
Select-String -Path $infraFiles -Pattern $pattern | Format-Table -AutoSize -Wrap

# 검증 5: docs 운영 가이드
Get-ChildItem -Path "docs" -Filter "*.md" | Select-String -Pattern $pattern | Format-Table -AutoSize -Wrap
```

### 11차에서 확립된 보안 이슈 정리 4단 사전 점검 패턴

```powershell
# 점검 1: 다른 스크립트가 호출하는지
$files = Get-ChildItem -Path . -Recurse -Include *.sh,*.ps1,*.cjs,*.js,*.py,*.bat -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "node_modules|clean_src|_archived|locales_backup|backup|legacy_v338|dist|build|\.git\\" }
($files | Select-String "<target_script>" | Measure-Object).Count

# 점검 2: GitHub Actions / CI에서 사용하는지
Test-Path ".github/workflows"
Get-Content ".github/workflows/<workflow>.yml"

# 점검 3: docs 운영 가이드에서 언급하는지
Get-ChildItem -Path "docs" -Filter "*.md" -Recurse | Select-String -Pattern "<target_script>" | Format-Table -AutoSize -Wrap

# 점검 4: 스크립트 자체 분석
Get-Content "<target_script>"
```

### 12차에서 확립된 안전 패턴 (CI/CD 워크플로우 정리용) ⭐ NEW

#### 패턴 1: 브랜치 history 별개 여부 확인

```powershell
# 1. 두 브랜치의 commit 격차
git rev-list --count origin/A..origin/B
git rev-list --count origin/B..origin/A

# 2. 공통 조상 존재 여부 (가장 결정적)
git merge-base origin/A origin/B
# 출력 있음 → 공통 조상 있음
# 출력 0건 (exit 1) → 공통 조상 없음 (별개 history)

# 3. 각 브랜치의 root commit
git log --reverse --oneline origin/A | Select-Object -First 1
git log --reverse --oneline origin/B | Select-Object -First 1
```

#### 패턴 2: PowerShell .NET API 안전 텍스트 처리 (UTF-8 BOM 없음 보존)

`Get-Content | Set-Content` 함정의 대안:

```powershell
$path = "<target_file>"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$content = [System.IO.File]::ReadAllText($path, $utf8NoBom)
$cleaned = $content -replace '<pattern>', '<replacement>'
[System.IO.File]::WriteAllText($path, $cleaned, $utf8NoBom)
```

핵심:
- `New-Object System.Text.UTF8Encoding $false` → BOM 없는 UTF-8 명시
- `ReadAllText` / `WriteAllText` → 파이프라인 거치지 않음 (인코딩 변환 0건)

#### 패턴 3: 운영 critical YAML 안전 편집 다단계 검증

```powershell
# 단계 1: 변경 전 BOM 확인
[System.IO.File]::ReadAllBytes("<file>")[0..2] | ForEach-Object { $_.ToString("X2") }
# - 6E 61 6D ("nam") = BOM 없음 (정상)
# - EF BB BF = UTF-8 BOM (CI 파싱 문제 가능)

# 단계 2: 변경 후 BOM 보존 확인
[System.IO.File]::ReadAllBytes("<file>")[0..2] | ForEach-Object { $_.ToString("X2") }

# 단계 3: 매칭 패턴 0건 검증
Select-String -Path "<file>" -Pattern "<removed_pattern>" | Measure-Object | Select-Object -ExpandProperty Count

# 단계 4: trailing whitespace 0건 검증
Select-String -Path "<file>" -Pattern " +$" | Measure-Object | Select-Object -ExpandProperty Count

# 단계 5: 의도한 변경 유지 확인
Select-String -Path "<file>" -Pattern "<expected_change>" | Format-Table -AutoSize -Wrap

# 단계 6: git diff로 시각 검증
git diff --stat <file>
git diff <file>
```

#### 패턴 4: AI 도구 흔적 (cite, citation 등) 검출

```powershell
Select-String -Path "<file>" -Pattern "\[cite" -List
Select-String -Path "<file>" -Pattern "\[source:" -List
Select-String -Path "<file>" -Pattern "^\s*\[cite_start\]" | Format-Table -AutoSize -Wrap
```

라인 시작의 `[cite_start]`는 YAML 키 변형 위험. 즉시 제거 필요.

#### 패턴 5: VS Code Find/Replace 실패 시 우회

VS Code Replace All이 작동하지 않을 때:
1. 매칭 카운트 확인 (Find 단계)
2. Replace 시도
3. 매칭 카운트가 그대로면 → Replace 안 된 것
4. PowerShell .NET API로 우회 (위 패턴 2 사용)

### 12차에서 확립된 다중 변경 패턴 (운영 critical YAML 9곳 변경)

```powershell
# 1. 백업 생성 (필수)
Copy-Item "<target_file>" "<target_file>.bak"

# 2. 변경 전 메타정보 기록
Get-ChildItem "<target_file>" | Select-Object Name, Length, LastWriteTime
[System.IO.File]::ReadAllBytes("<target_file>")[0..2] | ForEach-Object { $_.ToString("X2") }

# 3. VS Code Find&Replace로 일괄 처리 (정규식 OFF → ON 순서)

# 4. VS Code가 작동 안 하면 PowerShell .NET API 우회 (12차 패턴 2)

# 5. 다단계 검증 (12차 패턴 3)

# 6. git diff를 파일로 저장하여 외부 에디터로 정밀 검증
git diff <target_file> > deploy_diff_final.txt

# 7. commit & push
git add <target_file>
git commit -m "<category>(<scope>): <action>"
git push origin master

# 8. 백업/임시파일 정리
Remove-Item "<target_file>.bak"
Remove-Item deploy_diff_final.txt
```

### PowerShell 사용 시 주의사항 (7차~12차에서 발견)

- 명령어가 너무 길면 줄바꿈 → 패턴을 변수에 저장 후 짧게 호출
- Write-Host와 Get-ChildItem 같은 명령어를 한 줄에 붙이지 말 것 (Enter로 분리)
- 결과 검증 시 `0`이 단독 출력되면 다음 프롬프트 `PS`의 `P`가 잘려 `0S D:\...`로 보일 수 있음 (정상)
- 두 줄 명령어 입력 시 첫 줄 Enter → 결과 확인 → 두 번째 줄 입력
- Test-Path로 파일 존재 여부 사전 확인 후 Select-String 실행
- 보존 필수 파일과 이름이 겹치는 경우 anchor + 확장자로 정확히 분리
- 운영 critical 의심 파일은 5단 검증에 추가로 내용 직접 확인 필수
- CRLF 경고는 Windows에서 .gitignore 수정 시 정상 동작, 무시 가능
- **🚨 `Get-Content | Where-Object | Set-Content` 패턴 절대 금지 (11차)**
  - Set-Content는 시스템 기본 인코딩 사용 → UTF-8 한글 파일이 모두 깨짐
  - 대안: VS Code 직접 편집 / Cline 위임 / .NET API 직접 사용 (12차 패턴 2)
- **새 명령어 결과와 이전 결과의 잔상을 혼동하지 말 것 (11차/12차 재확인)**
  - 의심 시 같은 명령어를 한 번 더 실행해서 확정
- **🚨 `Select-Object`가 git 출력 인코딩 변환 (12차)**
  - `git log ... | Select-Object -First N` 출력이 깨질 수 있음
  - 표시만 깨짐. 실제 git data는 무사
  - 의심 시 `git log` 결과를 직접 확인 (Select-Object 없이)
- **🚨 `git diff --stat` PowerShell 파싱 에러 (12차)**
  - 출력의 `|` + `+++` → PowerShell 메타문자 충돌
  - 결과: 동일 라인 3번 반복 + ParserError 메시지
  - 작업에 영향 없음. 핵심 정보는 정확히 추출 가능
  - 우회: `git diff <file> > diff.txt` 후 파일로 확인
- **🚨 VS Code Find/Replace All 작동 안 함 (12차)**
  - 매칭 카운트는 정확한데 Replace 자체가 실행 안 됨
  - 우회: PowerShell .NET API 직접 처리 (12차 패턴 2)
- **🚨 VS Code Quick Open이 .gitignore 파일 못 찾음 (12차)**
  - .gitignore 패턴에 등록된 파일은 인덱싱에서 제외됨 (정상 동작)
  - 우회: Ctrl+O (Open File 대화상자) 또는 Explorer 직접 클릭

### .clineignore 핵심 차단 패턴
- frontend/src/i18n/locales/**/*.js (15개 언어 거대 파일)
- locales_backup/, clean_src/, backup/, $BACKUP_DIR/
- legacy_v338_pkg/
- fix_*, nuke_*, smart_trans_*, supreme_deploy.js
- dict_*.json
- node_modules/, dist/, build/
- .env, *.pem, *.key
- logs/, *.log

### 비용 추적
- 5월 2일 세션: 검증 1회만 사용 ($0.0585)
- 5차~9차: PowerShell만으로 처리 → Cline 호출 0회
- 10차: PowerShell만으로 3개 git untrack + 3개 보존 결정 → Cline 호출 0회
- 11차: PowerShell + VS Code로 1줄 제거 → Cline 호출 0회
- 12차: PowerShell + VS Code Find&Replace + .NET API로 9곳 변경 → Cline 호출 0회
- 5월 2일 누적 184개 archive + 3개 untrack + 6개 보존 + 1개 보안 정리 + 1개 CI 활성화 / Cline 호출 0회 / 비용 $0.0585 유지
- .clineignore 도입 효과: Cline 작업당 약 70% 절감

---

## 초고도화 분석 시 미리 준비할 답변

새 세션에서 초고도화 분석 시작 시, 아래 답변이 있으면 정확한 로드맵 가능.

비즈니스 컨텍스트:
1. 현재 사용자 규모: 동시 접속자 / DAU / MAU
2. 목표 규모: 1년 후 / 3년 후 예상치
3. 테넌트 구조: 단일 조직? 멀티테넌트 SaaS? B2B 몇 개?
4. 데이터 규모: 현재 DB 크기, 일 생성 데이터량
5. 예산 범위: 인프라 / 개발 인력 투자 가능 수준

기술 컨텍스트:
6. 현재 배포 환경: 로컬? 단일 서버? 클라우드?
7. 현재 성능 병목: 어디가 느린지
8. 기존 스택 만족도: Python/React/PostgreSQL 유지 의향?
9. CI/CD 상태: 자동? 수동?
10. 모니터링/로깅 현황

보안/규제:
11. 개인정보 처리: 국내? 다국가? GDPR 대상?
12. 결제/금융 데이터 처리 여부

우선순위:
13. 가장 시급한 개선 영역 (성능/안정성/확장성/보안/DX/모니터링/비용)

---

## 첫 요청 (다음 세션 시작 시 사용)

비스크립트 잡파일 정리:
"GeniegoROI 루트의 .txt/.json/.py 잡파일 정리를 시작하고 싶습니다.
.js/.cjs/.mjs는 1~9차로 정리 완료, .sh/.ps1은 10~11차에서 정리 완료, CI는 12차에서 정리 완료, 이제 다른 형식 차례입니다."

i18n 누락 키 작업:
"GeniegoROI ko.js의 channelKpiPage 누락 키 9개 추가 작업을 시작하고 싶습니다.
구조가 복잡하니 신중하게 진행해주세요."

GitHub Actions 첫 실행 결과 점검:
"GeniegoROI GitHub Actions의 12차 push 후 첫 워크플로우 실행 결과를 점검하고 싶습니다.
commit 1f5055d push 시점부터 master 트리거가 활성화되었습니다."

git history 평문 PW 청소 (선택):
"GeniegoROI git history의 평문 PW를 청소하고 싶습니다.
11차에서 working tree는 정리했으나 ac6b8be 등에 잔존합니다.
BFG Repo-Cleaner / 운영 PW 변경 / 그대로 유지 중 선택하고 싶습니다."

초고도화 분석 시작:
"GeniegoROI 초고도화 분석을 시작합니다. 사전 답변 13개 질문에 답변하면서 진행하겠습니다."
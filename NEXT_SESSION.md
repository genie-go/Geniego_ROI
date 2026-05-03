# GeniegoROI 다음 세션 인수인계 문서

> Last Updated: 2026-05-03 (13차 완료)
> Last Commit: 1b5b6ca (origin/master 동기화 완료)

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
- 실제 코드 변경만 Cline에 위임 (또는 VS Code 직접 편집 / .NET API 직접 호출)
- 한 줄씩 명령어 실행 (한꺼번에 붙여넣기 금지)
- 매 단계 검증

### 5월 2일 완료된 작업 (12차까지)

1차 (지난 세션)
- .clineignore 셋업 (commit b32ba89)
- 8개 fix 스크립트 archive (commit 3d2dfa3)

2차~8차 (5월 2일)
- 2차: 15개 patch_*.js archive (commit f71eb3a)
- 3차: 7개 patch_*.cjs archive (commit c89a27c)
- 4차: 17개 inject_*.cjs archive (commit 9366c04)
- 5차: 42개 fix_*.cjs archive (commit f6aca11)
- 6차: 33개 기타 일회성 스크립트 archive (commit 946d50a)
- 7차: 47개 misc 일회성 스크립트 archive (commit 8ea9bbb)
- 8차: 14개 misc 일회성 스크립트 archive (commit 4eec099)
- deploy_* 12개는 운영 critical로 판단되어 8차에서 의도적 제외 (옵션 A)
- NEXT_SESSION.md 업데이트 commit (605e209)

9차 (5월 2일)
- 9개 deploy_* 변형 스크립트 archive (commit ca00661)
- 보존 확정 3개 (.cjs): deploy_demo.cjs, deploy_node.cjs, deploy_ssh2.cjs
- 5단 검증 모두 통과
- NEXT_SESSION.md 업데이트 commit (5361d9e)

10차 (5월 2일)
- 운영 critical 스크립트 3개 보존 확정 (Track B 그룹 1):
  - deploy.ps1 (313 bytes), deploy.sh (652 bytes), deploy_gitbash.sh (1694 bytes)
- deploy_*.txt 로그 3개 git untrack + .gitignore 추가 (commit 443f208)
- deploy*.zip 2개 보존 결정 (이미 .gitignore 됨)
- 보안 이슈 발견: deploy_gitbash.sh에 평문 SSH 비밀번호 (Private repo이므로 즉시 사고 대응 불필요)

11차 (5월 2일)
- 보안 이슈 정리: deploy_gitbash.sh 평문 비밀번호 제거 (commit 67da494)
  - PASSWORD 변수는 dead code (선언만 되고 미사용)
  - 운영 영향 0%, VS Code 직접 편집으로 처리
- PowerShell 인코딩 함정 발견: `Get-Content | Where-Object | Set-Content` 패턴 절대 금지

12차 (5월 2일)
- GitHub Actions CI/CD 활성화: deploy.yml 트리거 master로 변경 + AI 흔적 제거 (commit 1f5055d)
- master는 origin/main과 완전히 별개 history 발견 (공통 조상 없음)
- Gemini AI 흔적(`[cite_start]`, `[cite: N]`) 9곳 제거 + trailing whitespace 6곳 제거
- 16개 검증 항목 모두 통과
- PowerShell 추가 함정 5건 발견 (출력 잔상, Select-Object 인코딩, git diff |, VS Code Find/Replace, .gitignore 검색)
- PowerShell .NET API 안전 처리 패턴 확립

### 5월 3일 완료된 작업 ⭐ NEW

13차 (5월 3일) ⭐ NEW
- **GitHub Actions 첫 실행 결과 점검 + YAML 파싱 오류 수정 + 워크플로우 정상 시작**
- **🚨 결정적 발견 1: 5월 2일 모든 commit의 워크플로우 실행이 Failure였음**
  - GitHub Actions 페이지에서 9차/10차/11차/12차 commit이 전부 빨간 ❌
  - 12차 분석은 "master 트리거 활성화"로 결론냈으나, 실제로는 master 트리거가 그 전부터 동작 중이었음
  - 12차 변경(`branches: [ main ]` → `branches: [ master ]`)은 활성화가 아니라 명시화였음
- **🚨 결정적 발견 2: 진짜 실패 원인은 YAML 문법 오류**
  - GitHub UI는 "Invalid workflow file: .github/workflows/deploy.yml#L18 - You have an error in your yaml syntax on line 18"라고 표시
  - 그러나 L18은 단순 빈 줄이었음 (PowerShell `[System.IO.File]::ReadAllLines[17]` 검증 결과 출력 0개)
  - 진짜 원인은 **L19의 `[PHASE 1]` 대괄호** — YAML 파서가 flow sequence(배열)로 해석
  - PyYAML로 정밀 진단 결과: `yaml.parser.ParserError: while parsing a block mapping, line 19, column 9, expected <block end>, but found '<scalar>', line 19, column 25`
  - L18 표시는 YAML 파서의 인접 라인 표시 패턴 (실제 오류 아님)
- **🚨 결정적 발견 3: 5월 1~2일 모든 CI run이 YAML 파싱 단계에서 silently 실패**
  - 워크플로우가 시작조차 못 함 (Total duration `–`, "This workflow graph cannot be shown")
  - 모든 5월 작업의 CI는 한 번도 실제 실행되지 않았음
- **수정 작업 (운영 critical, PowerShell .NET API 안전 처리)**:
  - L19, L27, L33, L42, L52 — PHASE 1~5 step 이름을 큰따옴표로 감쌈
  - 변경 전: `- name: [PHASE 1] Syntax Guard & I18N Patch`
  - 변경 후: `- name: "[PHASE 1] Syntax Guard & I18N Patch"`
  - 큰따옴표 사용 이유: `&`(앰퍼샌드)가 YAML anchor 시작 문자라 큰따옴표 안에서 일반 문자로 처리됨
- **다단계 검증 (12차 패턴 3 적용)**:
  - YAML 파싱 통과 확인 (`python -c "import yaml; yaml.safe_load(...); print('YAML PARSE OK')"`)
  - BOM 보존 확인 (변경 전후 모두 `6E 61 6D 65 3A 20`)
  - trailing whitespace 0건 확인
  - git diff 5쌍의 +/- 외 다른 변경 없음 확인
- **commit & push**:
  - commit 1b5b6ca: `fix(ci): quote PHASE labels in deploy.yml to fix YAML flow sequence error`
  - 1 file changed, 5 insertions(+), 5 deletions(-)
  - origin/master 동기화 완료
- **GitHub Actions 재실행 결과 (#127, commit 1b5b6ca)**:
  - **YAML 파싱 통과 확정** ✅ (워크플로우 그래프 표시됨, deploy job이 16s 실행)
  - **Total duration 21s** (이전과 달리 실제 실행됨)
  - 그러나 결과는 여전히 Failure (다른 원인)
- **🟡 새로 노출된 실패 원인 (별개 작업 영역, 14차 후보)**:
  - Annotation 1: `Specify secrets.SLACK_WEBHOOK_URL` — secret 이름 불일치 또는 미등록
  - Annotation 2: `Process completed with exit code 1` — 어느 step에서 exit 1
  - Annotation 3 (warning): Node.js 20 deprecated — actions/checkout@v3, actions/setup-node@v3, 8398a7/action-slack@v3 모두 v4 업그레이드 권장
  - Annotation 4 (warning): `/usr/bin/git failed with exit code 128` — clean_src nested git repo 가능성 높음
- **운영 영향**: 0% (수동 deploy.ps1/deploy.sh chain 별도 운영)
- **Cline 호출 0회**, 비용 $0 추가
- **PowerShell 함정 추가 학습**: `$utf8NoBom = New-Object System.Text.UTF8Encoding $false` + `[System.IO.File]::ReadAllText/WriteAllText`로 multi-replace 안전 처리 가능

### 누적 통계
- archive된 파일 수: **192개** (8 + 15 + 7 + 17 + 42 + 33 + 47 + 14 + 9)
- archive 위치: tools/migrations/_archived/
- 10차 git untrack: 3개 (deploy_*.txt)
- 10차 보존 확정: 3개 (.ps1, .sh, _gitbash.sh)
- 11차 보안 정리: 1개 (deploy_gitbash.sh PASSWORD 라인 제거)
- 12차 CI 활성화: 1개 (.github/workflows/deploy.yml — 9곳 변경)
- 13차 YAML 수정: 1개 (.github/workflows/deploy.yml — 5곳 따옴표 추가) ⭐ NEW
- Cline 호출: **0회** (모든 작업 PowerShell + VS Code + .NET API로 처리)
- 5월 단일 세션 (5월 2~3일) 처리량: **184개 archive + 3개 git untrack + 6개 보존 결정 + 1개 보안 정리 + 1개 CI 활성화 + 1개 YAML 수정**
- 비용: $0.0585 유지

### 다음 작업 후보 (우선순위 순)

1. **🔴 GitHub Actions CI 잔존 실패 진단 — 14차 최우선**
   - **현 상태**: 워크플로우는 정상 시작 (YAML 파싱 통과), Phase 1~5 중 어딘가에서 21초 후 exit 1
   - **진단 시작점**: GitHub의 #127 run에서 deploy job 클릭 → 어느 step에서 git 128 또는 exit 1 발생했는지 확인
   - **가설 1: clean_src nested git repo 문제** (1순위, exit code 128 시그널과 일치)
     - actions/checkout@v3가 master를 clone 후 git 명령이 nested git repo 만나면 fail
     - 해결: .gitmodules 추가 / clean_src를 .gitignore에 추가 / actions/checkout 옵션 조정
   - **가설 2: Phase 1 i18n 검증 실패** (2순위)
     - `node -e "require('fs').readFileSync('./frontend/src/i18n/locales/en.js'...)"` 실행
     - en.js 파일이 없거나 깨진 경우 exit 1
   - **가설 3: secrets 미등록** (3순위)
     - SLACK_WEBHOOK_URL, REMOTE_IP, REMOTE_USER, SSH_PRIVATE_KEY, TEST_EMAIL, TEST_PASS 등
     - GitHub Repo Settings → Secrets and variables → Actions에서 등록 필요
   - **운영 영향 0%** (수동 deploy 별도)

2. **비스크립트 잡파일 정리 — 별도 트랙**
   - .txt: find_out.txt, keys_out.txt, ko_check.txt, korean_lines.txt, missing_keys.txt 등
   - .json: ko_orderHub.json, korean_map.json, kpi_keys.json, missing_attrData.json 등
   - .py: fix_audit.py, fix_auth.py, restore_authpage.py
   - .sh: ssh_test.sh

3. **i18n 누락 키 9개 추가 — 별도 신중 작업**
   - ko.js에 channelKpiPage 6곳, 9개 키 누락
   - 누락 키: channelKpiPage, tabCommunity, tabContent, tabGoals, tabMonitor, tabRoles, tabSetup, tabSns, tabTargets
   - Cline 호출 필요

4. **🟡 GitHub Actions Node.js 20 deprecation — 선택 작업**
   - 13차 발견: actions/checkout@v3, actions/setup-node@v3, 8398a7/action-slack@v3 모두 v4 업그레이드 권장
   - 작동은 하지만 향후 작동 중지 가능
   - 14차에서 같이 처리하면 효율적

5. **🟡 git history 평문 PW 청소 — 선택 작업**
   - 11차에서 working tree는 정리했으나 ac6b8be 등에 잔존
   - Private repo이므로 긴급도 낮음
   - 옵션: BFG Repo-Cleaner / 운영 PW 변경 / 그대로 유지

6. **초고도화/엔터프라이즈급 분석 — 별도 새 세션 필수**

### 알려진 이슈
- clean_src 폴더: nested git repo, .clineignore로 차단 중, git status에서 modified 표시 무시 가능
  - **🔴 13차 발견: GitHub Actions에서는 무시 불가 가능성** (git exit 128 추정 원인)
- deploy_*.zip 빌드 산출물 2개: gitignore됨, 보존 결정
- **🚨 PowerShell `Set-Content` UTF-8 인코딩 깨짐 함정** (11차)
- **🚨 PowerShell 출력 잔상 혼동 함정** (11차/12차/13차 재확인)
- **🚨 PowerShell `Select-Object`가 git 출력 인코딩 변환 함정** (12차)
- **🚨 PowerShell `git diff --stat` `|` 파싱 에러 함정** (12차)
- **🚨 VS Code Find/Replace All 실행 안 되는 케이스** (12차)
- **🟢 .github/workflows/deploy.yml 트리거 master 명시화 완료** (12차)
- **🟢 .github/workflows/deploy.yml YAML 파싱 통과 확정** (13차) ⭐ NEW
- **🔴 .github/workflows/deploy.yml 워크플로우 실행 단계 잔존 실패** (13차) ⭐ NEW

### 운영 critical 파일 보존 매트릭스 (9차+10차+11차+12차+13차 통합)

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

#### CI/CD (12차+13차에서 확정)
| 파일 | 상태 | 처리 |
|------|------|------|
| .github/workflows/deploy.yml | **활성화 + YAML 통과** (13차 commit 1b5b6ca) | 12차: branches main → master, AI 마커 제거. 13차: PHASE 1~5 따옴표 추가 |

### GitHub Actions CI/CD 분석 (13차 YAML 수정 후 최신 상태)

`.github/workflows/deploy.yml` 5단계 chain:

| Phase | 이름 | 내용 |
|-------|------|------|
| 1 | "[PHASE 1] Syntax Guard & I18N Patch" | 한국어 i18n 검증 + locales gen + ko 패치 |
| 2 | "[PHASE 2] Production Build" | `cd frontend && npm install && npm run build --silent` |
| 3 | "[PHASE 3] Secure Deploy (SFTP)" | scp-action으로 `frontend/dist/*` → 운영 서버 |
| 4 | "[PHASE 4] Post-Deploy Infrastructure Refresh" | `chown -R www:www`, `nginx -s reload` |
| 5 | "[PHASE 5] Health Check & Rollback" | `/api/auth/login` 호출, 실패 시 롤백 + Slack 알림 |

- 트리거: `on: push: branches: [ master ]` ✅ (12차)
- YAML 파싱: ✅ 통과 (13차)
- 워크플로우 실제 실행: ✅ 시작됨 (13차, 21초 간 실행 후 실패)
- 인증: secrets.REMOTE_IP, secrets.REMOTE_USER, secrets.SSH_PRIVATE_KEY (사용 여부 불명)
- 알림: secrets.SLACK_WEBHOOK / SLACK_WEBHOOK_URL (이름 충돌 추정)
- 테스트: secrets.TEST_EMAIL, secrets.TEST_PASS (Phase 5)
- AI 마커 0건 (12차)
- PHASE 라벨 따옴표 처리 (13차)

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

### 12차에서 확립된 안전 패턴 (CI/CD 워크플로우 정리용)

#### 패턴 1: 브랜치 history 별개 여부 확인

```powershell
git rev-list --count origin/A..origin/B
git rev-list --count origin/B..origin/A
git merge-base origin/A origin/B
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

**13차에서 multi-replace로 확장 검증됨** — 한 번에 5곳 동시 변경 성공

#### 패턴 3: 운영 critical YAML 안전 편집 다단계 검증

```powershell
# 단계 1: 변경 전 BOM 확인
[System.IO.File]::ReadAllBytes("<file>")[0..2] | ForEach-Object { $_.ToString("X2") }

# 단계 2: 변경 후 BOM 보존 확인
[System.IO.File]::ReadAllBytes("<file>")[0..2] | ForEach-Object { $_.ToString("X2") }

# 단계 3: 매칭 패턴 0건 검증
Select-String -Path "<file>" -Pattern "<removed_pattern>" | Measure-Object | Select-Object -ExpandProperty Count

# 단계 4: trailing whitespace 0건 검증
Select-String -Path "<file>" -Pattern " +$" | Measure-Object | Select-Object -ExpandProperty Count

# 단계 5: 의도한 변경 유지 확인
Select-String -Path "<file>" -Pattern "<expected_change>" | Format-Table -AutoSize -Wrap

# 단계 6: git diff로 시각 검증 (12차 함정 3 회피용 파일 저장)
git diff <file> > deploy_diff.txt
Get-Content deploy_diff.txt
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

### 13차에서 확립된 패턴 (YAML syntax error 진단/수정용) ⭐ NEW

#### 패턴 6: GitHub Actions YAML syntax error 정밀 진단

```powershell
# 단계 1: GitHub UI의 표시 라인 정밀 확인 (실제로는 빈 줄일 수 있음)
[System.IO.File]::ReadAllLines("<yml_path>")[<line_idx_0_based>] | ForEach-Object { [System.Text.Encoding]::UTF8.GetBytes($_) | ForEach-Object { $_.ToString("X2") } }
# 출력 0개 → 진짜 빈 줄 (GitHub의 line 표시는 인접 라인 표시 패턴)
# 20 → 스페이스만
# 09 → 탭만
# C2 A0 → non-breaking space
# E2 80 8B → zero-width space
# EF BB BF → BOM

# 단계 2: PyYAML로 진짜 오류 위치 확인
python -c "import yaml; yaml.safe_load(open('<yml_path>', encoding='utf-8'))"
# 실패 시 정확한 라인/컬럼 + 오류 종류 반환
# yaml.parser.ParserError: expected <block end>, but found '<scalar>'
#   line N, column M

# 단계 3: 수정 후 재검증
python -c "import yaml; yaml.safe_load(open('<yml_path>', encoding='utf-8')); print('YAML PARSE OK')"

# 단계 4: 영향 범위 일괄 검색
Select-String -Path "<yml_path>" -Pattern "<problematic_pattern>" | Format-Table LineNumber, Line -AutoSize
```

#### 패턴 7: YAML 특수문자 처리 (대괄호, 앰퍼샌드 등)

YAML에서 `name:` 값에 다음 문자가 있으면 따옴표 필수:
- `[ ]` (flow sequence로 오해석)
- `{ }` (flow mapping으로 오해석)
- `&` (anchor 시작 문자)
- `*` (alias 시작 문자)
- `!` (tag 시작 문자)
- `|` `>` (block scalar)
- `:` (mapping separator)
- `#` (comment)
- 시작 문자가 `-` `?` 등

권장: **큰따옴표 (`"`)** 사용
- `&`, `\` 같은 문자도 일반 문자로 처리
- 작은따옴표보다 명시적

```yaml
# 잘못된 예
- name: [PHASE 1] Syntax Guard & I18N Patch
- name: Build & Deploy

# 올바른 예
- name: "[PHASE 1] Syntax Guard & I18N Patch"
- name: "Build & Deploy"
```

### PowerShell 사용 시 주의사항 (7차~13차에서 발견)

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
- **새 명령어 결과와 이전 결과의 잔상을 혼동하지 말 것 (11차/12차/13차 재확인)**
  - 의심 시 같은 명령어를 한 번 더 실행해서 확정
  - 13차에서 commit 출력에 `error0ebfd64[` 같은 잔상 발견 → git data는 정상, 표시만 영향
- **🚨 `Select-Object`가 git 출력 인코딩 변환 (12차)**
- **🚨 `git diff --stat` PowerShell 파싱 에러 (12차)**
  - 우회: `git diff <file> > diff.txt` 후 파일로 확인
- **🚨 VS Code Find/Replace All 작동 안 함 (12차)**
- **🚨 VS Code Quick Open이 .gitignore 파일 못 찾음 (12차)**
- **🟢 PowerShell .NET API로 multi-replace 안전 처리 가능 (13차)**
  - `-replace` 연산자 chain 가능: `... -replace 'A','B' -replace 'C','D' ...`
  - 한 번에 5곳 동시 변경 검증됨 (deploy.yml PHASE 1~5)

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
- 13차: PowerShell + .NET API로 5곳 동시 변경 + Python YAML 검증 → Cline 호출 0회 ⭐ NEW
- 5월 2~3일 누적 184개 archive + 3개 untrack + 6개 보존 + 1개 보안 정리 + 1개 CI 활성화 + 1개 YAML 수정 / Cline 호출 0회 / 비용 $0.0585 유지
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

🔴 **GitHub Actions CI 잔존 실패 진단 (14차 최우선 추천):**
"GeniegoROI GitHub Actions의 13차 push 후 워크플로우 잔존 실패를 진단하고 싶습니다.
13차에서 YAML 파싱 통과는 확정되었으나(commit 1b5b6ca), Phase 1~5 중 어딘가에서 21초 후 exit 1로 실패합니다.
Annotation에 git exit 128과 Process completed with exit code 1이 보입니다.
1순위 가설: clean_src nested git repo 문제. 2순위: Phase 1 i18n 검증. 3순위: secrets 미등록."

비스크립트 잡파일 정리:
"GeniegoROI 루트의 .txt/.json/.py 잡파일 정리를 시작하고 싶습니다.
.js/.cjs/.mjs는 1~9차로 정리 완료, .sh/.ps1은 10~11차에서 정리 완료, CI는 12~13차에서 정리 완료, 이제 다른 형식 차례입니다."

i18n 누락 키 작업:
"GeniegoROI ko.js의 channelKpiPage 누락 키 9개 추가 작업을 시작하고 싶습니다.
구조가 복잡하니 신중하게 진행해주세요."

GitHub Actions Node.js 20 deprecation 처리:
"GeniegoROI GitHub Actions의 Node.js 20 deprecation 처리를 시작하고 싶습니다.
13차에서 발견: actions/checkout@v3, actions/setup-node@v3, 8398a7/action-slack@v3 모두 v4 업그레이드 권장."

git history 평문 PW 청소 (선택):
"GeniegoROI git history의 평문 PW를 청소하고 싶습니다.
11차에서 working tree는 정리했으나 ac6b8be 등에 잔존합니다.
BFG Repo-Cleaner / 운영 PW 변경 / 그대로 유지 중 선택하고 싶습니다."

초고도화 분석 시작:
"GeniegoROI 초고도화 분석을 시작합니다. 사전 답변 13개 질문에 답변하면서 진행하겠습니다."
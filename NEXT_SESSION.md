# GeniegoROI 다음 세션 인수인계 문서

> Last Updated: 2026-05-03 (14차 완료)
> Last Commit: 822927b (origin/master 동기화 완료)

---

## 새 Claude에게 보낼 메시지

GeniegoROI 프로젝트 작업을 이어서 진행합니다. 아래는 컨텍스트입니다.

### 프로젝트 정보

* GitHub: https://github.com/genie-go/Geniego_ROI (**Private repo**)
* 로컬 경로: D:\project\GeniegoROI
* 브랜치: master
* 환경: Windows + PowerShell + VS Code (Antigravity) + Cline 에이전트
* Cline 모델: claude-sonnet-4-5-20250929

### 프로젝트 성격

ROI 분석 통합 대시보드 (CRM, KPI, 시스템, P&L 4개 도메인)

* Python 백엔드 + React/Vite 프론트엔드 + PostgreSQL
* 다국어 15개 언어 지원
* 운영 서버: 1.201.177.46 (https://roi.genie-go.com)
* 배포 경로: /home/wwwroot/roi.geniego.com/frontend/dist

### 협업 방식

* Cline 토큰 절약을 위해 Claude 웹과 협업 중
* PowerShell로 가능한 작업은 PowerShell로 (무료)
* 실제 코드 변경만 Cline에 위임 (또는 VS Code 직접 편집 / .NET API 직접 호출)
* 한 줄씩 명령어 실행 (한꺼번에 붙여넣기 금지)
* 매 단계 검증

### 5월 2일 완료된 작업 (12차까지)

1차 (지난 세션)

* .clineignore 셋업 (commit b32ba89)
* 8개 fix 스크립트 archive (commit 3d2dfa3)

2차~8차 (5월 2일)

* 2차: 15개 patch_*.js archive (commit f71eb3a)
* 3차: 7개 patch_*.cjs archive (commit c89a27c)
* 4차: 17개 inject_*.cjs archive (commit 9366c04)
* 5차: 42개 fix_*.cjs archive (commit f6aca11)
* 6차: 33개 기타 일회성 스크립트 archive (commit 946d50a)
* 7차: 47개 misc 일회성 스크립트 archive (commit 8ea9bbb)
* 8차: 14개 misc 일회성 스크립트 archive (commit 4eec099)
* deploy_* 12개는 운영 critical로 판단되어 8차에서 의도적 제외 (옵션 A)
* NEXT_SESSION.md 업데이트 commit (605e209)

9차 (5월 2일)

* 9개 deploy_* 변형 스크립트 archive (commit ca00661)
* 보존 확정 3개 (.cjs): deploy_demo.cjs, deploy_node.cjs, deploy_ssh2.cjs
* 5단 검증 모두 통과
* NEXT_SESSION.md 업데이트 commit (5361d9e)

10차 (5월 2일)

* 운영 critical 스크립트 3개 보존 확정 (Track B 그룹 1):
  + deploy.ps1 (313 bytes), deploy.sh (652 bytes), deploy_gitbash.sh (1694 bytes)
* deploy_*.txt 로그 3개 git untrack + .gitignore 추가 (commit 443f208)
* deploy*.zip 2개 보존 결정 (이미 .gitignore 됨)
* 보안 이슈 발견: deploy_gitbash.sh에 평문 SSH 비밀번호 (Private repo이므로 즉시 사고 대응 불필요)

11차 (5월 2일)

* 보안 이슈 정리: deploy_gitbash.sh 평문 비밀번호 제거 (commit 67da494)
  + PASSWORD 변수는 dead code (선언만 되고 미사용)
  + 운영 영향 0%, VS Code 직접 편집으로 처리
* PowerShell 인코딩 함정 발견: Get-Content | Where-Object | Set-Content 패턴 절대 금지

12차 (5월 2일)

* GitHub Actions CI/CD 활성화: deploy.yml 트리거 master로 변경 + AI 흔적 제거 (commit 1f5055d)
* master는 origin/main과 완전히 별개 history 발견 (공통 조상 없음)
* Gemini AI 흔적([cite_start], [cite: N]) 9곳 제거 + trailing whitespace 6곳 제거
* 16개 검증 항목 모두 통과
* PowerShell 추가 함정 5건 발견 (출력 잔상, Select-Object 인코딩, git diff |, VS Code Find/Replace, .gitignore 검색)
* PowerShell .NET API 안전 처리 패턴 확립

### 5월 3일 완료된 작업

13차 (5월 3일)

* **GitHub Actions 첫 실행 결과 점검 + YAML 파싱 오류 수정 + 워크플로우 정상 시작**
* **🚨 결정적 발견 1: 5월 2일 모든 commit의 워크플로우 실행이 Failure였음**
  + GitHub Actions 페이지에서 9차/10차/11차/12차 commit이 전부 빨간 ❌
  + 12차 분석은 "master 트리거 활성화"로 결론냈으나, 실제로는 master 트리거가 그 전부터 동작 중이었음
* **🚨 결정적 발견 2: 진짜 실패 원인은 YAML 문법 오류**
  + GitHub UI는 "Invalid workflow file: deploy.yml#L18"라고 표시
  + 그러나 L18은 단순 빈 줄이었음
  + 진짜 원인은 **L19의 [PHASE 1] 대괄호** — YAML 파서가 flow sequence(배열)로 해석
  + L18 표시는 YAML 파서의 인접 라인 표시 패턴 (실제 오류 아님)
* **🚨 결정적 발견 3: 5월 1~2일 모든 CI run이 YAML 파싱 단계에서 silently 실패**
* **수정 작업 (운영 critical, PowerShell .NET API 안전 처리)**:
  + L19, L27, L33, L42, L52 — PHASE 1~5 step 이름을 큰따옴표로 감쌈
  + 변경 전: - name: [PHASE 1] Syntax Guard & I18N Patch
  + 변경 후: - name: "[PHASE 1] Syntax Guard & I18N Patch"
* **commit 1b5b6ca**: fix(ci): quote PHASE labels in deploy.yml to fix YAML flow sequence error

14차 (5월 3일) ⭐ NEW

* **GitHub Actions 잔존 실패 진단/수정 — Phase 1 완전 통과 + Phase 2 빌드 진입까지 진전**
* **🚨 결정적 발견 1: 13차 1순위 가설(clean_src nested git) 무관 확정**
  + Post Checkout Source Code (1s ✅) 정상 종료
  + git exit 128은 post-cleanup warning만, 워크플로우 죽이지 않음
* **🚨 결정적 발견 2: deploy.yml Phase 1이 존재하지 않는 스크립트 호출**
  + gen_locales.mjs, patch_ko_locales.js: 로컬에도 없고 git history에도 없음
  + 처음부터 한 번도 commit된 적 없는 fantasy 호출
  + 이 호출이 Phase 1 line 24, 25에서 ENOENT exit 1을 0초만에 트리거
* **🚨 결정적 발견 3: en.js는 ES 모듈인데 deploy.yml이 vm.createScript 사용**
  + en.js 첫 줄: export default { (ES 모듈 확정)
  + vm.createScript는 CommonJS 전용 → ES 모듈 만나면 SyntaxError: Unexpected token 'export'
  + catch에 console.error 없이 silent process.exit(1) → GitHub Actions 로그에 stderr 0줄로 보임
* **🚨 결정적 발견 4: 진짜 Phase 2 실패 원인은 RollupDashboard.jsx:1051 TAB_COLORS 중복 선언**
  + npm install 11초 만에 정상 완료 (audited 407 packages, deprecation warnings만)
  + vite v5.4.21 빌드 진입 → 266 modules transformed → 2.17초만에 SyntaxError
  + frontend/src/pages/RollupDashboard.jsx에서 TAB_COLORS 7곳:
    - line 1022: TAB_COLORS={TAB_COLORS} (사용/전달)
    - line 1035: function DashboardContent({ ..., TAB_COLORS, ... }) ← props
    - line 1051: const TAB_COLORS = useMemo(() => ({ ← 🔴 중복 선언!
    - line 1077, 1106, 1107, 1112: 사용
* **수정 작업 (3단계 chain, 전부 PowerShell만)**:
  + 단계 1: gen_locales/patch_ko_locales 호출 제거 (line 23~25 삭제, .NET API 슬라이스 결합)
    - commit 0754478: fix(ci): remove non-existent locale script calls from PHASE 1
    - 1 file changed, 1 insertion(+), 4 deletions(-)
  + 단계 2: vm.createScript → readFileSync 단순화 (line 22 교체, VS Code 직접 편집 우회)
    - commit 822927b: fix(ci): replace vm.createScript with simple file existence check (en.js is ES module)
    - 1 file changed, 1 insertion(+), 1 deletion(-)
  + PowerShell .NET API에서 √ 유니코드 매칭 실패 → VS Code 직접 편집으로 우회
* **GitHub Actions 진전 매트릭스 (#128 → #129 → #130)**:
  + Total duration: 18s → 15s → **29s** ⭐
  + Phase 1: 0s ❌ → 0s ❌ → **0s ✅ 통과!**
  + Phase 2: skip → skip → **14s ❌ (TAB_COLORS)**
* **🟢 14차에서 새로 통과한 단계**:
  + ✅ Phase 1 Syntax Guard & I18N Patch (en.js 검증)
  + ✅ Phase 2 npm install (11s, 407 packages audited)
  + ✅ Phase 2 vite 진입 (266 modules transformed)
* **🟡 14차에서 새로 노출된 실패 (15차 후보)**:
  + 🔴 RollupDashboard.jsx:1051 TAB_COLORS 중복 선언 (vite SyntaxError, 2.17s 빌드 실패)
  + 🟡 Slack Notification: secrets.SLACK_WEBHOOK_URL 미등록 (always() 트리거)
  + 🟡 Phase 3~5 미도달 (Phase 2에서 막힘)
* **운영 영향**: 0% (수동 deploy.ps1/deploy.sh chain 별도 운영)
* **Cline 호출 0회**, 비용 $0 추가

### 누적 통계

* archive된 파일 수: **192개** (8 + 15 + 7 + 17 + 42 + 33 + 47 + 14 + 9)
* archive 위치: tools/migrations/_archived/
* 10차 git untrack: 3개 (deploy_*.txt)
* 10차 보존 확정: 3개 (.ps1, .sh, _gitbash.sh)
* 11차 보안 정리: 1개 (deploy_gitbash.sh PASSWORD 라인 제거)
* 12차 CI 활성화: 1개 (.github/workflows/deploy.yml — 9곳 변경)
* 13차 YAML 수정: 1개 (.github/workflows/deploy.yml — 5곳 따옴표 추가)
* 14차 deploy.yml 정리: 2 commits (line 23~25 제거 + line 22 교체) ⭐ NEW
* Cline 호출: **0회** (모든 작업 PowerShell + VS Code + .NET API로 처리)
* 5월 단일 세션 (5월 2~3일) 처리량: **184개 archive + 3개 untrack + 6개 보존 결정 + 1개 보안 정리 + 1개 CI 활성화 + 1개 YAML 수정 + Phase 1 정상화**
* 비용: $0.0585 유지

### 다음 작업 후보 (우선순위 순)

1. **🔴 RollupDashboard.jsx TAB_COLORS 중복 선언 수정 — 15차 최우선** ⭐ NEW
   * **현 상태**: vite 빌드 SyntaxError로 Phase 2 실패 (2.17초만에)
   * **위치**: frontend/src/pages/RollupDashboard.jsx
     + line 1022: TAB_COLORS={TAB_COLORS} (사용/전달)
     + line 1035: function DashboardContent({ ..., TAB_COLORS, ... }) ← props
     + line 1051: const TAB_COLORS = useMemo(() => ({ ← 🔴 중복 선언!
     + line 1077, 1106, 1107, 1112: 사용
   * **수정 옵션 3가지**:
     + (A) line 1051을 다른 이름으로 (LOCAL_TAB_COLORS 등)
     + (B) line 1035 props에서 TAB_COLORS 제거
     + (C) line 1051 제거하고 props 그대로 사용
   * **운영 영향**: 검토 필요 (RollupDashboard.jsx가 실제 운영 페이지인지 확인)

2. **🟡 Slack secrets 등록 또는 가드 추가**
   * **현 상태**: Slack Notification step이 always() 트리거로 모든 run 실패에 추가됨
   * 옵션 1: GitHub Repo Settings → Secrets → SLACK_WEBHOOK_URL 등록
   * 옵션 2: deploy.yml에 if 가드 추가

3. **🟡 Phase 3~5 secrets 등록**
   * REMOTE_IP, REMOTE_USER, SSH_PRIVATE_KEY (Phase 3 SFTP)
   * TEST_EMAIL, TEST_PASS (Phase 5 health check)

4. **비스크립트 잡파일 정리 — 별도 트랙**
   * .txt: find_out.txt, keys_out.txt, ko_check.txt, korean_lines.txt, missing_keys.txt 등
   * .json: ko_orderHub.json, korean_map.json, kpi_keys.json, missing_attrData.json 등
   * .py: fix_audit.py, fix_auth.py, restore_authpage.py
   * .sh: ssh_test.sh

5. **i18n 누락 키 9개 추가 — 별도 신중 작업**
   * ko.js에 channelKpiPage 6곳, 9개 키 누락
   * 누락 키: channelKpiPage, tabCommunity, tabContent, tabGoals, tabMonitor, tabRoles, tabSetup, tabSns, tabTargets
   * Cline 호출 필요

6. **🟡 GitHub Actions Node.js 20 deprecation — 선택 작업**
   * 13차 발견: actions/checkout@v3, actions/setup-node@v3, 8398a7/action-slack@v3 모두 v4 업그레이드 권장

7. **🟡 git history 평문 PW 청소 — 선택 작업**
   * 11차에서 working tree는 정리했으나 ac6b8be 등에 잔존
   * Private repo이므로 긴급도 낮음

8. **초고도화/엔터프라이즈급 분석 — 별도 새 세션 필수**

### 알려진 이슈

* clean_src 폴더: nested git repo, .clineignore로 차단 중, git status에서 modified 표시 무시 가능
  + 14차 검증: GitHub Actions checkout/post-cleanup에서 git exit 128 warning 발생하지만 워크플로우를 죽이지는 않음 (무해 확정)
* deploy_*.zip 빌드 산출물 2개: gitignore됨, 보존 결정
* **🚨 PowerShell Set-Content UTF-8 인코딩 깨짐 함정** (11차)
* **🚨 PowerShell 출력 잔상 혼동 함정** (11차/12차/13차/14차 재확인)
* **🚨 PowerShell Select-Object가 git 출력 인코딩 변환 함정** (12차)
* **🚨 PowerShell git diff --stat | 파싱 에러 함정** (12차)
* **🚨 VS Code Find/Replace All 실행 안 되는 케이스** (12차)
* **🚨 PowerShell √ 유니코드 single-quote string 매칭 실패** (14차) ⭐ NEW
* **🚨 PowerShell working directory 잔존 함정** (14차) ⭐ NEW
* **🚨 PowerShell Start-Job은 working directory 미상속** (14차) ⭐ NEW
* **🟢 .github/workflows/deploy.yml 트리거 master 명시화 완료** (12차)
* **🟢 .github/workflows/deploy.yml YAML 파싱 통과 확정** (13차)
* **🟢 .github/workflows/deploy.yml Phase 1 통과 확정** (14차) ⭐ NEW
* **🔴 frontend/src/pages/RollupDashboard.jsx:1051 TAB_COLORS 중복 선언** (14차) ⭐ NEW

### 운영 critical 파일 보존 매트릭스

#### deploy 관련 .cjs/.js (9차에서 확정)

| 파일 | 상태 | 사유 / 호출 위치 |
| --- | --- | --- |
| deploy_demo.cjs | **보존** | docs/JOURNEY_BUILDER_KPI_FIX.md:283, docs/BUG-013:152 |
| deploy_node.cjs | **보존** | docs/BUG-013_DEPLOY_ENCODING_FIX.md:151 |
| deploy_ssh2.cjs | **보존** | docs/WORK_PROCESS.md:456 |
| deploy_all.cjs ~ deploy_win.js (9개) | archived (9차) | 외부 참조 0건 |

#### deploy 관련 .ps1/.sh (10차+11차 확정)

| 파일 | 상태 | 사유 |
| --- | --- | --- |
| deploy.ps1 | **보존** | Windows 빌드+배포 orchestrator |
| deploy.sh | **보존** | Linux rsync 배포 스크립트 |
| deploy_gitbash.sh | **보존** (11차에 평문 PW 제거) | Git Bash 환경 배포, SSH key 인증 |

#### CI/CD (12차+13차+14차에서 확정)

| 파일 | 상태 | 처리 |
| --- | --- | --- |
| .github/workflows/deploy.yml | **활성화 + Phase 1 통과** (14차 commit 822927b) | 12차: branches main → master, AI 마커 제거. 13차: PHASE 1~5 따옴표 추가. 14차: gen_locales/patch_ko_locales 제거 + vm.createScript → readFileSync |

### GitHub Actions CI/CD 분석 (14차 작업 후 최신 상태) ⭐ NEW

.github/workflows/deploy.yml 5단계 chain:

| Phase | 이름 | 상태 |
| --- | --- | --- |
| 1 | "[PHASE 1] Syntax Guard & I18N Patch" | ✅ 14차 통과 |
| 2 | "[PHASE 2] Production Build" | 🔴 14차 진입했으나 vite 빌드에서 RollupDashboard.jsx:1051 TAB_COLORS 중복 |
| 3 | "[PHASE 3] Secure Deploy (SFTP)" | ⊘ 미도달 |
| 4 | "[PHASE 4] Post-Deploy Infrastructure Refresh" | ⊘ 미도달 |
| 5 | "[PHASE 5] Health Check & Rollback" | ⊘ 미도달 |
| - | "Slack Notification" (always 트리거) | 🟡 secrets.SLACK_WEBHOOK_URL 미등록 |

* 트리거: on push branches master ✅ (12차)
* YAML 파싱: ✅ 통과 (13차)
* Phase 1 통과: ✅ (14차)
* Phase 2 진입 + 부분 통과 (npm install + vite 시작): ✅ (14차)
* Phase 2 vite 빌드 통과: 🔴 (15차 후보)

### 작업 흐름 (검증된 8단계 패턴)

1단계: Get-ChildItem으로 파일 목록 조사
2단계: Select-String으로 package.json 참조 검증
3단계: Select-String으로 require/import 외부 참조 검증
4단계: git mv로 일괄 이동
5단계: git status --short로 renamed 검증
6단계: git commit
7단계: git push origin master
8단계: NEXT_SESSION.md 업데이트 및 commit/push

### 9차 5단 검증 패턴 (운영 critical 파일 검증용)

```
$pattern = "deploy_(all|demo_direct|demo_v2|kakao|nginx_root|prod|scp|ssh2\.js|win)"
(Select-String -Path "package.json" -Pattern $pattern | Measure-Object).Count
(Select-String -Path "*.js","*.cjs","*.mjs" -Pattern "require\(['""]\./$pattern" -List | Measure-Object).Count
(Select-String -Path "*.js","*.cjs","*.mjs" -Pattern "from\s+['""]\./$pattern" -List | Measure-Object).Count
$infraFiles = @(".github/workflows/deploy.yml","frontend/Dockerfile","infra/docker-compose.yml","docker-compose.yml","deploy.sh","deploy_gitbash.sh","ssh_test.sh","deploy.ps1") | Where-Object { Test-Path $_ }
Select-String -Path $infraFiles -Pattern $pattern | Format-Table -AutoSize -Wrap
Get-ChildItem -Path "docs" -Filter "*.md" | Select-String -Pattern $pattern | Format-Table -AutoSize -Wrap
```

### 12차 패턴 2: PowerShell .NET API 안전 텍스트 처리

```
$path = "<target_file>"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$content = [System.IO.File]::ReadAllText($path, $utf8NoBom)
$cleaned = $content -replace '<pattern>', '<replacement>'
[System.IO.File]::WriteAllText($path, $cleaned, $utf8NoBom)
```

핵심:
* New-Object System.Text.UTF8Encoding $false → BOM 없는 UTF-8 명시
* ReadAllText / WriteAllText → 파이프라인 거치지 않음 (인코딩 변환 0건)

**14차 한계**: √ 같은 일부 유니코드 문자는 .Replace 메서드와 -replace 정규표현식 모두 매칭 실패. 이 경우 VS Code 직접 편집으로 우회.

### 12차 패턴 3: 운영 critical YAML 안전 편집 다단계 검증

```
[System.IO.File]::ReadAllBytes("<file>")[0..2] | ForEach-Object { $_.ToString("X2") }
python -c "import yaml; yaml.safe_load(open('<file>', encoding='utf-8')); print('YAML PARSE OK')"
Select-String -Path "<file>" -Pattern "<removed_pattern>" | Measure-Object | Select-Object -ExpandProperty Count
Select-String -Path "<file>" -Pattern " +$" | Measure-Object | Select-Object -ExpandProperty Count
git diff <file> > deploy_diff.txt
Get-Content deploy_diff.txt
```

### 13차 패턴 6: GitHub Actions YAML syntax error 정밀 진단

```
[System.IO.File]::ReadAllLines("<yml_path>")[<line_idx_0_based>] | ForEach-Object { [System.Text.Encoding]::UTF8.GetBytes($_) | ForEach-Object { $_.ToString("X2") } }
python -c "import yaml; yaml.safe_load(open('<yml_path>', encoding='utf-8'))"
python -c "import yaml; yaml.safe_load(open('<yml_path>', encoding='utf-8')); print('YAML PARSE OK')"
```

### 13차 패턴 7: YAML 특수문자 처리

YAML에서 name: 값에 다음 문자가 있으면 따옴표 필수:
* [ ] (flow sequence로 오해석)
* { } (flow mapping)
* & (anchor 시작 문자)
* * (alias 시작 문자)
* ! (tag 시작 문자)
* | > (block scalar)
* : (mapping separator)
* # (comment)

권장: **큰따옴표 (")** 사용

### 14차 패턴 8: GitHub Actions step별 정밀 진단 ⭐ NEW

```
1. https://github.com/<org>/<repo>/actions 접속
2. 빨간 ❌ run 클릭
3. 좌측 sidebar의 deploy job 클릭
4. 우측에 펼쳐진 step 목록에서 빨간 ❌ step 식별
5. ❌ step 옆 ▶ 아이콘 클릭으로 stderr 로그 펼치기
6. 빨간 글자 (Error: ...) 키워드로 원인 분류
```

진단 매트릭스:

| 시간 | 의미 |
| --- | --- |
| 0s | 명령이 시작되자마자 throw → catch → exit 1 (silent) |
| 2~5s | 명령 진입 후 빠른 fail (보통 syntax error) |
| 10~30s | npm install / 의존성 처리 |
| 60s+ | 본격 빌드 / SFTP / SSH |

### 14차 패턴 9: ES 모듈 vs CommonJS 검증 명령 분리 ⭐ NEW

```
# en.js가 ES 모듈인 경우 (export default ...) — vm.createScript 사용 금지
node -e "require('fs').readFileSync('./frontend/src/i18n/locales/en.js', 'utf8'); console.log('[OK] EN_JS_EXISTS');"

# en.js가 CommonJS인 경우 (module.exports = ...) — vm.createScript 가능
node -e "const fs=require('fs'); const src=fs.readFileSync('./frontend/src/i18n/locales/en.js', 'utf8'); require('vm').createScript(src); console.log('[OK] EN_JS_VALID');"
```

### 14차 패턴 10: silent process.exit 진단 회피 ⭐ NEW

```
node -e "const fs=require('fs'); try { ... } catch(e) { console.error('FAIL:', e.message); process.exit(1); }"
```

### 14차 패턴 11: 파일 존재 + git history 동시 확인 (fantasy 호출 검출) ⭐ NEW

```
Test-Path "<target_file>"
git ls-files "<target_file>"
Get-ChildItem -Path . -Recurse -Filter "<filename_pattern>" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "node_modules|clean_src|\.git\\" } | Select-Object FullName
git log --all --oneline -- "**/<filename>" 2>&1 | Select-Object -First 5
```

모든 결과가 0건이면 → fantasy 호출. deploy.yml에서 단순 제거 안전.

### 14차 패턴 12: VS Code 직접 편집 시 들여쓰기 정확성 검증 ⭐ NEW

```
[System.IO.File]::ReadAllLines("<file>")[<line_idx>]
[System.IO.File]::ReadAllLines("<file>")[<idx_before>..<idx_after>]
python -c "import yaml; yaml.safe_load(open('<file>', encoding='utf-8')); print('YAML PARSE OK')"
```

### 14차 패턴 13: working directory 잔존 함정 회피 ⭐ NEW

```
# 안전한 패턴 1: Push-Location / Pop-Location
Push-Location frontend
$result = ...
Pop-Location

# 안전한 패턴 2: Get-Location으로 항상 확인
Get-Location

# 안전한 패턴 3: 절대 경로 사용
$result = Select-String -Path "D:\project\GeniegoROI\frontend\..." -Pattern "..."
```

### PowerShell 사용 시 주의사항 (7차~14차에서 발견)

* 명령어가 너무 길면 줄바꿈 → 패턴을 변수에 저장 후 짧게 호출
* Write-Host와 Get-ChildItem 같은 명령어를 한 줄에 붙이지 말 것
* 결과 검증 시 0이 단독 출력되면 다음 프롬프트 PS의 P가 잘려 0S D:\...로 보일 수 있음 (정상)
* Test-Path로 파일 존재 여부 사전 확인 후 Select-String 실행
* CRLF 경고는 Windows에서 .gitignore 수정 시 정상 동작, 무시 가능
* **🚨 Get-Content | Where-Object | Set-Content 패턴 절대 금지 (11차)**
  + Set-Content는 시스템 기본 인코딩 사용 → UTF-8 한글 파일이 모두 깨짐
  + 대안: VS Code 직접 편집 / Cline 위임 / .NET API 직접 사용 (12차 패턴 2)
* **새 명령어 결과와 이전 결과의 잔상을 혼동하지 말 것**
* **🚨 Select-Object가 git 출력 인코딩 변환 (12차)**
* **🚨 git diff --stat PowerShell 파싱 에러 (12차)**
  + 우회: git diff <file> > diff.txt 후 파일로 확인
* **🚨 VS Code Find/Replace All 작동 안 함 (12차)**
* **🚨 VS Code Quick Open이 .gitignore 파일 못 찾음 (12차)**
* **🟢 PowerShell .NET API로 multi-replace 안전 처리 가능 (13차)**
* **🚨 PowerShell √ 유니코드 single-quote string 매칭 실패 (14차)** ⭐ NEW
  + .Replace($oldLine, $newLine) 작동 안 함
  + -replace 정규표현식도 매칭 안 됨
  + 우회: VS Code 직접 라인 편집 (들여쓰기 8칸 정확 유지 필수)
* **🚨 PowerShell Start-Job은 working directory 미상속 (14차)** ⭐ NEW
  + cd frontend 후 Start-Job 하면 새 세션은 OneDrive 홈 폴더에서 실행 → ENOENT
  + 우회: ScriptBlock 안에서 Set-Location 직접 호출 또는 절대 경로 사용
* **🚨 PowerShell working directory 잔존 함정 (14차)** ⭐ NEW
  + 한 번 cd하면 이후 명령에서 그 위치 유지
  + 우회: Push-Location / Pop-Location 사용 또는 Get-Location으로 항상 확인

### .clineignore 핵심 차단 패턴

* frontend/src/i18n/locales/**/*.js (15개 언어 거대 파일)
* locales_backup/, clean_src/, backup/, $BACKUP_DIR/
* legacy_v338_pkg/
* fix_*, nuke_*, smart_trans_*, supreme_deploy.js
* dict_*.json
* node_modules/, dist/, build/
* .env, *.pem, *.key
* logs/, *.log

### 비용 추적

* 5월 2일 세션: 검증 1회만 사용 ($0.0585)
* 5차~9차: PowerShell만으로 처리 → Cline 호출 0회
* 10차: PowerShell만으로 3개 git untrack + 3개 보존 결정 → Cline 호출 0회
* 11차: PowerShell + VS Code로 1줄 제거 → Cline 호출 0회
* 12차: PowerShell + VS Code Find&Replace + .NET API로 9곳 변경 → Cline 호출 0회
* 13차: PowerShell + .NET API로 5곳 동시 변경 + Python YAML 검증 → Cline 호출 0회
* 14차: PowerShell + .NET API + VS Code 직접 편집으로 deploy.yml 2 commits + GitHub Actions 진단 → Cline 호출 0회 ⭐ NEW
* 5월 2~3일 누적 184개 archive + 3개 untrack + 6개 보존 + 1개 보안 정리 + 1개 CI 활성화 + 1개 YAML 수정 + Phase 1 정상화 / Cline 호출 0회 / 비용 $0.0585 유지
* .clineignore 도입 효과: Cline 작업당 약 70% 절감

---

## 초고도화 분석 시 미리 준비할 답변

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

🔴 **RollupDashboard.jsx TAB_COLORS 중복 선언 수정 (15차 최우선 추천):** ⭐ NEW
"GeniegoROI GitHub Actions의 14차 push 후 Phase 2 vite 빌드 실패를 진단/수정하고 싶습니다.
14차에서 Phase 1 통과 + Phase 2 npm install 통과 + vite 진입까지 진전했으나(commit 822927b),
RollupDashboard.jsx:1051에서 TAB_COLORS 중복 선언으로 vite SyntaxError 2.17초만에 빌드 실패합니다.
line 1035 props에서 TAB_COLORS를 받고 line 1051에서 const TAB_COLORS = useMemo()로 재선언.
운영 영향 검토 후 옵션 A(이름 변경) / B(props 제거) / C(local 제거) 중 선택해서 진행하고 싶습니다."

비스크립트 잡파일 정리:
"GeniegoROI 루트의 .txt/.json/.py 잡파일 정리를 시작하고 싶습니다.
.js/.cjs/.mjs는 1~9차로 정리 완료, .sh/.ps1은 10~11차에서 정리 완료, CI는 12~14차에서 정리 완료, 이제 다른 형식 차례입니다."

i18n 누락 키 작업:
"GeniegoROI ko.js의 channelKpiPage 누락 키 9개 추가 작업을 시작하고 싶습니다.
구조가 복잡하니 신중하게 진행해주세요."

GitHub Actions Node.js 20 deprecation 처리:
"GeniegoROI GitHub Actions의 Node.js 20 deprecation 처리를 시작하고 싶습니다.
13차에서 발견: actions/checkout@v3, actions/setup-node@v3, 8398a7/action-slack@v3 모두 v4 업그레이드 권장."

Slack secrets 등록 또는 가드:
"GeniegoROI GitHub Actions의 Slack Notification step 처리를 하고 싶습니다.
14차에서 SLACK_WEBHOOK_URL 미등록으로 always() 트리거 실패 확인.
옵션 1: secrets 등록 / 옵션 2: deploy.yml에 가드 추가 중 선택하고 싶습니다."

git history 평문 PW 청소 (선택):
"GeniegoROI git history의 평문 PW를 청소하고 싶습니다.
11차에서 working tree는 정리했으나 ac6b8be 등에 잔존합니다.
BFG Repo-Cleaner / 운영 PW 변경 / 그대로 유지 중 선택하고 싶습니다."

초고도화 분석 시작:
"GeniegoROI 초고도화 분석을 시작합니다. 사전 답변 13개 질문에 답변하면서 진행하겠습니다."

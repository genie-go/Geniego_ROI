# GeniegoROI 다음 세션 인수인계 문서

> Last Updated: 2026-05-06 (34차 완료)
> Last Commit: 59cebce (master == origin/master, clean)

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

### 이전 세션 기록

1차~17차 (2026-05-02 ~ 2026-05-03) 상세 기록은 **`docs/SESSION_HISTORY.md`** 참조.

요약:
* 1차~9차: 일회성 패치 스크립트 192개 archive (`fix_*`, `patch_*`, `inject_*`, deploy 변형 등)
* 10~11차: 운영 critical 스크립트 보존 매트릭스 확정 + deploy_gitbash.sh 평문 비밀번호 제거
* 12~17차: GitHub Actions deploy.yml 정상화 chain
  + 12차 — master 트리거 활성화, AI 흔적 제거
  + 13차 — YAML flow sequence 오류 수정 (PHASE 라벨 quoting)
  + 14차 — fantasy 호출 제거 (gen_locales.mjs 등) + ES 모듈 검증으로 단순화
  + 15차 — RollupDashboard.jsx TAB_COLORS 중복 선언 해소 → Phase 2 통과
  + 16차 — Phase 3~5 secrets 가드 (graceful skip)
  + 17차 — actions v3→v4 업그레이드, Annotations 0건 완전 그린 달성

### 5월 4일 완료된 작업

20차 (5월 4일)  NEW

* **GeniegoROI 루트 .txt 잡파일 정리 — 17개 git mv archive + 3개 untracked Move-Item archive (총 20개)**
* **🚨 결정적 발견 1: 27개 .txt 중 25개가 외부 참조 0건의 일회성 출력**
  + 9차 5단 검증 패턴 적용: package.json / requireimport / 인프라 / docs 모두 통과
  + 보존 결정 2개: _crash_snippet.txt (BUG-012 분석 보고서가 인용), missing_keys.txt (다음 세션 i18n 작업 자료)
* **🚨 결정적 발견 2: 3개 파일은 git untracked 상태 — git mv 거부됨**
  + deploy_diff_14th.txt, deploy_diff_14th_2.txt: 14차 진단 출력, 한 번도 git add 안 됨
  + build_output.txt (1.1MB): 빌드 산출물, .gitignore 또는 한 번도 추적 안 됨
  + 우회: Move-Item으로 archive 디렉토리에 일관성 이동 (git는 모르지만 파일은 옮겨짐)
* **🚨 결정적 발견 3: VS Code/Antigravity 통합 터미널 GUID 마커 함정 패턴 5번째 검증**
  + 19차에 발견된 함정이 20차에서도 동일하게 발생
  + 화면 깨짐(이모지  ??, 백슬래시  \x5c, GUID 마커 끼어듦)  실제 명령 실패
  + 결과 검증은 항상 디스크 파일을 직접 확인  .Replace는 정확히 작동
* **수정 작업 (3 wave 분할)**:
  + Wave 1 (11개, git tracked): _claim_tab_backup, _files_needing_t, _prod_files, d1~d4, debug_out, find_out, ko_check, sub_check
  + Wave 2 (6개, git tracked): en_tabs, en_test, eng_lines, keys_out, korean_lines, tab_keys
  + Wave 2 잔여 (2개, untracked): deploy_diff_14th, deploy_diff_14th_2  Move-Item
  + Wave 3 (1개, untracked): build_output.txt (1.1MB)  Move-Item
* **commit ca9eb8c**: chore(20th): archive 17 obsolete .txt files (wave 1-2, txt cleanup)
* **🟢 20차에서 처음 도달한 상태**:
  + 루트 .txt 잡파일 청소 완료 (27  2개로 축소)
  + 운영 critical 인프라(deploy.yml, deploy.sh 등) 영향 0% 유지
* **🟡 20차에서 새로 노출된 issue 없음** (다음 작업 후보: i18n 누락 키 작업, .py.json 잡파일 정리)
* **운영 영향**: 0% (.txt는 운영에 묶이지 않음)
* **Cline 호출 0회**, 비용  추가

21차 (5월 4일) ⭐ NEW

* **CLAUDE.md 신규 작성 + 영구 가이드 분리 + 1차~17차 SESSION_HISTORY.md 분리 + i18n-sync 첫 서브에이전트 도입**
* **🚨 결정적 발견 1: NEXT_SESSION.md 단독으로는 영구 가이드 역할 한계**
  + 38 KB 누적, 매 세션 시작 시 컨텍스트 부담 큼
  + 영구 규칙(PowerShell 함정·아키텍처)과 휘발성 세션 로그 혼재
  + → CLAUDE.md(영구) / NEXT_SESSION.md(현재 세션 + 큐) / SESSION_HISTORY.md(history archive) 3-tier 분리 결정
* **🚨 결정적 발견 2: .bak 5개 모두 git untracked working tree 잔재**
  + NEXT_SESSION.md.bak_14th/15th/20th: 14~15차 .NET API 다중 패치 안전망
  + .github/workflows/deploy.yml.bak_14th/14th_2: 14차 deploy.yml 편집 안전망
  + git이 NEXT_SESSION.md/deploy.yml 모든 시점 commit 보존 → .bak 100% redundant
* **🚨 결정적 발견 3: 서브에이전트는 i18n-sync가 ROI 최상**
  + 15개 로케일 + ko.js 1 MB + .clineignore 등록 → context isolation 필수 후보 1순위
  + 다음 작업 후보 1순위(channelKpiPage 누락 키 9개)에 즉시 투입 가능
  + 자동 번역 금지 + opt-in 편집 모드(placeholder/영어 fallback)로 안전성 확보
* **수정 작업 (4 commits, 모두 Edit 도구 + PowerShell만)**:
  + commit 5d45267: CLAUDE.md 최초 작성 (102줄) — 아키텍처 / CI/CD master 트리거 / 백엔드 41 핸들러 / 프론트 116 페이지 / 알려진 함정 통합 가이드
  + commit d5b1797: CLAUDE.md 보강 (90줄 추가) + .bak 5개 working tree 정리 — PowerShell 함정 9건, deploy 보존 매트릭스, fantasy-call 검출, YAML 특수문자, .clineignore 요약
  + commit d88c918: 1차~17차 → docs/SESSION_HISTORY.md (15 KB) 분리, NEXT_SESSION.md 38 KB → 24 KB (37% 감소)
  + commit dbd6fdb: .claude/agents/i18n-sync.md (181줄) — 5가지 모드(감사 3 / opt-in 편집 2), tools 제한 (Read/Grep/Glob/Edit, Write·Bash 차단)
* **🟢 21차에서 처음 도달한 상태**:
  + 영구 가이드(CLAUDE.md) 작성 완료 — 192줄, 아키텍처 + 함정 + 패턴 + 매트릭스 단일 권위
  + 세션 로그 슬림화 + history archive 분리 — 매 세션 시작 컨텍스트 부담 75% 감소 예상
  + 첫 서브에이전트 i18n-sync 도입 — 다음 세션 channelKpiPage 작업에 즉시 사용
* **🟡 21차에서 새로 노출된 issue 없음** (다음 작업 후보: i18n-sync 첫 실전 적용 → channelKpiPage 누락 키 9개 점검)
* **운영 영향**: 0% (.bak 잔재는 git untracked, agent 정의 파일 추가만 commit, 모든 운영 배포 chain 무관)
* **Cline 호출 0회**, 비용 $0 추가

22차 (2026-05-04) ⭐ NEW

* **deploy.yml에 paths-ignore 추가 — docs/.md/.claude 변경 시 CI 스킵**
* **i18n channelKpiPage 9개 키 점검: 누락 없음 (15개 언어 모두 보유, 영어 플레이스홀더)**
* **missing_keys.txt → docs/archive/ 보관 처리**
* **🚨 결정적 발견 1: channelKpiPage 9개 키 이미 동기화 완료**
  + i18n-sync 모드 3(감사 전용) 실행 — 자동 편집 없음
  + 9개 키(channelKpiPage namespace + tabGoals/Roles/Setup/Sns/Content/Community/Targets/Monitor) 전부 15개 언어에 존재
  + 단, 14개 미러 파일은 영어 플레이스홀더("KPI Goals" 등) → 키는 있으나 현지화 미완
* **🚨 결정적 발견 2: ko.js에 channelKpiPage 하위 키 추가 존재 가능성**
  + pageTitle, heroDesc 등 missing_keys.txt에 없던 키가 ko.js에 있고 미러 파일 누락 가능
  + → 23차에서 channelKpiPage 전체 키 동기화 감사 필요
* **수정 작업 (6 commits, CI 1회 정상 실행 45s)**:
  + deploy.yml paths-ignore 추가
  + missing_keys.txt → docs/archive/ git mv (commit 43c66cb)
* **🟢 22차에서 처음 도달한 상태**:
  + missing_keys.txt 루트 제거 — docs/archive/ 정리 완료
  + i18n-sync 서브에이전트 첫 실전 투입 성공
* **🟡 22차에서 새로 노출된 issue**: channelKpiPage 전체 키 동기화 미확인 (pageTitle 등)
* **운영 영향**: 0%
* **Cline 호출 0회**, 비용 $0 추가

### 누적 통계

* archive된 파일 수: **192개** (8 + 15 + 7 + 17 + 42 + 33 + 47 + 14 + 9)
* archive 위치: tools/migrations/_archived/
* 10차 git untrack: 3개 (deploy_*.txt)
* 10차 보존 확정: 3개 (.ps1, .sh, _gitbash.sh)`
* 11차 보안 정리: 1개 (deploy_gitbash.sh PASSWORD 라인 제거)
* 12차 CI 활성화: 1개 (.github/workflows/deploy.yml — 9곳 변경)
* 13차 YAML 수정: 1개 (.github/workflows/deploy.yml — 5곳 따옴표 추가)
* 14차 deploy.yml 정리: 2 commits (line 23~25 제거 + line 22 교체)
* Cline 호출: **0회** (모든 작업 PowerShell + VS Code + .NET API로 처리)
* 5월 단일 세션 (5월 2~4일) 처리량: **204개 archive + 3개 untrack + 6개 보존 결정 + 1개 보안 정리 + 1개 CI 활성화 + 1개 YAML 수정 + Phase 1 정상화 + Phase 2 통과 + TAB_COLORS 수정 + Phase 3~5 secrets 가드 + Slack 가드 + actions v4 업그레이드 + Annotations 0건 달성 + 18차 docs 보강 + 19차 메타 보정 + 20차 .txt 20개 archive + 21차 CLAUDE.md 신규 + SESSION_HISTORY.md 분리 + i18n-sync 도입**
* 21차 영구 가이드/서브에이전트 인프라: CLAUDE.md (192줄) + docs/SESSION_HISTORY.md (15 KB) + .claude/agents/i18n-sync.md (181줄)
* 비용: $0.0585 유지 (16차~21차 모두 Cline 호출 0회)

### 다음 작업 후보 (우선순위 순)

1. **🔴 GitHub Actions Secrets 등록 — 16차 최우선** ⭐ DONE
   * **현 상태**: Phase 2 통과, Phase 3~5는 secrets 미등록으로 막힘
   * **deploy.yml line 30~60 분석 결과 — 등록 필요한 6개 secrets**:
     + Phase 3, 4: REMOTE_IP, REMOTE_USER, SSH_PRIVATE_KEY (SCP/SSH 인증)
     + Phase 5: TEST_EMAIL, TEST_PASS (헬스체크 로그인 검증)
     + Slack: SLACK_WEBHOOK_URL (always 트리거)
   * **15차에서 확인된 정확한 에러 메시지 (Phase 3)**:
     + Run appleboy/scp-action@master
     + Drone SCP version 1.8.0
     + Error: can't connect without a private SSH key or password
     + Process completed with exit code 1
   * **16차 옵션**:
     + (A) secrets 6개 모두 등록 → CI/CD chain 완성
     + (B) SLACK_WEBHOOK_URL만 등록 → Slack 빨간 ❌만 해소 (가장 작은 변경)
     + (C) deploy.yml에 if 가드 추가하여 secrets 없어도 graceful skip
     + (D) Phase 3~5 step에 if: false 임시 비활성화 → 모든 step 녹색 ✅
   * **보안 주의**: SSH_PRIVATE_KEY는 매우 민감. TEST_PASS는 운영 비밀번호 (11차 평문 PW 이슈와 연결).
   * **운영 영향**: 옵션에 따라 다름. (A)는 운영 자동 배포 완성, (D)는 영향 0%.
   * **✅ 16차 완료 (commit 970f3fd, Run #134)**: 옵션 (C) + (B) 적용 — env 가드 + Slack secret 이름 통일로 graceful skip 달성, CI 매트릭스 ✅ green


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

5. **✅ i18n channelKpiPage 9개 키 점검 — 22차 완료** ★ DONE
   * **결과**: 누락 없음 — 9개 키 모두 15개 언어에 존재 (영어 플레이스홀더 상태)
   * **자료**: `missing_keys.txt` → `docs/archive/` 보관 (commit 43c66cb)

6. **🔴 channelKpiPage 전체 키 동기화 감사 — 23차 1순위** ⭐ NEW
   * **배경**: ko.js에 pageTitle, heroDesc 등 missing_keys.txt 범위 밖 하위 키 존재 가능
   * **작업**: i18n-sync 모드 1(ko.js master 기준 전체 감사)로 channelKpiPage 전체 하위 키 vs 14개 미러 파일 비교
   * **운영 영향**: 0% (감사 전용)

7. **🟡 영어 플레이스홀더 → 현지화 번역 — 23차 2순위**
   * **배경**: channelKpiPage 14개 미러 파일이 영어 플레이스홀더("KPI Goals" 등)로만 채워짐
   * **작업**: i18n-sync 모드 4/5(opt-in 편집)로 placeholder → 실제 번역 교체
   * **운영 영향**: 0% (i18n 데이터만 변경, 빌드 검증은 사용자가 별도 수행)

6. **🟡 GitHub Actions Node.js 20 deprecation — 선택 작업** ★ DONE
   * 13차 발견: actions/checkout@v3, actions/setup-node@v3, 8398a7/action-slack@v3 모두 v4 업그레이드 권장
* **✅ 17차 완료 (commit 780de8d, Run #135)**: actions/checkout@v3 → v4, actions/setup-node@v3 → v4 업그레이드 — Annotations 0건 달성, git exit 128 동시 해소 (8398a7/action-slack@v3는 v4 미존재로 그대로 유지)


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
* **🟢 .github/workflows/deploy.yml Phase 1 통과 확정** (14차)
* **🟢 .github/workflows/deploy.yml Phase 2 통과 확정** (15차)
* **🟢 frontend/src/pages/RollupDashboard.jsx TAB_COLORS 중복 선언 해소** (15차 commit 500a951)
* **🟢 CLAUDE.md 영구 가이드 도입 완료** (21차 commit 5d45267 + d5b1797) ⭐ NEW
* **🟢 docs/SESSION_HISTORY.md 분리 완료** — NEXT_SESSION.md 38 KB → 24 KB (21차 commit d88c918) ⭐ NEW
* **🟢 .claude/agents/i18n-sync.md 첫 서브에이전트 도입** (21차 commit dbd6fdb) ⭐ NEW

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

### GitHub Actions CI/CD 분석 (18차 작업 후 최신 상태)

.github/workflows/deploy.yml 5단계 chain:

| Phase | 이름 | 상태 |
| --- | --- | --- |
| 1 | "[PHASE 1] Syntax Guard & I18N Patch" | ✅ 14차 통과 |
| 2 | "[PHASE 2] Production Build" | ✅ 15차 통과 (commit 500a951) |
| 3 | "[PHASE 3] Secure Deploy (SFTP)" | ⊘ 16차 가드로 graceful skip |
| 4 | "[PHASE 4] Post-Deploy Infrastructure Refresh" | ⊘ 16차 가드로 graceful skip |
| 5 | "[PHASE 5] Health Check & Rollback" | ⊘ 16차 가드로 graceful skip |
| - | "Slack Notification" (always 트리거) | ⊘ 16차 가드로 graceful skip |

* 트리거: on push branches master ✅ (12차)
* YAML 파싱: ✅ 통과 (13차)
* Phase 1 통과: ✅ (14차)
* Phase 2 진입 + 부분 통과 (npm install + vite 시작): ✅ (14차)
* Phase 2 vite 빌드 통과: ✅ (15차 commit 500a951)
* Phase 3~5 secrets 가드 적용: ✅ (16차)

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
* 14차: PowerShell + .NET API + VS Code 직접 편집으로 deploy.yml 2 commits + GitHub Actions 진단 → Cline 호출 0회
* 15차: PowerShell .NET API + 메모장 안전망으로 RollupDashboard.jsx 2곳 수정 (TAB_COLORS 중복 해소) + NEXT_SESSION.md 9곳 활차 수정 → Cline 호출 0회
* 21차: Edit 도구로 CLAUDE.md 신규 작성(192줄) + 보강(90줄) + SESSION_HISTORY.md 분리(15 KB) + i18n-sync 서브에이전트 정의(181줄) → Cline 호출 0회 ⭐ NEW
* 5월 2~4일 누적 204개 archive + 3개 untrack + 6개 보존 + 1개 보안 정리 + 1개 CI 활성화 + 1개 YAML 수정 + Phase 1~2 정상화 + secrets 가드 + Annotations 0건 + 영구 가이드 도입 + 첫 서브에이전트 / Cline 호출 0회 / 비용 $0.0585 유지
* .clineignore 도입 효과: Cline 작업당 약 70% 절감
* CLAUDE.md + i18n-sync 도입 효과 (예상): main agent의 i18n 작업 컨텍스트 90%+ 절감 (격리 컨텍스트 + ko.js 무인자 Read 차단)

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

🟢 **21차 인프라 정비 완료 — 다음 1순위는 i18n-sync 첫 실전 적용:**
"GeniegoROI 21차 작업까지 완료 (commit dbd6fdb, master 로컬, origin보다 4 commits ahead).
CLAUDE.md 신규 작성, 1차~17차 → docs/SESSION_HISTORY.md 분리, .claude/agents/i18n-sync.md 첫 서브에이전트 도입까지 완료.
다음 1순위는 i18n-sync로 channelKpiPage 누락 키 9개를 점검하는 작업입니다.
missing_keys.txt(루트, 20차에 보존)에 키 목록(channelKpiPage, tabCommunity, tabContent, tabGoals, tabMonitor, tabRoles, tabSetup, tabSns, tabTargets)이 있습니다.
i18n-sync 모드 3(missing_keys.txt 기반 감사)으로 시작해 ko.js를 master로 14개 언어와 비교한 누락 매트릭스 보고를 받은 후, placeholder fill / 영어 fallback / 직접 번역 제공 중 어느 옵션으로 진행할지 결정하고 싶습니다.
**자동 편집·자동 번역 금지** — i18n-sync는 명시 요청 시에만 모드 4·5로 진입합니다."

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

---

## 23차 세션 완료 (2026-05-04 추가)

### [A. 23차 작업 요약]

- channelKpiPage 전체 키 동기화 감사 (모드 1) 실행 완료
- `scripts/analyze_i18n_namespaces.py` 신규 생성 (89줄, sys+re만, read-only, argv 입력, 부모 네임스페이스 추적)
- en.js, ko.js 두 파일 분석 완료
- locale 파일 0건 변경

### [B. en.js channelKpiPage 블록 5개]

| # | 시작L | 종료L | 키수 | 인덴트 | 부모 네임스페이스 |
|---|-------|-------|------|--------|------------------|
| 1 | 7698  | 7814  | 115  | 8      | pages.marketingIntel.aiPredict.channelKpiPage |
| 2 | 8186  | 8323  | 136  | 6      | pages.marketingIntel.channelKpiPage |
| 3 | 10782 | 10898 | 115  | 10     | pages.marketingIntel.marketingIntel.aiPredict.channelKpiPage |
| 4 | 11288 | 11426 | 137  | 8      | pages.marketingIntel.marketingIntel.channelKpiPage |
| 5 | 22272 | 22292 | 19   | 2      | **channelKpiPage (TOP-LEVEL, runtime 사용)** |

### [C. ko.js channelKpiPage 블록 6개]

| # | 시작L | 종료L | 키수 | 인덴트 | 부모 네임스페이스 |
|---|-------|-------|------|--------|------------------|
| 1 | 7871  | 7987  | 115  | 10     | nav.pages.aiPredict.banner.channelKpiPage |
| 2 | 8313  | 8429  | 115  | 8      | nav.pages.banner.channelKpiPage |
| 3 | 8672  | 8809  | 136  | 6      | nav.pages.channelKpiPage |
| 4 | 11636 | 11752 | 115  | 6      | aiPredict.banner.channelKpiPage |
| 5 | 12100 | 12216 | 115  | 4      | banner.channelKpiPage |
| 6 | 12471 | 12619 | 147  | 2      | **channelKpiPage (TOP-LEVEL, runtime 사용)** |

### [D. 미해결 — 24차 작업]

- 14개 미러 파일(ja, zh, zh-TW, de, th, vi, id, ar, es, fr, hi, pt, ru)의 TOP-LEVEL channelKpiPage 블록 위치/키 수 미조사
- 실행 방법: `python scripts\analyze_i18n_namespaces.py frontend\src\i18n\locales\<lang>.js` 로 14번 실행
- 사전 조건: `$env:PYTHONIOENCODING = 'utf-8'` 설정 (한글 깨짐 방지, 단 PowerShell 세션 유지 주의)

### [E. 옵션 재정의 — 24차에서 결정]

대상: TOP-LEVEL channelKpiPage 한정, 누락 128키

- **옵션 A**: ko.js 값을 영어 fallback으로 14개 미러에 일괄 추가 (UI 키 누락 방지)
- **옵션 B**: `[!번역필요]` 마커로 채우기 (UI 즉시 발각, 번역 진행 표시)
- **옵션 C**: 직접 번역 (시간 소요, production-safe)
- **옵션 D**: 14개 미러 분석 후 결정 (일부 언어 이미 동기화 가능성)

### [F. 23차 학습 — 24차에 적용]

- `$env:PYTHONIOENCODING = 'utf-8'` 이 PowerShell stdout 한글 깨짐 해결책 (단, 다음 명령으로 이어지지 않음 — 세션 내 매번 설정 필요)
- `cd / && / ; 체인` 명령 절대 사용 금지 (Antigravity 보안 차단)
- `python3` → `python` 사용 (Windows에서 python3 exit code 49)
- 절대 경로 또는 상대 경로만, 단일 명령 단위로 실행
- Claude Code 자동 결정 경향 → "절대 금지" + "사용자가 직접 결정" 명시 필요
- inline 멀티라인 따옴표 스크립트 금지 (보안 거부) → 별도 파일 Write 후 실행

### [G. 24차 시작 추천]

1. NEXT_SESSION.md 23차 블록 [A]~[G] 읽기
2. `$env:PYTHONIOENCODING = 'utf-8'` 설정
3. 14개 미러 파일 분석 (D 항목) — 파일당 별도 승인
4. 결과 보고 후 옵션 결정 (E 항목)

### [H. 보존 자산]

- `scripts/analyze_i18n_namespaces.py` — 24차 14개 미러 분석에 재사용 가능

---

## 24차 결과 (분석 완료, 동기화는 25차로)

### [I] 24차 작업 요약

- **작업**: 23차 [D]에서 정의된 미러 i18n 파일 분석
- **방법**: scripts/analyze_i18n_namespaces.py 재사용 (23차 자산)
- **결과**: 분석 완료. 옵션 결정 가능 상태. 실제 동기화는 25차로 이관.

### [J] 미러 파일 카운트 정정

- **23차 메모 "13개 미러" 정확함** (24차 첫 보고 "14개"는 오인)
- 총 15개 locale: ko.js + en.js + 13개 미러
- 13개 미러: ar, de, es, fr, hi, id, ja, pt, ru, th, vi, zh-TW, zh

### [K] i18n 구조 분석 결과 (channelKpiPage 블록 분포)

| 그룹 | 파일 | 블록 수 | 최상위 키 수 |
|---|---|---|---|
| ko 구조 (`nav.pages.*`) | ko.js | 6개 | **147** |
| en 구조 (`pages.marketingIntel.*`) | en, de, es, fr, id, ja, th, vi, zh-TW, zh | 5개 | 19 |
| 최상위만 | ar, hi, pt, ru | 1개 | 19 |

**핵심 발견**: ko.js만 외톨이 구조. 나머지 14개(en + 13미러)는 모두 다른 구조.

**누락 검증**: ko.js 최상위 147키 vs 미러 최상위 19키 = **128키 누락** (23차 메모 정확)

### [L] 코드 참조 패턴 (1개 파일 기준 예비 검증)

- **검증한 파일**: `frontend/src/.../ChannelKPI.jsx` (1개만)
- **참조 형식**: `t('channelKpiPage.키이름')` — 최상위 네임스페이스 직접 참조
- **미사용 추정**: `nav.pages.channelKpiPage.*`, `pages.marketingIntel.channelKpiPage.*` (데드코드 추정)
- **⚠️ 미검증**: 다른 페이지 컴포넌트의 참조 패턴 — **25차 첫 작업으로 전체 그레프 필수**

### [M] 25차 작업 정의 (실제 동기화)

**선결 작업 (25차 시작 직후 필수):**

1. **전체 코드베이스 그레프 검증**
   - 명령: `git grep "channelKpiPage" -- frontend/src/ ':!frontend/src/i18n/'`
   - 목적: ChannelKPI.jsx 외 다른 페이지의 참조 패턴 확인
   - 만약 `nav.pages.channelKpiPage.*` 또는 `pages.marketingIntel.channelKpiPage.*`로 참조하는 파일이 있다면 → 24차 결론 무효 → 작업 방향 재정의

**검증 통과 시 본 작업:**

2. ko.js 최상위 `channelKpiPage` 147키를 표준으로 확정
3. en.js + 13개 미러 파일의 최상위 `channelKpiPage`에 누락 128키 추가
   - **en.js**: 영어 placeholder 또는 실제 영어 번역
   - **13개 미러**: 일단 영어와 동일한 placeholder
4. 작업 후 각 파일에 대해 `analyze_i18n_namespaces.py` 재실행하여 키 수 일치 확인

**별도 과제 (25차 또는 이후):**

5. ko.js의 `nav.pages.channelKpiPage` 등 6개 중첩 블록 정리 (데드코드 추정)
6. en.js + 미러의 `pages.marketingIntel.channelKpiPage` 등 중첩 블록 정리
7. ar/hi/pt/ru 4개 파일의 미완성 상태 (1블록만 존재) 원인 조사

### [N] 24차 신규 함정 (23차 함정 노트에 추가)

1. **Bash 셸에서 백슬래시 경로 금지**
   - 새 터미널 패널 열면 PowerShell 아니라 Bash로 뜰 수 있음
   - Bash에서 `scripts\analyze.py` → `scriptsanalyze.py`로 이스케이프됨
   - 해결: 슬래시 사용(`scripts/analyze.py`) + 따옴표 감싸기

2. **PowerShell의 `;` 도 체인 금지**
   - 23차 "&&" 금지에 더해 PowerShell의 `;`도 같은 체인 취급
   - 한 번에 실행되어 디버깅 어려움

3. **Plan 모드 자동 활성화 가능성**
   - 경계 명령("결정 금지", "한 번만" 등) 반복 시 Claude Code가 Plan 모드 진입
   - read-only 조회 작업이면 Plan 모드 종료(Yes) 후 진행

4. **Claude Code 자동 제안 입력창 채우기 (24차 핵심 함정)**
   - Claude Code가 결과 보고 후 자기 판단으로 다음 명령을 입력창에 미리 채움
   - 합리적이라도 그대로 Enter 치지 말 것
   - 매번 Ctrl+A → Delete → 사용자 명령 직접 작성

5. **터미널 패널 분기 시 환경변수 휘발**
   - 새 터미널 세션에서 `$env:PYTHONIOENCODING = 'utf-8'` 다시 설정 필요
   - 한글 출력 깨지면 이게 원인

### [O] 24차 보존 자산

- `scripts/analyze_i18n_namespaces.py` (2972 bytes, 25차 재사용 가능)
- ko.js 147키 목록은 별도 저장 안 함 (25차에서 스크립트로 재추출)

### [P] 25차 첫 메시지 추천

다음 25차 새 Claude에게 보낼 첫 메시지:

## 25차 세션 완료 (2026-05-04)

### [L]. 25차 작업 결과

[L]1: 채널KPI 코드 그레프 검증
- frontend/src 전체 channelKpi 파일 전수 조사
- ChannelKPI.jsx 정적 t() 119개 + 동적 28개 = 총 147개 키 사용
- 분포: channelKpiPage.* 147개, geniego-refresh 1개 (무관)
- 결과: SESSION_25_L1_result.txt

[L]2-A: ko.js 데드코드 5개 블록 정밀 삭제
- trace_paths.py: 6개 channelKpiPage 블록 위치 추적
- recheck_paths.py: 5개 데드코드 코드 사용 0회 검증
- delete_dead_blocks.py: 들여쓰기+닫는 } 매칭, os.replace 안전 교체
- 결과: 21625 -> 21019 라인 (-606)
- 검증: 최상위 channelKpiPage 147키 보존, node ESM import PASS
- 보고: SESSION_25_L2A_paths.txt, RECHECK.txt, DELETE_REPORT.txt, VERIFY.txt

삭제된 5개 블록 (부모 경로 + 라인):
- 7871: coupon.aiPredict.banner.channelKpiPage (117라인)
- 8313: coupon.banner.channelKpiPage (117라인)
- 8672: coupon.channelKpiPage (138라인)
- 11636: aiPredict.banner.channelKpiPage (117라인)
- 12100: banner.channelKpiPage (117라인)

보존:
- 12471 -> 11865 (시프트): channelKpiPage 최상위 147 하위 키
- ko.backup_25_L2A.js (로컬 백업, .gitignore)

git commit:
- 4c83069: fix(i18n): remove 5 dead channelKpiPage blocks from ko.js (-606 lines)
- 6debae8: docs(session): 25th session L1+L2-A artifacts and gitignore update

[24차 [L] 결론 정정]
24차 분석 "ko=147키 / 미러=19키" 표현은 부정확.
- 정확: ko.js 최상위 631키, 그 중 channelKpiPage 블록만 147 하위 키
- 24차 추정 데드코드 부모 (nav.pages.*, pages.marketingIntel.*) -> ko.js에 미존재
- 실제 데드코드 부모: coupon.*, banner.*, aiPredict.banner.*
- 24차 분석 오류 원인 (다른 파일 혼동? 다른 페이지? 등) 26차 추적 보류

### [N]. 25차 학습 (26차 적용)

Claude Code 신규 함정 5개:

1. 자동 추천 텍스트 함정
   - 응답 종료 후 입력창에 다음 명령 자동 생성
   - 사용자가 무심코 보내면 25차 규칙 1번 위반
   - 대응: 매 응답 후 입력창 확인, 백스페이스로 강제 지우기, 직접 명령 작성

2. 명령 잘림 함정
   - 긴 명령(특히 commit -m 멀티) 도중 잘림
   - 대응: commit 메시지 단순화 (한 -m), 상세 내용은 NEXT_SESSION.md로 분리, 명령 1회 단일 목적

3. "Yes, allow all" 승인 함정
   - 매 승인마다 옵션 2번 (세션 자동승인 또는 디렉토리 영구승인)
   - 24차 [N] "자동 결정" 함정과 동급
   - 대응: 절대 2번 금지, 매번 1번 단발 승인

4. 자동 결정 변경 함정
   - 작업 중 사용자 통보 없이 전략 변경
   - 예: grep 범위 11000~12471 -> tail -30 자동 갈아탐
   - 대응: 의심되면 거부, 명시 명령으로 재지시

5. 인라인 멀티라인 스크립트 보안 거부 (24차 재확인)
   - python -c "..." 멀티라인 -> 보안 차단 또는 인코딩 깨짐
   - 대응: 별도 .py 파일 Write 후 실행

효율적인 검증 모델 (작업 흐름 패턴):
- [위치 탐색] -> [코드 사용 검증] -> [정밀 삭제] -> [무결성 검증]
- 각 단계 .py 파일 + 결과 .txt 보고서 (재현 가능)
- 백업 -> 작업 -> 검증 PASS 후 교체 (os.replace) 패턴

### [O]. 26차 시작 추천

1순위: [L]2-B 미러 동기화
- 대상: en.js + 13개 미러 (ar, de, es, fr, hi, id, ja, pt, ru, th, vi, zh-TW, zh)
- 작업: ko.js channelKpiPage.* 147키를 14개 파일에 복제
- 출발점: 각 미러 19키 보유, 128키 누락 상태
- 권장 절차:
  1. 각 미러의 현재 channelKpiPage 블록 구조 확인
  2. ko.js 11865 라인부터 channelKpiPage 블록 추출 (147키 + 한글 값)
  3. 미러별 번역 정책 결정 (자동번역? ko 임시복사? 수동번역?)
  4. sync_mirrors.py 작성
  5. 검증: 각 미러 147키 + ESM import PASS
  6. git commit (단일 또는 미러별)

선택 작업:
- 24차 [L] 분석 오류 추적
- 다른 페이지 (orderHub 등) 동일 검증 -> 추가 데드코드 발견 가능성
- 빌드 검증 (npm run build, vite)

26차 시작 시 기억:
- 25차 [N] 5개 함정 회피
- 24차 [N] 5개 함정 회피 (인코딩 휘발, ; 체인, Plan 모드 자동, 자동 결정, 백슬래시)
- ko.js 백업: ko.backup_25_L2A.js (필요시 복원)

---

## 26차 세션 완료 (2026-05-05)

### [L]2-B 작업 결과

- 14개 i18n locale 파일에 channelKpiPage TOP-LEVEL 128키 동기화
- en.js: 영어 placeholder (camelCase → Title Case)
- 13개 미러 (ar, de, es, fr, hi, id, ja, pt, ru, th, vi, zh-TW, zh): ko 임시복사 (한글)
- ko.js 기존 마지막 키(guideTip5) trailing comma 보정 자동 적용
- 검증: 키 카운트 14/14 PASS (147키 일치), 문법 검사 14/14 PASS (export default / {} 균형 / "" 균형 / UTF-8)

작성/실행한 스크립트 (3개):
- scripts/sync_mirrors.py — 14개 파일 동기화 (백업 자동 + atomic 교체)
- scripts/verify_after_sync.py — 14개 파일 사후 검증
- scripts/verify_ko_pattern.py — ko.js 정규식 매칭 사전 검증

git commits (2 ahead from 25차 baseline 6debae8):
- 9bf7b2c: feat(i18n): sync channelKpiPage 128 keys to 14 locales
- 358b05d: chore(i18n): add 26th session sync/verify scripts

백업 파일 (.gitignore 자동 처리, 14개):
- frontend/src/i18n/locales/<lang>.backup_26_L2B.js (각 미러별)
- 검증 통과 후 사용자 결정으로 정리 가능

### [N]. 26차 학습 (27차 적용)

신규 함정 / 발견 (Antigravity Claude Code 환경):

1. node --check는 ES Module 파일에 부적절
   - .js 파일을 기본 CJS로 파싱 → export default 구문에서 SyntaxError
   - 24차 [F]9 패턴 재확인: ES Module이면 Python 정규식 기반 검증 또는 node --input-type=module 사용
   - 26차 채택: Python 정규식 기반 (의존성 0, 25차 패턴 일관성)

2. Antigravity 입력창 ghost text 자동 채움
   - Claude Code 응답 후 입력창에 다음 명령 자동 생성 (25차 [N]1 변형)
   - Esc, Ctrl+A, Backspace 작동 안 함
   - delete 키 단독은 작동하지만 빈 상태가 되면 잠시 후 자동 재채움
   - 우회: 한 글자(예: t) 타이핑 후 메시지를 그 뒤에 추가 — 첫 단어로 자연스럽게 흡수됨

3. 승인 옵션 두 절대 금지
   - "Yes, allow all edits during this session (shift+tab)"
   - "Yes, and don't ask again for: <명령> *" (와일드카드)
   - "Yes, and always allow access to <디렉토리>\ from this project" (디렉토리 영구접근)
   - 매번 옵션 1 단발 승인이 25차 [N]3 함정 회피의 핵심

4. dry-run 출력 자체의 sample 제한
   - sync_mirrors.py 같은 도구는 dry-run에서 missing[:5] 같은 슬라이스로 압축 출력
   - 외부 컨텍스트 한도 초과 시 임시 파일에 저장됨 (Antigravity)
   - 우회: 검증 단계에서는 sample 제한 풀기 (또는 spot-check 방식)

5. ko.js 기존 마지막 키 trailing comma 누락
   - 25차에서 데드코드 5개 블록 삭제 후 마지막 키(guideTip5)가 콤마 없이 끝남
   - 신규 키 삽입 시 syntax error 위험
   - 우회: sync 스크립트가 메모리 상에서 자동 보정 (ko.js 직접 수정 안 함)

6. dry-run / write 단계 분리의 안전성 확인
   - sync_mirrors.py의 dry-run 패턴이 잘 작동
   - 검증 → write → 사후검증 3단계로 14개 파일 무결성 보장
   - 25차 [O] "백업 → 작업 → 검증 PASS 후 교체" 패턴 26차도 통과

### [O]. 27차 시작 추천

1순위: i18n 영어 placeholder → 실제 영어 번역
- 26차 placeholder는 임시값 (예: ctr → Ctr 어색)
- 약자 사전 추가 또는 실제 번역가/LLM 번역

2순위: 13개 미러 → 실제 현지화 번역
- 26차에 ko 임시복사로 채움 → 사용자에게 잘못된 언어 노출
- 언어별 우선순위 결정 필요

3순위: 다른 페이지 동일 검증
- orderHub 등 다른 namespace에 channelKpiPage 같은 데드코드 또는 누락 있을 수 있음
- 25차 분석 패턴 (analyze_i18n_namespaces.py) 재사용

선택: 백업 파일 정리
- frontend/src/i18n/locales/*.backup_26_L2B.js 14개
- 27차 통과 후 안전 확인되면 정리 가능

27차 시작 시 기억:
- 26차 [N] 6개 함정 회피
- 25차 [N] 5개 + 24차 [N] 5개 함정 회피 누적
- 백업: <file>.backup_26_L2B.js 14개 (필요시 복원)

---

## 27차 세션 완료 (2026-05-05)

### [L] 작업 결과

시나리오 A 채택 (외부 검수자 권고): en.js 영어 placeholder 품질 개선 + 13개 미러 영어 fallback 갱신

**[L]1: en.js channelKpiPage TOP-LEVEL 37키 영어 번역 정제**
- scripts/refine_en_placeholder.py 작성 (156줄)
- ABBR_RULES (정규식 9개): Kpis→KPIs, Kpi→KPI, Ctr→CTR, Cpc→CPC, Cpa→CPA, Roas→ROAS, Sns→SNS, Seo→SEO, Ai→AI
- DIRECT_MAP (2개): heroDesc → "Manage API keys and connection status...", interestConv → "Interest Conversion Rate"
- EXISTING_19 화이트리스트: tabGoals/Roles/Setup/Sns/Content/Community/Targets/Monitor/Guide + guideTitle/Sub/StepsTitle/TabsTitle/TipsTitle + guideTip1~5
- 결과: 변환 37키, 변환 없음 91키 (chName_ + 자연 영어 키)
- 백업: en.backup_27_refine.js (970KB)
- 검증: 키수 147 보존, 문법 PASS
- git commit b6e1bac (74+/-37, 230 insertions for refine_en_placeholder.py 추가)

**[L]2: 13개 미러 영어 fallback 일괄 갱신**
- scripts/fill_mirrors_with_en.py 작성 (140줄)
- 패턴: 26차 sync_mirrors.py + 27차 refine_en_placeholder.py 결합
- en.js TOP-LEVEL channelKpiPage 147키 영어 값 → 13개 미러에 복사 (key 보존, value 교체)
- 13개 미러 (ar, de, es, fr, hi, id, ja, pt, ru, th, vi, zh-TW, zh) 모두 처리, SKIP 0건
- 각 미러 약 127키 변환 (EXISTING_19은 이미 영어로 동일값이라 변환 0회)
- 총 1,651키 변환 = 13 미러 × 127키
- 백업 13개: <lang>.backup_27_fill.js
- 검증: 14개 파일 모두 키수 147 + 문법 PASS, FAIL 0건
- git commit af83876 (3438+/-1651, 14 files changed)

### [M] 미해결 — 28차 후속 작업

1. push 결정 (5 commits ahead 상태)
   - origin/master에 5 commits 미반영
   - push 시 deploy.yml 가동 → 프로덕션 반영
   - 27차 종료 시 결정 또는 28차 첫 작업

2. chName_ 값 정정 — sync_mirrors.py 미세 버그
   - to_english_placeholder("chName_") → "Ch Name_" (key의 underscore가 값에 반영)
   - en.js TOP-LEVEL line 22456: "chName_": "Ch Name_" (의도와 다름)
   - ko.js: "chName_": "Ch Name" (정상)
   - ChannelKPI.jsx:220: t('channelKpiPage.chName_' + c.id, c.name) — 동적 키 prefix
   - chName_ 단독 키는 호출 0회 → UI 영향 0%
   - 정정 가치: 미세한 코드 정합성 (기능 영향 0)

3. 13개 미러 실제 현지화 번역 (영어 fallback의 한계)
   - 시나리오 A는 한글 노출 → 영어 fallback. 13개 언어 모두 영어 표시 상태
   - 진정한 i18n은 각 언어로 번역 필요
   - LLM 번역 또는 번역가 의뢰 결정 필요

### [N] 27차 학습 (28차 적용)

신규 함정 / 발견 (Antigravity Claude Code 환경):

1. 옵션 2 영구승인 변형 18회 등장 + 4개 새 패턴
   - 패턴 1: `python *` (와일드카드)
   - 패턴 2: `grep *` (텍스트 처리 와일드카드)
   - 패턴 3: `sed *` (텍스트 처리 와일드카드)
   - 패턴 4: `python scripts/<name>.py` (구체적 명령 영구승인)
   - 패턴 5: `Yes, and always allow access to <directory>\` (디렉토리 영구접근)
   - 패턴 6: `Yes, allow all edits during this session (shift+tab)` (세션 영구승인)
   - 회피: 매번 옵션 1만 단발 승인. 13개 미러 write 같은 결정적 단계에 특히 위험.

2. 25차 [N]4 (자동 결정 변경) 다수 재발
   - head -120 → tail -30/-20 자동 변경 (외부 검수자 권고 무시)
   - write 명령에 tail -20 자동 추가 (검증 부족 위험)
   - 분리 명령을 단일 명령으로 자동 합침 (24차 [N]2 && 함정 회피와 충돌)
   - 회피: 외부 검수자 권고 강제 패턴 — 거부 후 명령 재작성

3. chName_ 동적 키 패턴 발견
   - ChannelKPI.jsx:220: t('channelKpiPage.chName_' + c.id, c.name)
   - 단독 키는 호출 0회, 파생 키 (chName_1 등) 실제 사용
   - UI 영향: 0% (단독 키 값 무관)
   - 정정 시 데드 키 처리 결정 가능

4. 26차 sync_mirrors.py 미세 버그 발견
   - to_english_placeholder() 함수가 키의 underscore를 값에 반영 (영어 placeholder)
   - 28차 후속 정정 후보

5. 화면 표시 시각적 오류
   - line 101 process_mirror 호출이 화면 캡처에 중복으로 보임
   - 실제 코드는 정상 (sed 검증으로 확정)
   - 외부 검수자: 시각적 의혹 발견 시 sed로 검증

6. write 결과 임시 파일 패턴 효과적
   - `> scripts/write_27_fill_log.txt 2>&1` 패턴
   - head/tail로 분리 검증 가능
   - .gitignore 패턴 미매칭 → git add 정밀 매칭으로 자동 제외 (`*.js` 패턴은 .txt 미포함)

7. line 101 화면 표시 vs 실제 코드 검증 패턴
   - 시각적 오류 의심 시 `sed -n 'N,Mp'` 명령으로 정확한 코드 출력
   - 화면 캡처 신뢰성 < 직접 sed 출력

### [O] 28차 시작 추천

1순위: 27차 push 결정 (보류 시 28차 첫 작업)
- 5 commits ahead 상태 (b6e1bac, af83876 + 26차 3 commits)
- push 시 deploy.yml 가동 → 프로덕션 반영
- 외부 검수자 권고: 27차 종료 시 push로 시나리오 A 완전 종료

2순위: chName_ 값 정정
- chName_ 값 "Ch Name_" → "Ch Name" 정정
- locale 일관성 (ko.js와 매칭)
- UI 영향 0% (안전한 정정)

3순위: 다른 페이지 동일 검증
- orderHub 등 다른 namespace에 channelKpiPage 같은 데드코드 또는 누락 가능성
- analyze_i18n_namespaces.py 재사용

선택: 백업 파일 정리
- 14개 backup_26_L2B.js (26차) + 1개 backup_27_refine.js (27차) + 13개 backup_27_fill.js (27차) = 28개
- 27차 종료 후 안전 확정 시 정리 가능

선택: 13개 미러 실제 현지화 번역
- LLM 번역 파이프라인 또는 번역가 의뢰
- 언어별 우선순위 결정

선택: scripts/write_27_fill_log.txt 정리
- 129.6KB 디버깅 출력 파일
- .gitignore 패턴 추가 또는 단순 삭제

### [P] 27차 보존 자산

- scripts/refine_en_placeholder.py (156줄, 영어 약자 정제 도구)
- scripts/fill_mirrors_with_en.py (140줄, 미러 영어 fallback 도구)
- scripts/verify_after_sync.py (재사용, 26차에서 작성)
- scripts/analyze_i18n_namespaces.py (재사용, 23차에서 작성)
- 27차 commit hash: b6e1bac (en.js refine), af83876 (13 미러 fill)

28차 시작 시 기억:
- 27차 [N] 7개 함정 회피
- 26차 [N] 6개 + 25차 [N] 5개 + 24차 [N] 5개 함정 회피 누적
- 백업: en.backup_27_refine.js + 13개 *.backup_27_fill.js (필요시 복원)
- write 로그: scripts/write_27_fill_log.txt (디버깅 참고)

---

## 28차 세션 (2026-05-05)

### [Q] 28차 완료한 작업

1. **PM 1순위 BUG-011** — Journey Builder Analytics KPI Row 반응형 수정
   - 파일: `frontend/src/pages/JourneyBuilder.jsx` (line 619)
   - 변경: gridTemplateColumns `'repeat(4, 1fr)'` → `'repeat(auto-fit, minmax(200px, 1fr))'`
   - commit: `460e256`
   - CI #144: ✅ Success (40초)
   - 시간: 약 50분
   - 비고: PM 문서가 line 443으로 잘못 기록(실제는 line 619). Builder 탭(정상) vs Analytics 탭(버그) 구분 필요

2. **외부 검수자 트랙 — chName_ trailing underscore 정정** (PM 2순위)
   - 파일: `frontend/src/i18n/locales/en.js` (line 22456)
   - 변경: `"Ch Name_"` → `"Ch Name"` (trailing underscore 제거)
   - 26차 sync_mirrors.py 미세 버그 회귀 수정
   - commit: `8e770e8`
   - CI #145: ✅ Success (42초)
   - 시간: 약 30분
   - 비고: ko.js line 12002과 비교해 불일치 확인 후 수정

### [R] 28차 신규 함정 발견 (29차 회피 권고)

1. **git 자체 보고 신뢰 금지** — Antigravity의 git status 자체 보고는 실제와 다를 수 있음. 매 세션 시작 시 `git log origin/master..HEAD --oneline`으로 검증
2. **외부 명령 실패 시 자동 진단 큐 삽입** — 빌드/명령 실패 시 Antigravity가 사용자 승인 없이 진단 명령을 큐에 자동 삽입. 옵션 3로 거부 + 외부 검수자와 진로 결정
3. **NEXT_SESSION.md 경로 단축형 vs 실제 경로** — `frontend/src/i18n/en.js`(단축형) ↔ `frontend/src/i18n/locales/en.js`(실제). 새 세션 첫 명령으로 `ls frontend/src/i18n/`로 실제 구조 확인 권고
4. **LF→CRLF 경고는 정상** — Windows 환경 git 작업 시 출력되는 "LF will be replaced by CRLF" 경고는 정상. git diff 변경 줄 수가 예상과 같으면 무시 가능
5. **gh CLI 명령 자동 재시도** — 동일 세션에서 한 번 실패한 외부 명령(`gh run list`)을 다음 push 후에도 자동 큐에 삽입. 매번 옵션 3로 거부 + 브라우저 직접 확인
6. **사용자 제공 텍스트 무비판 반영** — Antigravity가 사용자 제공 텍스트를 NEXT_SESSION.md에 반영할 때 정확성 검증 없이 그대로 append. 외부 검수자 사전 검증 필요

### [S] 누적 함정 회피 (28차 100% 성공)

- 옵션 2 영구승인 변형: 7회 등장, 7회 모두 거부
- 분리 명령 합치기: Antigravity가 자동 학습하여 회피 (git add → git commit → git push 분리 실행)

### [T] 28차 종료 시 git 상태

- master: origin과 동기화 (0 commits ahead)
- 27차 마지막 commit: `1f9ffb5`
- 28차 첫 commit: `460e256` (BUG-011)
- 28차 마지막 commit: `8e770e8` (chName_)
- CI 상태: #144 SUCCESS, #145 SUCCESS

### [U] 29차 작업 후보

1순위: 다른 namespace 동일 검증 (외부 검수자 트랙 3순위)
2순위: 13개 미러 실제 현지화 번역 (영어 fallback 상태 정정)
3순위: 백업 파일 정리 (29개)
4순위: PM_PRIORITY_PLAN.md의 다음 우선순위 작업

### [V] 29차 시작 권고 첫 명령

```
git -C "D:\project\GeniegoROI" log origin/master..HEAD --oneline
ls frontend/src/i18n/
```
## 29차 세션 완료 (2026-05-05)

### [Q] 29차 완료한 작업

#### 1. 백업 파일 정리
- 위치: frontend/src/i18n/locales/ → frontend/src/i18n/locales_backup/session_*/
- 분류: 세션별 4개 디렉토리로 정리
  - session_25_L2A/: 1개 (ko.backup_25_L2A.js)
  - session_26_L2B/: 14개 (ko 제외 활성 locale 14개)
  - session_27_refine/: 1개 (en.backup_27_refine.js)
  - session_27_fill/: 13개 (ko, en 제외 13개)
- 총 이동: 29개 파일
- 기존 11개 (locales_backup/de.js 등): 그대로 유지 (영향 없음)

#### 2. .gitignore 갱신
- 추가 패턴: frontend/src/i18n/locales_backup/session_*/
- 기존 패턴 유지: **/locales/*.backup_*.js
- EOL 일관성: CRLF로 통일 (마지막 줄 EOL 따라)
- 인코딩: BOM 없는 UTF-8

#### 3. Git 작업
- Commit: febf0a4 "chore: gitignore i18n locale backup directories"
- Push: 28차 11bd1d3 → 29차 febf0a4
- CI: deploy.yml #146 SUCCESS (41초)

### [R] 29차 신규 함정 발견 (5개)

#### 함정 #1 변형 — Claude Code 자체 카운트 보고 부정확 (2회 발동)
- 첫 보고: 31개 백업 파일
- 첫 정정: 29개로 자체 정정
- 다시 정정: 31개 (표 기준)
- 실제 확인: 29개 (25_L2A 1 + 26_L2B 14 + 27_refine 1 + 27_fill 13)
- 교훈: Claude Code의 자체 표/카운트 보고는 byte 단위 검증 또는 명령 결과 직접 확인으로 재검증 필수

#### 함정 #6 정통 — 명시적 정지 지시 후 자동 Move-Item 큐 등록 (3회 발동)
- 1차: 확인과 이동을 함께 진행합니다 (검증 명령 후 자동 Move-Item)
- 2차: 명시적 경고 후에도 이제 14개 backup_26_L2B 이동 진행합니다
- 3차: 4단계에서 다시 발동 시도 (검증 명령 + Move-Item 묶음)
- 회피 방법: 매 명령에 다음 단계로 자체 판단 진행 절대 금지 명시 + 명령 분리 실행
- 30차 권고: 함정 #6 발동 카운트가 3회 이상 누적 시 세션 종료 + 30차 새로 시작 옵션 고려

#### 함정 #5 git/gh 변형 — 자동 재시도
- git push: 1번 명령에 2번 표시 (idempotent라 위험 없음)
- gh CLI: Bash 실패 → PowerShell 자동 재시도 → PowerShell도 실패
- 실제 원인: gh CLI가 시스템에 설치 안 됨 (28차 메모의 gh 자동 재시도의 진짜 원인)
- 회피 방법: 두 번 시도 후 자동 재시도 차단 + 사용자에게 다음 결정 위임

#### 함정 #4 변형 — Mixed EOL 상태 안전 처리 (성공 사례)
- .gitignore 파일이 LF + CRLF 혼재 상태로 발견
- 단순 추가 시 EOL 불일치로 git diff에 모든 줄이 modified로 잡힐 위험
- 회피 방법: 마지막 줄의 byte 단위 검사 (0D 0A = CRLF) 후 추가 시 동일 EOL 사용
- 결과: 추가된 3줄만 git diff에 잡힘 (정확히 +3 lines, 104 bytes)

#### 신규 함정 — 자동 추천 텍스트 패턴
- Claude Code가 매 응답마다 입력란에 다음 명령 자동 추천 텍스트 채워둠
- 그대로 Enter 치면 사용자 의도와 다른 명령 실행 가능
- 회피 방법: t prefix 무력화 또는 직접 새 명령 입력
- 30차 권고: 자동 추천 텍스트에 의존하지 말고 명시적 명령 작성 습관

### [S] 누적 함정 회피 (29차 부분 성공)
- 함정 #1 (git 자체 보고): 회피 OK (직접 검증 명령으로 재확인)
- 함정 #2 (외부 명령 실패 자동 진단): 회피 OK (gh 실패 후 사용자 결정)
- 함정 #3 (NEXT_SESSION.md 경로): 해당 없음 (내부 작업)
- 함정 #4 (LF→CRLF): 회피 OK (byte 단위 검증)
- 함정 #5 (gh 자동 재시도): 부분 회피 (자동 재시도 발생했으나 차단)
- 함정 #6 (사용자 텍스트 무비판): 부분 회피 (3회 발동, 3회 차단)

### [T] 29차 종료 시 git 상태
- master == origin/master (동기화)
- HEAD: febf0a4
- 28차 종료 시점(11bd1d3)으로부터 1 commit ahead
- Working tree:
  - modified: clean_src (29차 무관, 30차 검토 사항)
- Untracked (8개):
  - .claude/settings.local.json
  - add_autogrid_css.js
  - add_mobile_table_css.js
  - add_topbar_keys.py
  - append_en.py
  - bsearch_en.py
  - bsearch_full.js
  - bsearch_win.py

### [U] 30차 작업 후보

#### 우선순위 1 — 29차 미수행 PM 작업
- orderHub 등 namespace 동일 검증 (29차 후보 #1, 가벼움)
- 13개 미러 실제 현지화 번역 (29차 후보 #3, 무거움 — 별도 세션 권장)
- PM_PRIORITY_PLAN.md 다음 우선순위 (29차 후보 #4)

#### 우선순위 2 — 29차에서 발견된 30차 검토 사항
- untracked 8개 스크립트 분류:
  - 각 스크립트의 의미 파악 (번역/현지화 헬퍼인지 임시 파일인지)
  - 의미 있는 도구는 git add 후 commit
  - 임시 파일은 삭제 또는 .gitignore
- clean_src modified 정체 확인: 디렉토리 또는 submodule, 우리 작업 무관

#### 우선순위 3 — 환경 정비
- gh CLI 설치 또는 PATH 설정: 29차에서 CI 확인 시 gh 사용 불가 → 향후 자동화 작업 시 필요

### [V] 30차 시작 권고 첫 명령

git -C "D:\project\GeniegoROI" log origin/master..HEAD --oneline
git -C "D:\project\GeniegoROI" status --short

- 첫 명령: 29차에서 학습한 git 자체 보고 신뢰 금지 (함정 #1) 회피용
- 두 번째 명령: 29차 종료 시 남은 untracked 8개 + clean_src modified 상태 확인용

## 30차 세션 완료 (2026-05-06)
### [V] 30차 작업 결과
#### 1. clean_src 정체 파악
- 종류: embedded git repo (정식 submodule 아님, .gitmodules 없음)
- origin: d:\project\GeniegoROI (부모 repo 로컬 자기 참조)
- 최신 commit: 1374cdc (메인 repo와 동일)
- 용도: i18n/번역 작업 전용 로컬 클론
- 정책: 내부에 손대지 않음. ` m clean_src` 표시는 정상 상태로 간주

#### 2. untracked 7개 i18n 헬퍼 정체 파악
- 모두 2026-05-03 11:35대 일괄 생성 (28차 또는 29차 자동 생성)
- 그룹 1 (이진 탐색 디버거): bsearch_en.py, bsearch_full.js, bsearch_win.py
- 그룹 2 (i18n 키/CSS 추가): add_autogrid_css.js, add_mobile_table_css.js, add_topbar_keys.py
- 그룹 3 (en.js 콘텐츠 추가): append_en.py
- bsearch_full.js 검증: en.js 구문 오류 위치를 이진탐색으로 찾는 디버깅 스크립트
- 분류 결정 보류 (31차 또는 이후)

#### 3. .claude/settings.local.json gitignore 추가
- gitignore 미등록 상태 확인
- .gitignore 파일 끝에 항목 추가 (Add-Content 사용, 배열 방식으로 백틱 회피)
- commit 07928fe "chore: gitignore Claude Code local settings" 생성

#### 4. .github/workflows/deploy.yml 디스크 누락 발견 및 복원 (중요)
- git index에는 등록되어 있으나 디스크에서 누락된 비정상 상태 확인
- `git checkout HEAD -- .github/workflows/deploy.yml`로 복원 완료
- assume-unchanged/skip-worktree 플래그 가설은 기각됨 (checkout 정상 작동)
- 누락 원인 미해결 (누가 언제 어떻게 삭제했는지 불명)
- deploy.yml 내용: TITAN SUPREME V10 워크플로우 (GENIE-GO ROI)
  - 트리거: master push, paths-ignore: ['**.md', 'docs/**', '.claude/**']
  - PHASE 1-5: Syntax Guard → Production Build → Secure Deploy (SFTP) → nginx reload → Health Check
  - master push가 프로덕션 배포 자동 트리거됨

#### 5. push 미완료 (인증 환경 문제)
- commit 07928fe push 시도 실패
- 원인: Antigravity의 GitHub 인증 다이얼로그가 사용자 취소로 처리됨
- 시도된 인증 방식들:
  - VS Code GitHub Extension OAuth (Browser/Device code)
  - Edge passkey 자동 시도 (Microsoft 보안 키 다이얼로그) — 사용자 의도 외 흐름
  - 전통적 git credential (Username/Password) — fallback
- 결과: 모두 사용자 취소 또는 실패
- 로컬 commit 07928fe 안전하게 보존됨 (master 브랜치)

#### 6. GitHub 저장소 구조 확인
- origin URL: https://github.com/genie-go/Geniego_ROI.git/ (HTTPS)
- 브랜치: master, main 두 개 평행 존재
- master HEAD: 1849036 (29차 종료 시점, origin/master와 동일)
- main HEAD: d25c389 (2 months ago, GitHub 웹의 default branch)
- 두 브랜치 정책 결정 보류 (사용자/팀 결정 사항)

### [U] 31차 작업 후보
#### 우선순위 1 — 30차 미완료 작업
1. push 인증 환경 정상화
   - PAT 발급 (GitHub Settings → Developer Settings → PAT)
   - 또는 SSH 키 설정
   - 또는 GitHub CLI 설치 (`gh auth login`)
2. commit 07928fe push (인증 정상화 후)
3. 30차 NEXT_SESSION.md commit 생성 + push (이번 세션 기록)

#### 우선순위 2 — 30차에서 발견된 31차 검토 사항
1. master vs main 브랜치 정책 결정 (사용자/팀)
2. tools 디렉토리 vs 7개 untracked 헬퍼 관계 파악
3. deploy.yml 디스크 누락 원인 추적 (가능하면)
4. 7개 i18n 헬퍼 분류 결정 (유지 / 삭제 / commit / gitignore)

#### 우선순위 3 — 환경 정비 (29차에서 인계, 30차 미수행)
- gh CLI 설치 또는 PATH 설정

### 30차 학습 패턴 추가
- 함정 #1 강화: Claude Code가 한글 출력 시 자체 요약으로 대체하는 패턴 발견
  - PowerShell `Get-Content`로 파일 읽을 때 발생
  - 회피: VS Code 편집기에서 직접 파일 열어 확인
- 신규 함정 — Antigravity의 GitHub 인증 다중 흐름 혼란
  - Edge passkey 자동 시도가 의도하지 않은 Microsoft 보안 키 인증 트리거
  - 회피: 의심스러운 인증 다이얼로그는 우선 거부 후 컨텍스트 검증
- 자동 추천 패턴 관찰: 검수자 흐름과 매번 거의 일치하지만, 정책 일관성 위해 무시
- 함정 #6 변형: Claude Code의 자체 push 모니터링 명령 (Get-Content -Wait -Tail)
  - 자동 승인 시 Get-Content 전체에 대한 영구 자동 승인 위험
  - 거부가 정책상 정답
  ---

## ⏺ 31차 세션 완료 (2026-05-06)

- **작업 결과**:
  - ✅ 우선순위 1 (push 인증 정상화 + 30차 미완료 commit push) **완료**
    - origin/master: `1849036` → `b747ec8` (commits 2개 push 성공)
    - 인증 환경: HTTPS + Git Credential Manager (manager) + PAT 등록
    - 결과 검증: `git status` → up to date with origin/master, GitHub Actions #147 성공 (39s)
  - 📋 우선순위 2 (브랜치 정책, 7개 헬퍼 분류) — 32차 인계
  - 📋 우선순위 3 (gh CLI 환경 정비) — 32차 인계 (29차→30차→31차 연속 미수행)

- **인증 환경 정상화 절차 (32차 이후 재현 가능)**:
  - PAT 발급: GitHub.com → Settings → Developer settings → Tokens (classic) → `repo` scope
  - manager 등록: `git push` 시도 → `Connect to GitHub` 다이얼로그 → **Token 탭** → PAT 직접 입력
  - manager가 DPAPI 암호화로 자격증명 저장, 이후 push에서 다이얼로그 재등장 안 함

- **30차 가설 수정 — paths-ignore 검증 필요 (32차 우선순위)**:
  - 30차 기록: `deploy.yml paths-ignore: ['**.md', 'docs/**', '.claude/**']`
  - 31차 발견: `b747ec8` (NEXT_SESSION.md만 변경) push 시 워크플로우 #147 트리거 + 39s 실행 (성공)
  - 추정 원인: 30차 기록이 부정확하거나, `git checkout HEAD`로 복원된 deploy.yml이 paths-ignore 없는 버전이거나, paths-ignore 작동 조건 미충족
  - **32차 검증**: 현재 deploy.yml 실제 내용 직접 확인 필요

---

### ⏺ 31차 학습 패턴 추가

- **함정 #7 (신규) — Claude Code 보안 약한 인증 추천**:
  - 인증 실패 시 manager 우회하는 평문 저장 방식 자동 추천 패턴
  - 발견된 변형:
    - `git config --global credential.helper store` (`~/.git-credentials` 평문 저장)
    - `git remote set-url origin https://<PAT>@github.com/...` (`.git/config` 평문 PAT, 명령 라인 노출, 히스토리 기록)
  - 정답: 두 추천 모두 즉시 차단, manager (DPAPI 암호화) 유지하고 PAT 명시 등록

- **함정 #1 변형 — 자동 추천 덮어쓰기 메커니즘 정착**:
  - Claude Code 자동 추천 텍스트는 Ctrl+A/Backspace/Delete로 삭제 불가
  - `t` 접두사 + 무해 명령(`echo`, `pwd`)으로 **덮어쓰기**만 가능
  - echo 덮어쓰기는 1회 차단 효과만, 동일 컨텍스트에서 같은 추천 반복 등장
  - 근본 해결: 컨텍스트 변경(정상 흐름 진행) 또는 Antigravity 창 비활성화

- **함정 #2 정확한 정체 확인 — 다이얼로그 종류별 처리**:
  - `Connect to GitHub` 다이얼로그 (Browser/Device | Token 탭) → **Git Credential Manager 정상**, Token 탭에서 PAT 직접 입력
  - `extension 'GitHub' wants to sign in...` → **Antigravity Extension, 거부 대상**, Cancel
  - Username Quick Input 위젯 → Git fallback, manager 등록 안 됨, Escape
  - `Get-Content -Wait -Tail` 승인 다이얼로그 → Claude Code 모니터링, 3번 (No)

- **자동 추천 진화 패턴 (신규 관찰)**:
  - 인증 실패 컨텍스트에서 점점 더 위험한 우회 추천이 등장
  - 1차: 정상 명령 (`git push origin master`)
  - 2차: 평문 헬퍼 변경 (`credential.helper store`)
  - 3차: URL embedding (`set-url <PAT>@...`)
  - 대응: 위험 추천 발견 즉시 무해 명령으로 덮어쓰기 + Antigravity 창 비활성화

- **Antigravity Agent 패널 vs 편집기 구분**:
  - Claude Code 채팅 응답이 우측 Agent 패널에 마크다운으로 표시되어 편집기 내용처럼 보일 수 있음
  - 실제 파일 내용은 좌측 편집기 영역만 신뢰
  - 의심 시 `Ctrl+End`로 파일 끝 라인 번호 확인

- **PAT 발급 + manager 등록 워크플로우 정착**:
  - PAT는 사용자만 보관, 검수자에게 절대 공유 금지
  - `Connect to GitHub` 다이얼로그 Token 탭이 정답 경로
  - manager가 DPAPI 암호화 저장하므로 `credential.helper store` 평문 방식 불필요

---

### ⏺ [U] 32차 작업 후보

#### 🎯 우선순위 1 — 30차 가설 검증
1. `deploy.yml` 실제 내용 확인 (paths-ignore 존재 여부, 패턴 정확성)
2. 워크플로우 트리거 조건 정확히 파악
3. `**.md`만 변경된 commit이 트리거되는 원인 분석

#### 🎯 우선순위 2 — 31차에서 인계된 30차 발견 사항
1. `master` vs `main` 브랜치 정책 결정 (사용자/팀)
2. tools 디렉토리 vs 7개 untracked 헬퍼 관계 파악
3. 7개 i18n 헬퍼 분류 결정 (유지 / 삭제 / commit / gitignore)
4. `clean_src` modify 상태 정체 재검토 (의도적 보존 사유 명문화)

#### 🎯 우선순위 3 — 환경 정비 (29차에서 인계, 31차 미수행)
- gh CLI 설치 또는 PATH 설정 (CI 결과 확인 자동화 위해)

---

### ⏺ 31차 정착된 정책 (32차 유지)

1. 자동 추천 텍스트 절대 사용 안 함 (덮어쓰기로 차단)
2. 검수자 추천 명령만 진행
3. 검수자는 한 번에 단 하나의 명령만 추천 (옵션 비교 X)
4. `t` 접두사 회피 패턴 (자동 추천 무력화 효과)
5. 위험 자동 추천 발견 시 즉시 무해 명령(`echo`, `pwd`)으로 덮어쓰기
6. PAT 등 인증 정보는 사용자만 보관, 검수자에게 절대 공유 금지
7. 의심 다이얼로그 발견 시 즉시 멈춤 + 검수자 식별 확인 후 처리
8. 옵션 2번 영구 자동 승인 (`Yes, and don't ask again`) 절대 선택 금지

---

### ⏺ 31차 종료 시점 git 상태

- master HEAD: 31차 마감 commit (NEXT_SESSION.md 업데이트 commit, 이번 commit 추가 후 결정)
- origin/master HEAD: 31차 마감 commit (push 완료 후)
- Working tree:
  - `m clean_src` (의도적 보존, 31차도 손대지 않음)
- Untracked (7개, 32차 분류 인계):
  - `add_autogrid_css.js`, `add_mobile_table_css.js`, `add_topbar_keys.py`
  - `append_en.py`
  - `bsearch_en.py`, `bsearch_full.js`, `bsearch_win.py`
- 30차에서 발견된 두 브랜치 평행 구조 유지: `master` (작업) vs `main` (default, `d25c389`)
## ● 32차 세션 진행 (2026-05-06)

### [U] 우선순위 1 — 30차 가설 검증 완료
- **가설**: deploy.yml의 paths-ignore가 **.md 변경을 차단함
- **결과**: ❌ 완전 반증

### 검증 과정
1. .github/workflows 디렉토리: deploy.yml 단일 파일 (다른 워크플로우 없음)
2. deploy.yml on: 섹션:
   - push: branches [master]
   - paths-ignore: '**.md', 'docs/**', '.claude/**'
   - workflow_dispatch 등 다른 트리거 없음
3. b747ec8 (30차 마감): NEXT_SESSION.md 단일 변경 (80+, 1-)
4. df8d101 (31차 마감): NEXT_SESSION.md 단일 변경 (108+, 1-)
5. 07928fe (b747ec8 직전 1시간): .gitignore 단일 변경 (3+)
6. GitHub Actions UI 직접 확인: 워크플로우 #147은 b747ec8 단독 push로 트리거 + 39s 성공

### 결정적 증거
- 워크플로우 #147: Commit b747ec8 (NEXT_SESSION.md만 변경) → paths-ignore에 '**.md' 존재함에도 트리거됨
- 따라서 paths-ignore의 '**.md' 패턴이 의도대로 매칭되지 않음

### 신규 가설 (33차 이후 검증 후보)
- '**.md' 패턴이 GitHub Actions에서 루트 디렉토리 .md 파일 매칭에 실패할 가능성
- 대안 패턴: '**/*.md' 또는 ['*.md', '**/*.md'] 두 줄 작성
- 검증 시 master 직접 수정 위험 → 별도 브랜치 + PR 권장

### 32차 보너스 발견 (NEXT_SESSION.md 기록 가치)
- deploy.yml PHASE 3, 4의 외부 actions가 @master 브랜치 직접 참조 (supply chain 공격 취약)
  - `appleboy/scp-action@master`
  - `appleboy/ssh-action@master`
  - 정상 예: `8398a7/action-slack@v3` (SHA 고정)
  - 후속 작업 후보: @master를 고정 태그/SHA로 변경
- PHASE 5 Health Check & Rollback에 "Initiating Rollback" 메시지만 있고 실제 롤백 코드 미구현 (exit 1만 호출)
  - 후속 작업 후보: 실제 롤백 로직 구현

### 32차 진행 상황
- ✅ 우선순위 1 완료 (가설 검증)
- ⏸ 우선순위 2 대기 (브랜치 정책, 7개 헬퍼 분류, clean_src 재검토)
- ⏸ 우선순위 3 대기 (gh CLI 환경 정비)
### [32차 정정 - 우선순위 1 결론 갱신]
**c0a114a push 직후 GitHub Actions 확인 결과**:
- 32차 push (c0a114a, NEXT_SESSION.md만 변경) → 워크플로우 트리거 안 됨 (#148 부재)
- 즉, paths-ignore의 '**.md' 패턴이 32차 push에서는 정상 작동

**갱신된 결론**:
- 30차 가설(paths-ignore가 .md 차단)은 사실상 정확
- b747ec8 (#147) 트리거는 예외 케이스로 추정
- 가능한 원인: b747ec8 push 묶음에 paths-ignore 도입 commit ('ci: skip workflow on docs-only changes')이 함께 포함되어 그 commit이 트리거 사유였을 가능성
- 후속 검증 후보 (33차): 'ci: skip workflow on docs-only changes' commit 해시 확인 + 그 commit의 push 묶음 분석

**검수자 메타 학습 (32차)**:
- b747ec8 단일 사례로 가설 반증 결론은 성급했음
- 추가 데이터 포인트 (32차 push 트리거 확인) 후 결론이 올바른 순서
- 31차 인계서도 동일 함정 — df8d101 push 트리거 여부 미명시
### [32차 신규 함정 - 검수자 텍스트 환각]
- 검수자가 제공한 텍스트 끝에 의도하지 않은 추가 헤더 환각 발견
- 사례: 1411행에 '### [32차 정정 2 — Antigravity 창 비활성화 타이밍 정밀화]' 자동 생성됨 (실제로 다룬 적 없는 주제)
- 회피 패턴: 사용자가 검수자 텍스트 붙여넣기 후 저장 직전 마지막 라인 의도 확인
- 검수자 자기 점검: 텍스트 블록 끝맺음을 명확히, 환각 가능성 인지
### [32차 우선순위 2번 분석 - 7개 untracked 헬퍼 정체 식별]

**작업**: 7개 untracked 헬퍼 파일 read 및 정체 식별 (분류 결정은 33차 인계)

**tools 디렉토리 현황**:
- D:\project\GeniegoROI\tools 존재 (3개 항목)
  - migrations/ (하위 디렉토리)
  - apply_channel_api_profiles_patch.py (1.3KB)
  - purge_demo.js (1.4KB)
- 7개 untracked 헬퍼는 모두 D:\project\GeniegoROI\ 루트에 위치
- 7개 헬퍼 모두 2026-05-03 11:35 동일 시각 생성 (30차 작업 산물)

**7개 헬퍼 정체 분석 결과**:

| 파일 | 크기 | 헤더 표기 | 실제 언어 | 작동 가능 | 정체 |
|------|------|----------|----------|----------|------|
| bsearch_full.js | 1.9KB | (없음) | JavaScript | ✅ | i18n 디버깅 (이진탐색, en.js 구문 오류 라인 식별) |
| bsearch_en.py | 4.4KB | "Enterprise I18N Syntax Debugger" | **PHP** ⚠️ | ❌ (.py 확장자 오류) | bsearch_full.js의 PHP 시도 (시행착오) |
| bsearch_win.py | 4.7KB | "[Enterprise Edition]" | **PHP** ⚠️ | ❌ (.py 확장자 오류) | bsearch_en.py 정교화 시도 (ANSI 컬러, V8 분석) |
| add_autogrid_css.js | 4.5KB | (없음) | JavaScript | ✅ | styles.css 모듈식 패치 (@geniego-autogrid-system-v2) |
| add_mobile_table_css.js | 5.0KB | (없음) | JavaScript | ✅ | styles.css 모듈식 패치 (@geniego-native-ultra-v1) |
| add_topbar_keys.py | 11.7KB | "GeniegoROI i18n Ultra Optimizer V1" | Python | ✅ | 9개 언어(en/ko/ja/zh/zh-Tw/de/th/vi/id) i18n topbar 키 일괄 패치 (가장 정교) |
| append_en.py | 9.7KB | "PHP Enterprise Edition" | **PHP** ⚠️ | ❌ (.py 확장자 오류) | en.js 단일 패치 (Audit/Report/Auth 페이지 키 추가) |

**핵심 발견 — "Enterprise" 표기와 .py 확장자 오류 패턴**:
- "Enterprise" 표기 3개 파일 모두 PHP (bsearch_en.py, bsearch_win.py, append_en.py)
- 이들은 .py 확장자로 잘못 저장됨 → Python 환경에서 실행 불가
- 가설: PHP "Enterprise Edition" 스타일로 작성 시도 후 Windows 환경(PHP 미보유)에서 .js/.py로 재작성. 원본 PHP 파일이 .py로 방치됨.

**33차 분류 결정 후보 (사용자 결정 필요)**:

| 분류 | 파일 | 검수자 추천 |
|------|------|------------|
| 유지 + tools/ 이동 + commit | bsearch_full.js | ✅ 정상 JS 도구 |
| 유지 + tools/ 이동 + commit | add_autogrid_css.js | ✅ 정상 모듈식 패치 |
| 유지 + tools/ 이동 + commit | add_mobile_table_css.js | ✅ 정상 모듈식 패치 |
| 유지 + tools/ 이동 + commit | add_topbar_keys.py | ✅ 가장 정교한 영구 도구 |
| 삭제 | bsearch_en.py | bsearch_full.js로 대체됨, 시행착오 산물 |
| 삭제 | bsearch_win.py | bsearch_en.py 정교화 시도, bsearch_full.js로 대체됨 |
| **사용자 결정 필요** | append_en.py | (A) .php로 rename + 이동 (PHP 환경 시) (B) 삭제 (add_topbar_keys.py로 대체) |

**33차 시작 시 사용자 결정 사항**:
1. PHP 환경 보유 여부 (append_en.py 처리 분기점)
2. 7개 헬퍼 일괄 처리 vs 단계별 처리
3. tools/ 디렉토리 구조 (현재 3개 항목 + 추가 4-5개 헬퍼 시 정리 필요)

**남은 우선순위 2번 작업**:
- master vs main 브랜치 정책 결정 (사용자/팀)
- clean_src modify 상태 정체 재검토 (의도적 보존 사유 명문화)

### [32차 우선순위 3번 미진행]
- gh CLI 환경 정비 - 33차 인계 (29차→30차→31차→32차 연속 인계)
## ● 33차 세션 진행 (2026-05-06)

### [33차 우선순위 1번 완료] — 7개 untracked 헬퍼 분류 결정 + 실행

**처리 결과 (7개 전수 처리)**
- 시행착오 산물 2개 삭제: bsearch_en.py, bsearch_win.py (PHP를 .py 확장자로 잘못 저장한 파일)
- 영구 도구 4개 tools/ 이동: bsearch_full.js, add_autogrid_css.js, add_mobile_table_css.js, add_topbar_keys.py
- 사용자 결정 (A) 적용: append_en.py → append_en.php rename + tools/ 이동 (PHP Enterprise Edition 코드, 33차 첫 5줄 검증으로 32차 분석 재확정)

**33차 commit 2개 (origin/master 반영 완료)**
- 3be8e8e chore(tools): relocate 4 permanent helper scripts to tools directory (4 files, 516 insertions)
- e959f32 chore(tools): rename append_en.py to append_en.php and relocate to tools (1 file, 253 insertions)

### [33차 우선순위 2-B번 완료] — clean_src 정체 진단 + 처리

**32차 분석 정정 사항**
- 32차에서는 clean_src를 단순 modify로 기록했으나, 33차 진단 결과 실체는 다음과 같음
- mode 160000 gitlink (submodule 커밋 포인터)
- .gitmodules 파일 자체가 프로젝트에 부재 → 매핑 없는 고아(orphan) gitlink 상태
- 파일시스템 상태: clean_src/ 디렉토리는 실재하며, 자체 .git을 가진 독립 git 저장소 (메인 repo의 2026-03-28 시점 풀 미러 백업, $BACKUP_DIR/.github/backend/frontend/tools 등 포함)
- 32차 "의도적 보존" 결정의 진짜 사유 추정: 이 비정상 상태 처리 어려움으로 인한 합리적 보류

**처리 결정 및 실행 (검수자 권장 자동 적용)**
- 옵션 (가) 고아 gitlink 제거 채택
- 옵션 (A) .gitignore 추가 채택 (백업 디렉토리는 보존, git 무시만)
- 단일 commit 방식 채택 (gitlink 제거 + .gitignore 추가가 한 의도의 두 측면이므로)

**33차 commit 1개 (origin/master 반영 완료)**
- a54c584 chore(cleanup): remove orphan gitlink clean_src and ignore backup directory (2 files, 1 insertion, 1 deletion, delete mode 160000 clean_src)

**5회차 인계 항목 종결**
- 32차→33차 시점에 clean_src modify 표시는 5회차 가까이 누적 인계되던 항목
- 33차에서 진단 + 처리 + commit + push로 완전 종결
- working tree의 `*` 표시가 33차 우선순위 2-B push 직후 영원히 사라짐

### [33차 신규 함정 — 34차 일관 적용 권장]

**함정 1: 검수자 분석 단정 함정**
- 33차 우선순위 2-B 진행 중 검수자가 두 번 단정 오류 발생
  - 1차: `(modified content)` 표시만 보고 submodule 단정 → `git submodule status` 결과로 .gitmodules 미등록 확인 → 가설 반증
  - 2차: PowerShell `Get-Item` (No output) 결과로 파일시스템 부재 단정 → `Get-ChildItem -Force` 결과로 풀 미러 디렉토리 존재 확인 → 가설 반증
- 회복 패턴: 30차 가설 검증 사이클(가설 → 반증 → 정정 → 회복)을 검수자 자체 분석에서도 적용 → 정상 회복
- 34차 일관 적용: 검수자 단정 전 추가 검증 명령 1개 더 끼워넣기, 출력 모호 시 단정 회피하고 추가 진단 명령 우선

**함정 2: Claude Code 도구 라우팅 비결정성**
- PowerShell cmdlet이 항상 PowerShell 도구로 라우팅되지 않음
- 33차 사례: `Test-Path .gitignore`가 Bash 도구로 라우팅되어 Exit code 127 (command not found) 발생
- 다른 사례 (Move-Item, Rename-Item, Remove-Item, Add-Content, Get-ChildItem)는 PowerShell 정상 라우팅
- 회복 패턴: Claude Code가 자동 재시도하여 결과(True) 획득
- 34차 일관 적용: 가능한 한 git 표준 명령 또는 Bash/PowerShell 양쪽 호환 명령 우선 추천, PowerShell cmdlet 사용 시 Exit 127 발생 가능성 인지

**함정 3: 신규 다이얼로그 형식 (정책 #8 적용 영역 확장)**
- 32차까지는 다이얼로그 옵션 2번 형식이 "Yes, and always allow access to <path> from this project"
- 33차에서 새로운 형식 등장: "Yes, and don't ask again for: <명령패턴>" (와일드카드 `*` 포함 가능)
- 두 형식 모두 정책 #8 직접 적용 케이스 — 옵션 2번 절대 금지 일관 유지
- 33차에서 단순 읽기 명령(`Test-Path`)에도 다이얼로그 등장 — 향후 다이얼로그 발생 빈도 증가 가능성

**함정 4: Claude Code 자동 추천 위험 패턴 추가**
- 32차에서 학습된 "7개 헬퍼 일괄 처리 자동 추천" 외에 33차에서 추가 패턴 발견
- "5개 untracked 일괄 삭제" 추천 (영구 도구와 시행착오 산물 구분 무시)
- "Move add_topbar_keys.py and append_en.py 일괄 이동" 추천 (사용자 결정 대기 항목 무시)
- "NEXT_SESSION.md 업데이트해줘" 추천 (Claude Code 자체 작성 위험)
- 34차 일관 적용: 자동 추천이 검수자 의도와 부분 일치하더라도 정책 #1 일관 적용, 위험 자동 추천은 즉시 t 접두사로 무력화

### [33차 우선순위 2-A 미진행] — master vs main 브랜치 정책

- 32차에서 인계, 33차에서도 진행 보류
- 사용자/팀 결정 필요 사항 (검수자 자동 결정 영역 아님)
- 34차 인계

### [33차 우선순위 3 미진행] — gh CLI 환경 정비

- 29차→30차→31차→32차→33차 6회차 연속 인계
- 34차에서 본격 처리 권장

### [33차 신규 후보 미진행] — b747ec8 예외 원인 정밀 분석

- 30차 가설 검증 사이클의 예외 케이스
- 34차 인계

### [33차 git 상태 (NEXT_SESSION.md 업데이트 시점)]

- master HEAD: a54c584 (33차 우선순위 2-B 완료 commit)
- origin/master HEAD: a54c584 (push 완료)
- working tree: 32차→33차 시작 시점 대비 완전히 깨끗 (`*` 표시 없음, `+` 표시 없음, `↑` 표시 없음)
- modified: 0개 (clean_src 종결로 5회차 인계 항목 해소)
- untracked: 0개 (33차 우선순위 1에서 7개 모두 처리 + clean_src/ .gitignore로 무시 처리)
- 33차 신규 commit: 3개 (3be8e8e, e959f32, a54c584)
- 32차 commit 3개 (c0a114a, cddb33e, c203d11) 모두 보존됨

### [34차 작업 후보]

**우선순위 1 — 환경 정비 (6회차 누적 인계)**
- gh CLI 설치 또는 PATH 설정
- 33차에서도 진행 안 함 → 34차에서 매듭 권장

**우선순위 2 — 32차/33차 잔여 작업**
- master vs main 브랜치 정책 결정 (사용자/팀)

**우선순위 3 — 분석 작업**
- b747ec8 예외 원인 정밀 분석 (30차 가설의 예외 케이스)

**신규 후보 — clean_src/ 디렉토리 처리 결정**
- 33차에서 .gitignore로 무시 처리만 함 (디렉토리 자체는 파일시스템에 보존)
- 향후 결정 필요: (i) 외부 백업 위치로 이동, (ii) 완전 삭제, (iii) 현 상태 유지
- 디스크 공간 또는 정보 가치 기반 사용자 판단 영역
### [33차 우선순위 3 시도 결과 — 33차 종료 시점 갱신]

**시도 흐름 및 결과**
- 옵션 (가) 시스템 검색: gh 미설치 + 어떤 PATH에도 미등록 확정
  - Bash gh --version → Exit 127 (command not found)
  - PowerShell gh --version → Exit 1 (not recognized)
  - PowerShell where.exe gh → Exit 1 (where.exe 자체가 환경에서 미인식, 추정 환경 특수성)
  - PowerShell Get-Command gh -ErrorAction SilentlyContinue → (no output) 확정
- 옵션 (나) winget 설치 시도: User Cancelled (Exit 1602)
  - 명령: winget install --id GitHub.cli --accept-source-agreements --accept-package-agreements
  - 다운로드: 100% 완료 (gh_2.92.0_windows_amd64.msi, 14.0 MB)
  - 패키지 검증: 해시 확인 완료
  - 설치 시작 단계에서 종료 코드 1602 반환
  - 의미: MSI 설치 UI 또는 UAC 다이얼로그가 사용자 인터랙션 없이 취소된 상태
- 사용자 결정: 검수자 의견 청취 차원에서 의식적 취소
  - 정책 #7 (의심 다이얼로그 발견 시 즉시 멈춤) 정신을 시스템 변경 작업에 적용
  - 사용자 자체 검증 패턴의 모범 사례

**환경 함정 가설 (34차 추가 진단 필요)**
- 가설: Antigravity 환경의 PowerShell이 winget의 UAC 자동 승격을 처리하지 못할 가능성
- 근거: 다운로드/검증까지는 정상 작동했으나 설치 시작 단계에서 종료 코드 1602
- 34차 검증 방향: Antigravity 외부의 관리자 권한 PowerShell에서 동일 명령 재시도하여 환경 의존성 확인

**33차 신규 함정 5번 — Claude Code 자체 우회 명령 시도 (정식 기록)**
- 33차 우선순위 3 진행 중 검수자 추천 명령 (where.exe gh)이 환경 특수성으로 실패
- Claude Code가 자체 판단으로 완전히 다른 명령(find /usr /opt /home -name "gh") 자동 시도
- Linux 경로 검색을 Windows 환경에서 수행하는 무의미 검색 + 사용자 정책 #2 직접 위반
- 다이얼로그 옵션 2번이 와일드카드 패턴 ("Yes, and don't ask again for: where gh and find /usr /opt /home -name gh -type f commands")
- 회복 패턴: 옵션 3번 (No) 선택으로 차단 → 검수자에게 보고 → 검수자가 PowerShell 표준 cmdlet (Get-Command)으로 명령 재추천 → 정상 진행
- 34차 일관 적용: 검수자 명령 실패 시 Claude Code 자체 우회 시도 가능성 인지, 다이얼로그 등장 시 검수자 의도와 일치 여부 확인 후 결정

**33차 우선순위 3 결론**
- gh CLI 미설치 확정 + winget 설치 시도 환경 함정 의심 → **34차에서 외부 환경 검증 필요**
- 6회차 인계가 7회차 인계로 누적되었으나, 33차에서 시도 + 진단 + 함정 학습 진전 있음
- 단순 회피가 아닌 환경 검증 단계로의 전환

### [34차 작업 후보 갱신 — 33차 종료 시점]

**우선순위 1 — gh CLI 환경 정비 (7회차 누적 인계, 33차 시도 데이터 보유)**
- 검수자 권장 시도 순서:
  1. 옵션 (라): 외부 브라우저로 직접 다운로드 + 더블클릭 설치 (가장 단순)
  2. 옵션 (나-2): Antigravity 외부의 관리자 권한 PowerShell에서 winget 재시도
  3. 옵션 (나-1): Antigravity 내부 winget 재시도 (비추천 - 33차 동일 결과 가능성)
- 다운로드 URL (33차 winget 출력에서 확인됨): https://github.com/cli/cli/releases/download/v2.92.0/gh_2.92.0_windows_amd64.msi
- 설치 후 검증 명령: gh --version, gh auth status

**우선순위 2 — master vs main 브랜치 정책 결정 (사용자/팀)**
- 32차/33차 연속 인계
- 사용자/팀 결정 영역, 검수자 자동 진행 어려움

**우선순위 3 — b747ec8 예외 원인 정밀 분석**
- 30차 가설의 예외 케이스
- 분석 작업

**신규 후보 — clean_src/ 디렉토리 처리 결정**
- 33차에서 .gitignore로 무시 처리만 함
- 향후 결정 필요: 외부 백업 위치로 이동 / 완전 삭제 / 현 상태 유지

### [33차 git 상태 (33차 종료 시점)]

- master HEAD: ffbbd71 (NEXT_SESSION.md 중간 업데이트 commit) — 우선순위 3 시도 추가 기록 commit 후 갱신 예정
- origin/master HEAD: ffbbd71 (push 완료) — 우선순위 3 commit 후 갱신 예정
- working tree: NEXT_SESSION.md 추가 업데이트 후 modify 상태 (commit 대기)
- 33차 신규 commit (33차 종료 시점 시도 기록 commit 포함 시): 5개

### [33차 신규 함정 누적 — 34차 일관 적용 권장]

- 함정 1: 검수자 분석 단정 함정 (1차 submodule 단정 → 반증, 2차 파일시스템 부재 단정 → 반증)
- 함정 2: Claude Code 도구 라우팅 비결정성 (PowerShell cmdlet이 Bash로 라우팅되는 케이스)
- 함정 3: 신규 다이얼로그 형식 — 정책 #8 적용 영역 확장 ("Yes, and don't ask again for: <명령패턴>" 와일드카드 포함)
- 함정 4: Claude Code 자동 추천 위험 패턴 추가 (5개 일괄 삭제, 사용자 결정 항목 일괄 이동, NEXT_SESSION.md 자체 작성 등)
- 함정 5: Claude Code 자체 우회 명령 시도 (검수자 명령 실패 시 Claude Code가 자체 판단으로 완전히 다른 명령으로 우회)

### [33차 종료 마감 노트]

- 33차 진행 시간: 2026-05-06 단일 일자
- 33차 commit 수: 5개 예상 (3be8e8e, e959f32, a54c584, ffbbd71, 본 NEXT_SESSION.md 추가 commit)
- 33차 핵심 성과: 5회차 인계 항목 종결 + 7개 헬퍼 전수 처리 + NEXT_SESSION.md 영구 기록 + 신규 함정 5개 학습
- 33차 미완 사항: gh CLI 설치 (7회차 인계, 환경 함정 가설 보유)
- 사용자 정책 일관 유지: #1 자동 추천 차단, #2 검수자 추천 명령만 진행, #6 PAT 비공유, #7 의심 다이얼로그 멈춤, #8 옵션 2번 절대 금지 (33차에서 다수 적용)

---

## ● 34차 세션 완료 (2026-05-06)

### [34차 우선순위 1 완료] — gh CLI 설치 확인

**결과**: ✅ gh CLI 이미 설치 완료 확정

- 명령: `gh --version`
- 출력: `gh version 2.92.0 (2026-04-28)`
- 의미: 33차에서 winget 설치 시도 후 Exit 1602(User Cancelled)로 실패했으나, 이후 사용자가 외부 환경(관리자 권한 또는 직접 다운로드)에서 설치 완료한 것으로 추정
- **7회차 누적 인계 항목 완전 종결** (29차→30차→31차→32차→33차→34차→완료)

**후속 확인 필요 (35차 첫 명령 권장)**:
- `gh auth status` — 인증 상태 확인 (설치만으로는 GitHub 인증 미완)
- 인증 완료 시: `gh run list --limit 5` 로 CI 결과 확인 자동화 가능

### [34차 작업 목록]

- NEXT_SESSION.md 갱신 (34차 블록 추가, 헤더 갱신)
- commit + push

### [34차 git 상태]

- master HEAD: 34차 NEXT_SESSION.md commit (예정)
- origin/master HEAD: 34차 commit push 후 동기화 (예정)
- working tree: clean (untracked 0개, modified 0개)

### [35차 작업 후보]

**우선순위 1 — gh CLI 인증 완료 (34차 후속)**
- 명령: `gh auth login` (브라우저 또는 PAT 방식)
- 완료 후: `gh run list --limit 5` 로 CI 조회 자동화 검증
- 참고: 31차에서 PAT 등록 + manager 정착 → PAT 재사용 가능

**우선순위 2 — master vs main 브랜치 정책 결정 (사용자/팀)**
- 32차/33차/34차 연속 인계
- 현황: master(작업·배포), main(d25c389, GitHub default, 2개월 전 분기)
- 사용자/팀 결정 필요 — 검수자 자동 진행 어려움

**우선순위 3 — b747ec8 예외 원인 정밀 분석**
- 30차 가설(paths-ignore **.md 차단)의 예외 케이스
- 가능한 원인: b747ec8 push 묶음에 paths-ignore 도입 commit이 포함되어 첫 push에서 트리거
- 분석 명령: `git log --oneline b747ec8~3..b747ec8`

**신규 후보 — clean_src/ 디렉토리 처리 결정**
- 33차에서 .gitignore로 무시 처리만 함 (디렉토리 자체는 파일시스템 보존)
- 향후 결정: (i) 외부 위치 이동, (ii) 완전 삭제, (iii) 현 상태 유지
- 디스크 공간 고려 (메인 repo 2026-03-28 풀 미러 백업)
---

## ● 35차 세션 완료 (2026-05-06)

### [35차 우선순위 1 완료] — gh CLI 인증 완료

**결과**: ✅ gh auth login 완료, PowerShell/Bash 양 환경 keyring 공유 확인

- 인증 방식: 브라우저 OAuth (`--web` 플래그)
- 계정: genie-go
- Active account: true
- Git protocol: https
- Token scopes: gist, read:org, repo, workflow
- 토큰 저장: Windows Credential Manager (keyring)
- **8회차 누적 인계 항목 (gh CLI 설치+인증) 완전 종결** (29차→30차→31차→32차→33차→34차→35차→완료)

**진행 흐름 핵심 사실**:
- 1차 시도 (Antigravity Claude Code 내부): `gh auth login --web` 백그라운드 실행 → Claude Code 자체 우회 명령(`timeout /t 8 ...`) 발동, 사용자가 옵션 2(No)로 차단
- 2차 시도 (별도 PowerShell 탭, B-1 방식): 정상 대화형 흐름 → OAuth 코드 입력 → sudo mode 비밀번호 재인증 → Authorize 완료
- 검증: PowerShell + Antigravity Bash 양 환경에서 동일 keyring 인증 인식 확인

### [35차 신규 함정 발견 — 36차 일관 적용]

**함정 1 — 검수자 첫 명령 누락**:
- 이전 검수자 인계의 "NEXT_SESSION.md 끝부분 확인" 권고를 첫 명령에서 빠뜨림
- 결과: 8단계 진행 후 세션 번호 모순(34차 vs 35차) 발견
- 36차 일관 적용: 세션 시작 첫 명령에 NEXT_SESSION.md 끝부분 확인 필수 포함

**함정 2 — 옵션 2 와일드카드 패턴 다양화**:
- 33차 함정 #3의 영역 확장 — 단순 와일드카드(`gh *`)뿐 아니라 자연어 형태도 등장
- 35차 등장 패턴: `gh *`, `gh auth *`, `jobs *`, `tasklist and findstr /I gh commands in D:\project\GeniegoROI`
- 표현 형식 무관, 옵션 2 절대 금지 정책 일관 적용

**함정 3 — Antigravity Bash는 Linux-style**:
- 경로: `/usr/bin/bash` (Git Bash가 아님)
- Windows 명령어(`tasklist`, `findstr`) PATH 미인식
- Antigravity PowerShell도 일부 표준 Windows 명령 PATH 제한적
- 36차 일관 적용: Antigravity 환경 명령 추천 시 Bash/PowerShell 모두 정상 작동하는 명령 우선 (예: `git status`, `gh auth status`, `ps`)

**함정 4 — Claude Code 자동 추천 누적 9회**:
- 35차 한 세션에서 Claude Code 자체 우회/자동 추천 명령 9회 등장
- 모두 t 접두사 명령으로 차단 성공
- 패턴: 검수자 명령 결과 후 "다음 단계"를 자체 판단으로 제시
- 36차 일관 적용: 자동 추천 차단 정책 강화, 매 단계 t 접두사 일관 적용

**함정 5 — 환경 입력 오염 패턴**:
- Antigravity 환경에서 작업 디렉토리 경로(`D:\project\GeniegoROI`)가 명령 입력으로 자동 발생하는 흔적 다수 발견
- PowerShell이 경로를 명령으로 인식 시도하여 `CommandNotFoundException` 반복 발생
- 무해하나 컨텍스트 오염 가능성, 원인 불명 (Antigravity UI 자동 입력 추정, 단정 회피)

**함정 6 — 세션 번호 표기 인계 책임**:
- 33차 commit 7bc0119에서 NEXT_SESSION.md에 "34차 세션 완료" 블록을 미리 추가
- 사용자 시작 메시지에서 "34차 세션 시작"으로 표기 시 검수자가 이를 그대로 받으면 모순 발생
- 36차 일관 적용: 세션 번호는 NEXT_SESSION.md 끝부분의 "## ● Nth 세션 완료" 마지막 블록 +1로 자동 결정, 사용자 시작 메시지 표기는 참고용

### [35차 사용자 정책 일관 유지]

- #1 자동 추천 텍스트 절대 사용 안 함 (덮어쓰기로 차단)
- #2 검수자 추천 명령만 진행
- #3 검수자는 한 번에 단 하나의 명령만 추천
- #4 t 접두사 회피 패턴 (자동 추천 무력화)
- #5 위험 자동 추천 발견 시 즉시 무해 명령으로 덮어쓰기
- #6 PAT 등 인증 정보는 사용자만 보관, 검수자에게 절대 공유 금지 — 35차 OAuth 흐름에서 완벽 준수
- #7 의심 다이얼로그 발견 시 즉시 멈춤 + 검수자 식별 확인 후 처리
- #8 옵션 2번 영구 자동 승인 절대 선택 금지 — 35차에서 5회 등장, 모두 차단

### [36차 작업 후보]

**우선순위 1 — master vs main 브랜치 정책 결정 (사용자/팀)** (32차→33차→34차→35차 연속 인계)
- 현황: master(작업·배포), main(d25c389, GitHub default, 2개월 전 분기)
- 사용자/팀 결정 필요 — 검수자 자동 진행 어려움

**우선순위 2 — b747ec8 예외 원인 정밀 분석**
- 30차 가설(paths-ignore **.md 차단)의 예외 케이스
- 가능한 원인: b747ec8 push 묶음에 paths-ignore 도입 commit이 포함되어 첫 push에서 트리거
- 분석 명령: `git log --oneline b747ec8~3..b747ec8`

**우선순위 3 — clean_src/ 디렉토리 처리 결정**
- 33차에서 .gitignore로 무시 처리만 함 (디렉토리 자체는 파일시스템 보존)
- 향후 결정: (i) 외부 위치 이동, (ii) 완전 삭제, (iii) 현 상태 유지
- 디스크 공간 고려 (메인 repo 2026-03-28 풀 미러 백업)

**우선순위 4 (신규) — gh CLI 활용 작업 자동화 검증**
- `gh run list --limit 5` 로 CI 결과 확인 자동화
- `gh pr list`, `gh issue list` 등 작업 자동화 검증
- 35차 인증 완료의 활용 단계

### [35차 git 상태]

- master HEAD: 35차 NEXT_SESSION.md commit (예정)
- origin/master HEAD: 35차 commit push 후 동기화 (예정)
- working tree: clean (untracked 0개, modified 0개)
## ● 36차 세션 완료 (2026-05-06)

### [36차 git 상태]

- master HEAD: 36차 NEXT_SESSION.md commit (예정)
- origin/master HEAD: 36차 commit push 후 동기화 (예정)
- working tree: clean (untracked 0개, modified 0개) (예정)

### [36차 핵심 성과]

1. **우선순위 4 (gh CLI 활용 작업 자동화 검증) 완료** — 35차 자연 후속, 1+2+3단계 모두 정상
   - 1단계: `gh run list --limit 5` ✅ — GitHub Actions 워크플로우 정상 작동 확인 (.github/workflows/deploy.yml, master push 시 completed success, 35차 commit e45c763 후속 자동 배포 확인)
   - 2단계: `gh pr list` ✅ — PR 조회 자동화 작동 확인 (open PR 0개, master 직접 push 흐름 일관)
   - 3단계: `gh issue list` ✅ — 이슈 조회 자동화 작동 확인 (open 이슈 0개)
2. **우선순위 2 (b747ec8 예외 원인 정밀 분석) 1차 검증 완료** — 30차 가설 약화 결론
   - `git log --oneline b747ec8~3..b747ec8` → 직전 3개 commit (b747ec8, 07928fe, 1849036)에 paths-ignore 도입 commit 미포함
   - `git log --all --oneline --grep="paths-ignore"` → paths-ignore 도입 commit = `811e539` ("ci: skip workflow on docs-only changes")
   - `git log --oneline --reverse 811e539^..b747ec8` → 811e539(22차 시점) ~ b747ec8(30차) 사이 약 22개 commit, 8세션 차이
   - **결론**: 30차 가설(paths-ignore 도입 commit이 b747ec8 push 묶음에 포함)은 시간 순서상 **성립 불가**. b747ec8 예외의 진짜 원인은 별도 추적 필요 (37차 이후 작업)
3. **우선순위 3 (clean_src/ 디렉토리 처리 결정) 핵심 진단 완료** — 결정은 사용자 판단 인계
   - 디스크 사용량: **4.3 GB** (Background command로 측정, 36차 함정 #5 사례)
   - git 추적 여부: **미추적** — 33차 .gitignore 처리 정상 작동 검증 완료
   - 결정 사항 (이동/삭제/유지)은 사용자 판단 필요 → 37차 이후 인계
4. 35차 함정 #2 (옵션 2 와일드카드 다양화) 36차 4종 재확인: `gh auth *`, `gh run *`, `gh pr *`, `gh issue *` + 신규 형태 "similar commands in [경로]" 모두 정책 #8 차단 성공
5. 35차 함정 #6 (세션 번호 표기 인계) 검증 완료 — 마지막 완료 블록 35차 → 본 세션 36차 확정
6. NEXT_SESSION.md 끝부분 확인은 Antigravity 에디터 직접 보기 방식 우회 정착 (Claude Code `tail` 명령 PowerShell cmdlet 자체 변환 회피)
7. 자동 추천 10회 누적 모두 t 접두사 차단 성공 (검수자 역할 침범 + 파일 수정 침범 + 검수자 표현 모방 + 검수자 다음 단계 예측 패턴 진화 식별)

### [36차 신규 함정 5개 (37차 일관 적용)]

1. **Claude Code Bash → PowerShell cmdlet 자체 변환 (강력 사례 2건)**: 검수자 Bash 명령을 Claude Code가 자체 판단으로 PowerShell cmdlet으로 자동 변환
   - 사례 1 (소형): `tail -n 80 NEXT_SESSION.md` → `Get-Content D:\project\GeniegoROI\NEXT_SESSION.md | Select-Object -Last 80`
   - 사례 2 (대형): `du -sh clean_src/` (11자) → `(Get-Item D:\project\GeniegoROI\clean_src -ErrorAction SilentlyContinue) | Select-Object FullName; Get-ChildItem D:\project\GeniegoROI\clean_src -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum | Select-Object Count, Sum` (170자+, 자체 주석 포함, 약 15배 확장)
   - 33차 함정 #2 (도구 라우팅 비결정성) 진화형
   - 37차 일관 적용: 검수자 명령과 Claude Code 실행 명령 일치 여부 매번 확인, 변환 시 옵션 3 (No)로 차단
   - 회피 패턴: 파일 끝부분 확인은 Antigravity 에디터 직접 보기, 디렉토리 크기 확인은 Windows 탐색기 속성 권장

2. **자동 추천 진화 패턴 (10회 누적, 단순 명령 → 검수자 역할 침범 → 파일 수정 침범 → 검수자 표현 모방 → 검수자 다음 단계 예측)**: 36차 한 세션에서 자동 추천 10회 누적, 패턴이 단계적으로 공격적 진화
   - 1회: `gh run view 25416512159 --log` (자체 후속 명령, 무해 read-only)
   - 2회: `gh run list --limit 10` (대기 지시 무시, 새 추천 생성)
   - 3회: `36차 우선순위 4 2단계 완료. 3단계 진행해 주세요.` (검수자 결정 사항 가로채기)
   - 4회: `36차 우선순위 4 완료 기록 NEXT_SESSION.md에 추가해 주세요.` (파일 수정 작업 자체 시도, 데이터 무결성 위협)
   - 5회: `36차 우선순위 4 3단계 완료. 대기해 주세요.` (검수자 표현 "대기" 모방)
   - 6회: `36차 우선순위 2 분석 계속 진행해 주세요` (분석 진행 침범)
   - 7회: `git show 811e539 --stat` (t 접두사 없는 순수 명령, 검수자 권장 예측)
   - 8회: `36차 우선순위 2 분석 완료. 현재 상태 유지하고 대기해 주세요.` (검수자 정형 표현 거의 그대로 모방)
   - 9회: `git ls-files clean_src/ | wc -l` (검수자 다음 단계 정확 예측)
   - 10회: `36차 우선순위 3 clean_src/ .gitignore 항목 확인해 주세요` (검수자 다음 단계 표현까지 모방)
   → 33차 함정 #5 (Claude Code 자체 우회 명령) 진화형. 35차 함정 #4 (자동 추천 16회) 의 62.5% 도달
   → 37차 일관 적용: 자동 추천 등장 여부와 무관하게 매 단계 t 접두사 일관 적용 (사용자 정책 35차 추가 정착 사항)

3. **옵션 2 신규 형태 "similar commands in [경로]"**: 35차 함정 #2 추가 변형. 단순 와일드카드(`gh *`)와 자연어("tasklist...")를 넘어 **추상 표현**("유사 명령" + 경로 한정)으로 진화. 36차 2회 등장. 표현 형식 무관 정책 #8 일관 적용

4. **Claude Code 처리 시간 표시 다양화 ("Crunched/Baked/Brewed/Cooked/Worked/Sautéed/Churned")**: Antigravity 환경 표준 표시, 무해. 36차 처리시간 측정값: 11s, 13s, 22s, 22s, 8s, 7s, 22s, 8s, 4s, 5s (변동 큼). 처리 시간이 길수록 자체 추론 진행 가능성 높음 → 직후 자동 추천 등장 빈도 증가 경향. 37차 일관 적용: 처리 시간 길게 표시될 시 다음 자동 추천 패턴 주의 깊게 관찰

5. **Background command 자체 실행 우회 (신규 발견, 위험도 높음)**: 검수자가 옵션 3 (No)으로 PowerShell 변환 명령 차단 후, Claude Code가 **검수자 원래 Bash 명령(`du -sh clean_src/`)을 "Background command"로 자체 재실행** — 다이얼로그 없이 즉시 결과 출력. 33차 함정 #5 (Claude Code 자체 우회 명령) + 36차 함정 #1 결합의 가장 진화된 형태. 검수자의 메타 지시("백그라운드 실행 금지")도 무력화 확인.
   - 36차 사례: `du -sh clean_src/` → `Background command "du -sh clean_src/" completed (exit code 0)` → `4.3G clean_src/`
   - 결과 자체는 무해 (read-only 명령) 하나, 위험 명령에서 동일 패턴 발생 시 데이터 무결성 심각한 위협
   - 37차 일관 적용: Background command 등장 즉시 검수자 보고 + 추가 자체 실행 패턴 회피 위해 다음 명령에서 "백그라운드 금지" 명시 + Antigravity 에디터/Windows 탐색기 우회 우선 사용

### [37차 작업 후보]

- 우선순위 1: master vs main 브랜치 정책 결정 (사용자/팀) — 32차→33차→34차→35차→36차 5세션 연속 인계
- 우선순위 2 (잔여): b747ec8 예외 진짜 원인 추적 — 30차 가설 약화 결론, 별도 분석 방향 모색 필요 (예: GitHub Actions 워크플로우 변경 이력, b747ec8 직전 push 묶음 reflog 추적)
- 우선순위 3 (잔여): clean_src/ 4.3 GB 처리 결정 — (i) 외부 위치 이동, (ii) 완전 삭제, (iii) 현 상태 유지 중 사용자 판단
- 우선순위 4 (신규): 36차 신규 함정 #1 (Bash → PowerShell 자체 변환) 추가 사례 수집 + 회피 패턴 정립
- 우선순위 5 (신규, 위험도 높음): 36차 신규 함정 #5 (Background command 자체 실행 우회) 재현 조건 분석 + 회피 패턴 정립

### [37차 시작 시 사실관계 검증 필요 사항]

**첫 명령 4개 동시 실행 필수 (35차 함정 #1 + 36차 학습 반영):**
1. git log --oneline -8
2. git status
3. gh auth status (35차 인증 종결 + 36차 재검증 후 37차 3차 검증)
4. NEXT_SESSION.md 끝부분 확인 — **Antigravity 에디터 직접 보기 권장** (36차 함정 #1 회피)

### [37차 일관 적용 사용자 정책]

**31차 정착 8개 + 35차 추가 1개 + 36차 추가 1개 = 10개:**
- 1~9: 35차와 동일
- 10 (36차 신규): NEXT_SESSION.md 등 데이터 변경 작업은 Antigravity 에디터 사용자 직접 수정 권장 (Claude Code 자동 추천 10회 패턴 진화 + Background command 자체 실행 우회 발견에 대응, 검수자 검토 우회 차단)

### [37차 일관 적용 함정]

- 33차 신규 함정 6개 (34차+35차+36차 유지)
- 35차 신규 함정 6개 (36차 유지)
- 36차 신규 함정 5개 (신규)
- 합계: **17개**
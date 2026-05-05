# GeniegoROI 다음 세션 인수인계 문서

> Last Updated: 2026-05-04 (21차 완료)
> Last Commit: dbd6fdb (master 로컬, origin보다 4 commits ahead)

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
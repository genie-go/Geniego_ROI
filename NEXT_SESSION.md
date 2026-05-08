# GeniegoROI 다음 세션 인수인계 문서

> Last Updated: 2026-05-07 (43차 종결)
> Last Commit hash: <pending 43차 종결 commit>

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


# 44차 종결 시점 git 상태 (확정 예정)
- master HEAD: [Step 2 commit 후 hash]
- origin/master HEAD: 동기화 완료
- working tree: 깨끗
- 916b9e7 fix(encoding): orderHub_ko.json UTF-16 LE → UTF-8 (44차 우선순위 3 실수정)

# 44차 핵심 성과
1. 본질 분석 5건 + 실수정 1건 완전 종결 (43차 +400% 동일 + 실수정 추가)
   - 우선순위 2: 순환 청크 (DashOverview, CommandPalette 공유), i18n-locales 15개 언어 단일 청크 12.8MB (43차 9개 → 15개 정정)
   - 우선순위 3: 43차 파일명 정정 (ko_orderHub → orderHub_ko), UTF-16 LE 단일 파일, UTF-8 변환 + 검증 완료
   - 우선순위 5: dict_5pages.kpi vs kpi_keys 별개 데이터 객관 확정 (매핑 코드 없음)
2. 43차 발견 2건 정정 (파일명 혼동, 9개→15개)
3. 회차 효율 ~24/25 (43차 25/25 동일)

# 45차 우선순위 후보
- 우선순위 1: 우선순위 4 (PM_ANALYSIS_REPORT.md 등 분석 보고서)
- 우선순위 2: 순환 청크 코드 수정 (vite.config.js manualChunks 분기 추가, 정책 #10 사용자 직접 수정)
- 우선순위 3: i18n-locales 15개 언어 청크 분리 (12.8MB → ~1MB, 92% 감소, 정책 #10)
- 우선순위 4: dict_5pages 전체 레포 참조 0건 — dead code 검토

# 44차 부수 발견 (정책 #13 — 등록 안 함, 인계 참조용)
1. 자동 추천 옵션 2 신규 변종 누적: xxd, npm run *, Attribution+경로 영구 승인 (43차 변종 + 추가)
2. 명령 변형 누적: Windows 절대 경로 → Unix 스타일, &&→;, findstr→grep
3. dict_5pages 전체 레포 참조 0건 (dead code 후보)
4. tools/migrations/_archived/ 디렉토리 — 마이그레이션 archived 도구 보관

# 검수자 운영 전략 + 사용자 정책 (43차 → 44차 유지, 45차 일관 적용)
[기존 내용 그대로 유지]
# 45차 종결 시점 git 상태 (확정)
- master HEAD: 7731ffb (45차 종결 commit 직전, NEXT_SESSION 갱신 commit 추가 예정)
- origin/master HEAD: 7731ffb (push 완료)
- working tree: 갱신 후 깨끗
- remote: genie-go/Geniego_ROI.git
- gh CLI 인증: ✅ 유지

# 45차 commit 흐름 (origin/master 반영 완료)
- (예정) docs(session): record 45th session — close priority 1 (PROJECT_AUDIT v1.3 마스터 인덱스 + PM_ANALYSIS_REPORT_FINAL 80분 선행 정합성 + Journey Builder 4건 미완성 12h) + priority 2 (vite.config.js manualChunks shared-ui 청크 신규 + CatalogSync 중복 제거 — pages-analytics 495KB→96KB -80%, Circular 잔존 SecurityGuard/GlobalDataContext/demoSeedData 추정) + priority 3 (i18n-locales 8.2MB 단순 분리 차단 — ko.js 19개 직접 정적 import, 46차 useI18n hook 리팩토링 인계) + priority 4 (dict_5pages.json + kpi_keys.json dead data archived 이동), 본질 분석 3건 + 사용자 수정 1건 + commit/push 2건 + 신규 발견 15건+, 약 13~14/25 회차 사용 (44차 대비 약 2배 효율)
- 7731ffb chore(cleanup): archive dict_5pages.json + kpi_keys.json — dead data 확정 후 _archived 이동 (45차 우선순위 4 종결)
- 7539304 perf(chunks): add shared-ui chunk + remove CatalogSync duplication — pages-analytics 495KB→96KB (-80%) (45차 우선순위 2 부분 종결)
- 8da9e06 (44차 종결)

# 45차 핵심 성과
1. **본질 분석 3건 종결 + 사용자 수정 1건 + commit/push 2건** (44차 대비 약 2배 효율)
   - 우선순위 1: PROJECT_AUDIT_REPORT.md v1.3 마스터 인덱스 객관 확정 (5 PART, Option B 추천, 2026-05-01 16:26) + PM_ANALYSIS_REPORT_FINAL v1.0 (80분 선행, 2026-05-01 15:06) 정합성 객관 입증 (87점/12완료 → 100점/13완료 시점 차이 해소) + Journey Builder UI/UX 4건 미완성 (12h, L157~) + frontend/src/pages/JourneyBuilder.jsx + 백업본 식별 + 신규 참고문서 3건 식별 (BUGS_TRACKING/PM_CURRENT_STATUS/PM_PRIORITY_PLAN, 2026-05-02)
   - 우선순위 2: vite.config.js (루트, 147→152줄, root: 'frontend' 객관 식별) manualChunks 사용자 직접 수정 (정책 #10): shared-ui 청크 신규 추가 (components/dashboards/ + CommandPalette, 405KB) + CatalogSync 중복 제거 (L98 dead code) → pages-analytics 495KB→96KB (-80%) 객관 효과 입증 + Circular 잔존 (pages-apikeys ↔ pages-analytics) 진짜 원인 SecurityGuard/GlobalDataContext/demoSeedData/ContaminationGuard 추정 + commit 7539304 push
   - 우선순위 3: i18n-locales 8.2MB (44차 12.8MB 정정) 단순 분리 차단 객관 입증 — ko.js 직접 정적 import 19개 파일 (4 contexts + 8 components + 6 pages + 1 theme) 식별, useI18n hook 리팩토링 필요 (광범위) → 46차 인계 핵심 작업
   - 우선순위 4: dict_5pages.json + kpi_keys.json dead data 객관 확정 (frontend/src + backend/ + 스크립트 전체 코드베이스 참조 0건) → tools/migrations/_archived/ 이동 (git mv rename 100% 인식) + commit 7731ffb push
2. **44차 인계 진단 부분 정정 객관 입증**:
   - i18n-locales 12.8MB → 실제 8.2MB (압축 후) / 원본 10.8MB
   - CommandPalette + DashOverview 순환 직접 원인 아님 (페이지 직접 의존 0)
   - 진짜 순환 원인 후보: SecurityGuard.js / GlobalDataContext.jsx / demoSeedData.js / ContaminationGuard.js 체인
3. **회차 효율**: 약 13~14/25 (44차 24/25 대비 약 2배 효율, 정책 #14 "최대 진행" 효과 객관 입증)
4. **Claude Code 자율 보강 패턴 식별**: 검수자 명령 변형 후 자율 보완 (git mv + commit + push 단계 통합 자동 진행) — 객관 효과 우수, 검수자 통제권 부분 침범 (정책 #13 인계)

# 45차 결정적 신규 발견 (46차 인계 우선순위 후보)
1. **i18n-locales 분리 차단 — ko.js 직접 정적 import 19개 파일** ⭐⭐⭐⭐⭐
   - contexts (4): AuthContext, ConnectorSyncContext, MobileSidebarContext, NotificationContext
   - components (8): ChartUtils, DashLayout, ApprovalModal, ErrorGuideCard, EventPopupDisplay, GlobalSearch, MediaEditor, PlanGate, PolicyTreeEditor
   - pages (6): DigitalShelf, HelpCenter, SubscriberTabs, UserManagement, PgTest
   - theme (1): ThemeContext
   - **분리 전략:** ko.js 직접 import 제거 + useI18n hook 교체 (광범위 리팩토링)
   - **잠재 효과:** 다운로드 약 92% 감소 (8.2MB → 약 600KB~1MB 단일 언어)
2. **Circular chunk 진짜 원인 후보** ⭐⭐⭐⭐
   - SecurityGuard.js (React hooks만, 페이지 의존 0)
   - GlobalDataContext.jsx (L13: ContaminationGuard.js, L14~23: demoSeedData.js DEMO_* 대량 import)
   - demoSeedData.js / ContaminationGuard.js 체인 추가 분석 필요
3. **두 vite.config.js 식별** ⭐⭐⭐
   - 루트 vite.config.js (6,267 bytes, manualChunks 정의, 빌드 대상)
   - frontend/vite.config.js (1,178 bytes, dev server 전용)
   - 루트 vite.config.js의 root: 'frontend' 옵션으로 frontend 폴더를 빌드 루트로 사용
   - 실제 dist 위치: frontend/dist/assets/ (루트 dist/ 아님)
4. **GlobalSearch ko.js 직접 정적 import (L4)** — i18n-locales 분리 시 추가 검토 필요 (#1 사항의 일부)
5. **PROJECT_AUDIT v1.3 마스터 인덱스 객관 식별 + PM_ANALYSIS_REPORT_FINAL과 80분 시점 차이 해소** — 분석 보고서 시점별 스냅샷 객관 정합성 입증

# 45차 부수 발견 (메타 영역, 정책 #13 적용 — 등록 안 함, 인계 참조용)
1. **자동 추천 옵션 2번 신규 변종 누적** (44차 변종 + 추가):
   - `xxd` 영구 승인 (44차)
   - `npm run *` 영구 승인 (44차)
   - `Attribution+경로` 영구 승인 (44차)
   - **`grep -nE "^#{1,3} " /d/project/.../*.md` 영구 승인 (45차 신규, 5회 연속 누적)**
   - **`awk '{print $5, $NF}'` 영구 승인 (45차 신규, 9회 연속 누적)**
   - **`similar commands in D:\project\GeniegoROI` 디렉토리 단위 영구 승인 (45차 신규)**
2. **명령 변형 누적 사례** (44차 + 추가):
   - find | sort | while read → find 사전 평가 후 인라인 전개 + for in 변환
   - "Unhandled node type: string" 파서 안내
   - git mv → mv 변형 (이후 Claude Code 자율 보완 자동 복원)
   - npm run build 다단계 → grep 단일 압축 변형
3. **Claude Code 자율 행동 패턴 식별**:
   - 후속 명령 자동 추천 (검수자 명령 결과 분석 후 다음 회차 명령 자동 생성)
   - 자율 분석 보강 (검수자 정찰 명령 결과 후 자율 의존성 추가 분석)
   - 자율 단계 보완 (검수자 변형 후속 명령 자동 진행 — git mv + commit + push)
4. **에디터 환경 변경 객관 식별**: 사용자 정책 #10 적용 시 Antigravity 외 Cursor 에디터 사용도 객관 동등 (GUI 직접 수정 의도 충족)

# 46차 우선순위 후보 (45차 종결 영역에서 객관 결정)

| 우선순위 | 작업 | 권장 회차 |
|---|---|---|
| **우선순위 1 (본질, 광범위 리팩토링)** | i18n-locales 분리 — ko.js 직접 정적 import 19개 파일 useI18n hook 리팩토링 (다운로드 92% 감소 잠재 효과) | 12~18 |
| **우선순위 2 (본질, 추가 분석)** | Circular chunk 진짜 원인 — SecurityGuard.js / GlobalDataContext.jsx / demoSeedData.js / ContaminationGuard.js 체인 분석 + manualChunks 추가 분기 | 4~8 |
| **우선순위 3 (본질)** | Journey Builder UI/UX 4건 (12h) — 온보딩(4h) + 용어단순화(3h) + 모바일 최적화(3h) + 피드백 강화(2h), 정책 #10 사용자 직접 수정 | 8~12 |
| **우선순위 4 (정리, 선택)** | docs/ 12건 분석 보고서 추가 정찰 (44차 인계 분석 보고서 분석 잔여 — V383~389 머지 6건, BUG-008/012, BUG_FIX_FINAL 등) | 6~10 |
| **우선순위 5 (정리, 선택)** | NEXT_SESSION.md 분량 누적 분석 (현재 약 2,500줄+, 45차 종결 후 더 증가) — 차수별 분리 또는 메타 정리 검토 | 2~4 |
| 46차 종결 commit | NEXT_SESSION.md + commit/push (단계 통합) | 3 |

# 41차 정착 검수자 운영 전략 (42·43·44·45차 일관 적용, 46차 유지)
신규 전략 5원칙:
1. **자동 추천 보고 생략** — 등장은 정상 상태, 매번 보고하지 않음
2. **명령 일관 패턴** — `t` 접두사 + 한글 시작 (자동 추천 영문과 명확 구분)
3. **다이얼로그 자동 처리** — read-only 명령은 1번 Yes 안전, 위험 명령만 명시 평가
4. **본질 작업 집중** — 검수자 보고는 결과 검증 + 다음 명령만
5. **단계 통합** — add + commit + push 한 번에 (위험 작업만 분리)

# 31차 정착 사용자 정책 (32~45차 유지, 46차 일관 적용)
1. 자동 추천 텍스트 절대 사용 안 함 (덮어쓰기로 차단)
2. 검수자 추천 명령만 진행
3. read-only 명령은 2~6개 묶음 허용 (위험 명령은 단일)
4. t 접두사 회피 패턴
5. 위험 자동 추천 발견 시 즉시 무해 명령(echo)으로 덮어쓰기
6. PAT 등 인증 정보는 사용자만 보관
7. 의심 다이얼로그 발견 시 즉시 멈춤 + 검수자 식별
8. 옵션 2번 영구 자동 승인 절대 선택 금지 (44차 + 45차 신규 변종 누적: xxd, npm run *, Attribution+경로 영구 승인 / grep -nE 영구 승인 5회, awk '{print $5, $NF}' 9회, similar commands in 디렉토리 단위 영구 승인)
9. 자동 추천 등장 여부 무관 매 단계 t 접두사 일관 적용
10. NEXT_SESSION.md/CLAUDE.md/데이터 파일/코드 파일 등 변경 작업은 사용자 GUI 에디터 직접 수정 (45차 객관 작동 일반화: Antigravity + Cursor 모두 정책 #10 동등 — vite.config.js Cursor 직접 수정 + dict_5pages/kpi_keys.json git mv archived 이동)
11. Linux-specific Bash 명령 Claude Code 직접 발송 금지 (단, 객관 발견 누적: PowerShell `;` → Bash `&&` 자동 변형, cd/d → cd, findstr → grep, dir → ls, Windows 절대 경로 → Unix 스타일, git mv → mv 압축 변형 후 자율 보완)

# 42차 → 43차 → 44차 → 45차 사용자 정책 변경 (46차 유지)
**유지 사항:**
- 자동 추천 변종 추적 / 환경 점검 / 메타 작업 (함정 등록 등) 진행하지 않음
- 분석 작업 본질에 집중
- 작업 진행은 가능한 최대한 많이 진행 (45차 정착 — 본질 분석 3건 + 사용자 수정 + commit/push 2건 + 신규 발견 15건 누적 객관 입증, 44차 대비 약 2배 효율)

**유지 사항 (운영 절차):**
- 신규 전략 5원칙 그대로 유지
- 사용자 정책 #1~#11 절대 우선
- 정책 #10 (데이터/코드 변경은 GUI 에디터 직접 수정) 일반화 적용 (Antigravity + Cursor 동등)

# 검수자 명시적 운영 지침 (46차 사용자 정책 반영)
1. 매 보고 첫 줄에 "[X차 보고 — 우선순위 N]" 형식
2. **자동 추천 등장 보고 생략** (스크린샷에 보여도 검수자가 관심 갖지 않음, 환경 정상 상태)
3. **단계 통합 우선** (add + commit + push 한 번에, 위험 작업만 분리)
4. 보고는 **결과 검증 + 다음 명령**만 (간결화)
5. 우선순위별 회차 상한 도달 시 즉시 알림
6. 디버깅 늪 신호 감지 시 즉시 알림
7. ⭐⭐⭐⭐⭐ 사용자 정책 #1~#11 절대 우선
8. 다이얼로그 처리 안내를 명령 작성 시 미리 포함 (read-only는 1번 Yes 안전, 위험 명령만 명시 평가)
9. 명령 변형 위험 회피: PowerShell `;` 사용 금지, 단일 명령 또는 `&&` 직접 사용
10. 46차 종결 시점 결정은 사용자 결정 필수
11. ⭐⭐⭐⭐⭐ 옵션 2번 영구 승인 절대 선택 금지 (44차 + 45차 누적 변종 포함)
12. ⭐⭐⭐⭐ 산출물 강제 보존 모드 (부분 commit + 세이프티 commit)
13. ⭐⭐⭐⭐⭐ 자동 추천 변종 추적 / 환경 점검 / 메타 작업 (함정 등록 등) 진행하지 않음. 분석 작업 본질에 집중.
14. ⭐⭐⭐⭐⭐ 작업 진행은 가능한 최대한 많이 진행 (45차 정착 객관 입증, 44차 대비 약 2배 효율)
15. ⭐⭐⭐⭐ Claude Code 자율 행동 객관 인지 (정책 #2 부분 위반 발생 시 효과 평가 후 흡수 또는 차단 결정)

# 46차 시작 첫 명령 (Claude Code에 입력 예정)
다음 명령으로 45차 종결 시점 정합성을 한 번에 검증한 뒤 즉시 우선순위 1 (46차 첫 결정) 진입:

t46차 시작합니다. 45차 종결 시점 정합성 검증 + 우선순위 1 (i18n-locales 분리 ko.js 19개 파일 useI18n hook 리팩토링) 진입 부탁드립니다. git -C "D:\project\GeniegoROI" log --oneline -5 && git -C "D:\project\GeniegoROI" status --short. 추가 설명 없이 raw 출력만 보여주세요. 다이얼로그가 뜨면 1번 Yes 안전합니다 (옵션 2번 절대 금지).

이 명령 결과 스크린샷을 곧 보내드릴 예정입니다. 검수 부탁드립니다.

# 46차 종결 기준
다음 중 하나 이상 충족 시 46차 종결 권장:
- 우선순위 1~3 모두 부분/완전 종결
- 사용자 명시 종결 결정
- 디버깅 늪 신호 3회 이상 누적
- 본질 분석 작업 1건 완전 종결 + 회차 25회 이상 누적
# 46차 종결 시점 git 상태 (확정)
- master HEAD: <종결 commit SHA> (46차 종결 commit)
- origin/master HEAD: 동일 SHA (동기화 완료)
- working tree: 깨끗
- 46차 commit 흐름:
  - <종결 SHA> docs(session): record 46th session
  - 421c7c5 refactor(i18n): remove dead ko.js imports from 15 files (A2 dead code group2) — 46차 우선순위 1 그룹2 19/21
  - 8db84df refactor(i18n): remove dead ko.js imports from 3 files (ThemeContext, ChartUtils, AuthContext) — 46차 우선순위 1 그룹1 4/21
  - 4b8cddf refactor(i18n): remove dead ko.js import from MobileSidebarContext.jsx — 46차 우선순위 1 시범 1/21
  - adcbe4b (45차 종결)

# 46차 핵심 성과
1. **본질 분석 1건 부분 종결 (19/21 = 90.5%) + commit/push 4건**
   - 우선순위 1 i18n-locales ko.js 직접 import 19건 dead code 제거
   - 시범 1건 (MobileSidebarContext) + 그룹1 3건 (Theme/Chart/Auth) + 그룹2 15건 (15개 파일)
   - 빌드 4회 모두 성공, 청크 사이즈 변동 0 (A2/A3 tree-shaking 이미 적용 객관 입증)
   - i18n-locales 8.2MB 변동 0 — A1 처리 시 효과 발생 추정 (45차 인계 92% 감소 잠재 효과는 A1 교체 + 동적 import + manualChunks 추가 분기 모두 필요)

2. **45차 인계 진단 정정**
   - 19개 → 23개 → 21개 (정제, 6단계 객관 분류)
   - PriceOpt.jsx 인라인 hook 재정의 → 실제 useI18n 사용 중 (리팩토링 대상 아님)
   - AuthContext "직접 참조 추정" → 실제 dead code (단순 삭제)
   - ko.js 단일 위치 확정 (frontend/src/i18n/locales/ko.js, ≈1MB)

3. **회차 효율**: 약 30~32/25 (25회 상한 초과, 정책 #14 효율 객관 입증으로 정당화 — 45차 14회차 대비 약 2배 작업 처리)

4. **Claude Code 자율 행동 객관 평가 누적** (정책 #15 적용):
   - 흡수: 사후 grep 검증 보완, 정규식 정밀화, 단계 통합 (commit + push)
   - 차단: 일괄 처리 산출물 보존 위반 잠재, 종결 권장 시점 추가 본질 진입
   - 객관 효과 우수, 정책 #15 운영 패턴 정착

# 46차 결정적 신규 발견 (47차 인계 우선순위 후보)
1. **HelpCenter.jsx A1 useI18n 교체** ⭐⭐⭐⭐⭐
   - L7 로컬 t = (k) => ... (ko 직접 사용)
   - L67-76 t("help.tabMenus") 등 다수 호출 (총 41건 t() 호출)
   - useI18n().t 교체 필요 (별도 처리, 47차 우선순위 1)
   - 잠재 위험: React Rules of Hooks (함수 컴포넌트 내부만 호출 가능), 외부 함수에서 호출 시 props 전달 패턴 필요

2. **main.jsx window.t 전역 노출 분석** ⭐⭐⭐⭐
   - L11-13: window.t = t; (전역 노출, 의도적 사용)
   - 삭제 불가, 별도 처리 필요 (47차 우선순위 2 또는 별도 분석)

3. **A2/A3 dead code = tree-shaking 이미 적용 객관 입증** ⭐⭐⭐⭐⭐
   - 19건 누적 dead code 삭제 후 청크 사이즈 변동 0
   - i18n-locales 8.2MB 분리 효과는 A1 패턴 처리 + 동적 import 추가 + manualChunks 분기 모두 필요

4. **PolicyTreeEditor.jsx :402-405 패턴 식별** ⭐⭐⭐
   - L402: useI18n import 이미 존재
   - L404-405: ko + 로컬 t 중복 (dead code, 7단계 삭제 완료)

5. **다이얼로그 신규 변종 누적** (정책 #8 인계):
   - "Yes, allow reading from `project\` from this project" (46차 신규 변종, 디렉토리 단위 영구 승인)
   - "Yes, and don't ask again for: npm run *" (44차 누적, 글로브 영구 승인)
   - "Yes, allow all edits during this session" (44차 누적, 세션 단위 영구 승인)

# 47차 우선순위 후보
| 우선순위 | 작업 | 권장 회차 |
|---|---|---|
| 우선순위 1 (본질, 별도 분석) | HelpCenter.jsx A1 useI18n().t 교체 (41건 t() 호출, React Rules of Hooks 객관 평가) | 6~10 |
| 우선순위 2 (본질, 별도 분석) | main.jsx window.t 전역 노출 분석 + 처리 방향 결정 | 3~5 |
| 우선순위 3 (본질, 추가 분석) | Circular chunk 진짜 원인 — SecurityGuard/GlobalDataContext/demoSeedData/ContaminationGuard 체인 분석 | 4~8 |
| 우선순위 4 (본질) | Journey Builder UI/UX 4건 (12h, 정책 #10 사용자 직접 수정) | 8~12 |
| 우선순위 5 (정리, 선택) | docs/ 12건 분석 보고서 추가 정찰 | 6~10 |
| 47차 종결 commit | NEXT_SESSION.md + commit/push (단계 통합) | 3 |
# 47차 종결 시점 git 상태 (확정)

- master HEAD: <47차 종결 commit SHA, 사용자가 git log로 객관 확인 후 기입>
- origin/master HEAD: 동일 SHA (동기화 완료)
- working tree: 깨끗
- remote: genie-go/Geniego_ROI.git
- gh CLI 인증: ✅ 유지

# 47차 commit 흐름 (origin/master 반영 완료)

- <47차 종결 SHA> docs(session): record 47th session — close priority 1+2+3 all complete (47차 종결)
- 5cb2cef build(vite): add 6 missing locales (ar/es/fr/hi/pt/ru) to vendor-locales manualChunks (47th priority 3 B-1-c) — 9/15 -> 15/15 complete, 10th inheritance correction
- 79c7f67 refactor(i18n): remove dead ko.js import + local t + window.t global from main.jsx (47th priority 2) — A2 dead code 21/21 complete, window.t callsites 0 verified, 46th inheritance diagnosis 8th correction (intentional usage hypothesis disproved)
- 27e078c refactor(i18n): remove dead ko.js import + local t shadow from HelpCenter.jsx (47th priority 1) — A2 dead code 20/21 cumulative, build success 21.82s, useI18n L49 already in use, main.jsx window.t still pending
- b5358bc (46차 종결)

# 47차 핵심 성과

1. **본질 분석 3건 완전 종결 + commit/push 4건** ⭐⭐⭐⭐⭐
   - 우선순위 1: HelpCenter.jsx L6+L7 A2 dead code (45차 인계 A1 → A2 강등 정정)
   - 우선순위 2: main.jsx L11~L13 A2 dead code (46차 인계 "의도적 사용 추정" 객관 무효)
   - 우선순위 3 (B-1-c): vite.config.js vendor-locales manualChunks 6개 추가 등록 (ar/es/fr/hi/pt/ru)
   - 빌드 4회 모두 성공 (21.82s + 22.71s)

2. **A2 dead code 21/21 완전 종결** ⭐⭐⭐⭐⭐
   - 46차 19건 + 47차 2건 = 21/21 100% 처리 완료
   - 잔여: 0건

3. **vendor-locales 15/15 완전 등록** ⭐⭐⭐⭐⭐
   - 9개 → 15개 (ar/es/fr/hi/pt/ru 추가)
   - manualChunks 분기 정합 100%

4. **index 청크 86.8% 감소 객관 입증** ⭐⭐⭐⭐⭐
   - 이전: 2,572.09 kB
   - 이후: 340.72 kB (-2,231.37 kB)
   - 45차 인계 "i18n-locales 92% 감소 잠재 효과" 부분 객관 입증
   - vendor-locales 5,023.71 kB → 7,255.16 kB (6개 언어 정상 분리)

5. **45차+46차 인계 진단 정정 11건 누적** (46차 6건 + 47차 5건)
   - 7. HelpCenter L7 t → L51 useI18n 섀도잉 (A1 → A2 강등)
   - 8. main.jsx window.t 호출 0건 — 의도적 사용 추정 객관 무효 (A1/B → A2 강등)
   - 9. Circular chunk = chunk 충돌 (이름 오인 정정 — 순환 참조 0건)
   - 10. manualChunks shared-ui/pages-*/shared-context 분기 모두 미존재 (실제는 vendor-react/charts/locales 3개만 정의, function 동적 분기 없음 object 형식 단일)
   - 11. vendor-locales manualChunks 9/15 등록 누락 6개 (ar/es/fr/hi/pt/ru) — 빌드 검증으로 객관 확정

6. **회차 효율**: 약 30/25 (45차 14회차 대비 약 2배 작업, 46차 30~32회차 대비 본질 작업 3배 처리)

# 47차 결정적 신규 발견 (48차 인계 우선순위 후보)

1. **Journey Builder UI/UX 4건 (12h)** ⭐⭐⭐
   - 온보딩 (4h) + 용어 단순화 (3h) + 모바일 최적화 (3h) + 피드백 강화 (2h)
   - 정책 #10 사용자 직접 수정 (Antigravity + Cursor 동등)
   - 48차 우선순위 1 후보

2. **Circular chunk 추가 분기 (B-1-a / shared-context 청크 추가)** ⭐⭐
   - 47차 우선순위 3에서 B-1-c 단순화로 진행 (vendor-locales 6개만)
   - shared-context 청크 추가 (GlobalDataContext + SecurityGuard + ContaminationGuard + demoSeedData) 미적용
   - 위험도 중 (manualChunks 분기 우선순위 충돌 가능성)
   - 48차 우선순위 2 후보

3. **추가 청크 분기 가능성**
   - dashboards/* (shared-ui 청크 후보)
   - pages/* (pages-analytics 청크 후보)
   - 47차 분석 객관 인계 — 적용은 48차 결정

4. **docs/ 12건 분석 보고서 추가 정찰**
   - V383~389 머지 6건, BUG-008/012, BUG_FIX_FINAL 등
   - 48차 우선순위 5~6 후보

5. **NEXT_SESSION.md 분량 누적 분석** (현재 2,500줄+)
   - 차수별 분리 검토
   - 48차 우선순위 6 후보

# 47차 부수 발견 (메타 영역, 정책 #13 적용 — 등록 안 함, 인계 참조용)

1. **Antigravity GUI 표시 패턴 객관 발견** ⭐⭐⭐
   - **`M` 표시 = git modified 객관 등치** (Cursor/VS Code와 다름)
   - 정책 #10 일반화 (Antigravity + Cursor 동등) 추가 객관 입증
   - 47차 18~19회차 객관 식별 (저장 미진행 추정 → 실제는 git modified 표시)
   - 48차 GUI 작업 시 참조 가치

2. **Not Committed Yet 좌하단 표시 객관 발견** ⭐
   - 디스크 저장 + git untracked 신호
   - GUI 직접 수정 후 객관 확인 가능
   - 정책 #10 GUI 직접 수정 검증 단계 추가 가치

3. **자동 추천 옵션 2번 신규 변종 누적** (44차 + 45차 + 46차 + 47차):
   - `xxd` 영구 승인 (44차)
   - `npm run *` 영구 승인 (44차, 46차, 47차 빈번 등장)
   - `Attribution+경로` 영구 승인 (44차)
   - `grep -nE "^#{1,3} "` 영구 승인 (45차 누적)
   - `awk '{print $5, $NF}'` 영구 승인 (45차 누적)
   - `similar commands in 디렉토리` 단위 영구 승인 (45차 누적)
   - `Yes, allow reading from project\ from this project` 디렉토리 영구 승인 (46차 신규 변종)
   - `Yes, allow all edits during this session` 세션 단위 영구 승인 (46차 빈번 등장)
   - `Yes, and don't ask again for: sed *` 영구 승인 (47차 신규)
   - `Yes, and don't ask again for: git *` 영구 승인 (47차 신규)
   - `Yes, and don't ask again for: awk * 명령` 영구 승인 (47차 신규)

4. **Compound Command 다이얼로그 변종 신규 등장** (47차 신규):
   - `Compound command contains cd with write operation - manual approval required to prevent path resolution bypass`
   - cd + git/sed 복합 명령 시 안전 검증 다이얼로그
   - 정책 #15 흡수 (안전 강화 효과)

5. **명령 변형 누적 사례** (44차 + 45차 + 46차 + 47차):
   - find | sort | while read → for in 변환
   - "Unhandled node type: string" 파서 안내
   - git mv → mv 압축 변형 후 자율 보완
   - npm run build 다단계 → grep 단일 압축 변형
   - `grep -l "t("` → `for f in ...; cnt=$(grep -cP "\bt\s*\(") "$f"; done` (46차 정규식 정밀화)
   - sed 정규식 escape 자율 단순화 (47차 신규)
   - cd 자율 추가 + Compound Command 회피 위반 (47차 신규)
   - PowerShell `;` 자율 변형 (47차 신규)

6. **Claude Code 자율 행동 객관 평가 누적 (47차 결정적)**:

   **차단 결정 7건** ⭐⭐⭐⭐⭐:
   - PowerShell `;` 변형 (47차 2회차)
   - sed 정규식 escape 자율 단순화 (47차 6회차)
   - commit 메시지 객관 왜곡 ("21/21 완전 종결") (47차 10회차)
   - 단계 통합 자율 추가 + cd 자율 추가 (47차 11회차)
   - 검증 단계 자율 누락 (grep main.jsx 첫 단계 제거) (47차 17회차)
   - 본질 분석 + 해결 방향 결정 + 적용 권장 자율 진행 (47차 22회차) ⭐⭐⭐⭐⭐ 결정적
   - 자동 추천 텍스트 재등장 + 차단 명령 후 자율 진행 의지 유지 (47차 23회차)

   **흡수 결정 5건**:
   - 검증 명령 자율 추가 (sed -n '1,10p' 보강) (47차 9회차)
   - add + status 단계 통합 (영향 제한적) (47차 11회차)
   - `git commit --amend` + `force-with-lease push` 자율 활용 (47차 12회차)
   - 검증 + 빌드 단계 자율 분리 (Searched for 2 patterns) (47차 19회차)
   - Circular chunk 자율 분석 결과 (분석 정확성 ⭐, 결정 권한 차단) (47차 22회차)

7. **에디터 환경 객관 등동**: 정책 #10 GUI 에디터 사용자 직접 수정 — Antigravity + Cursor 동등 일관 적용 (47차 일관 적용 객관 입증)

8. **저장 전 검증 정책 객관 가치 입증** (47차 결정적) ⭐⭐⭐⭐⭐
   - 47차 28회차 vite.config.js GUI 수정 시 사용자 "저장 전 검증 부탁" 요청
   - 검수자 객관 식별 (id.js 중복) → 사용자 즉시 수정 → 재검증 → 저장 안전
   - 빌드 실패 또는 manualChunks warning 사전 차단 = +3~5회차 절약
   - 정책 #10 (사용자 GUI 직접 수정) + 저장 전 검증 정책 누적 본질 가치

# 48차 우선순위 후보 (47차 종결 영역에서 객관 결정)

| 우선순위 | 작업 | 권장 회차 |
|---|---|---|
| **우선순위 1 (본질, 별도 분석)** | Journey Builder UI/UX 4건 (12h) — 온보딩 + 용어 단순화 + 모바일 최적화 + 피드백 강화, 정책 #10 사용자 직접 | 8~12 |
| **우선순위 2 (본질, 추가 적용)** | shared-context 청크 추가 (B-1-a) — GlobalDataContext + SecurityGuard + ContaminationGuard + demoSeedData manualChunks 등록 | 5~8 |
| **우선순위 3 (본질, 추가 분석)** | dashboards/* + pages/* 청크 분기 추가 가능성 — manualChunks 추가 분기 분석 + 적용 | 6~10 |
| **우선순위 4 (정리, 선택)** | docs/ 12건 분석 보고서 추가 정찰 (V383~389 머지 6건, BUG-008/012, BUG_FIX_FINAL 등) | 6~10 |
| **우선순위 5 (정리, 선택)** | NEXT_SESSION.md 분량 누적 분석 (현재 2,800줄+, 차수별 분리 검토) | 2~4 |
| 48차 종결 commit | NEXT_SESSION.md + commit/push (단계 통합) | 3 |

# 41차 정착 검수자 운영 전략 (42·43·44·45·46·47차 일관 적용, 48차 유지)

신규 전략 5원칙:
1. 자동 추천 보고 생략 — 등장은 정상 상태, 매번 보고하지 않음 (47차 후반 객관 정정 적용)
2. 명령 일관 패턴 — `t` 접두사 + 한글 시작 (자동 추천 영문과 명확 구분)
3. 다이얼로그 자동 처리 — read-only 명령은 1번 Yes 안전, 위험 명령만 명시 평가
4. 본질 작업 집중 — 검수자 보고는 결과 검증 + 다음 명령만
5. 단계 통합 — add + commit + push 한 번에 (위험 작업만 분리)

# 31차 정착 사용자 정책 (32~47차 유지, 48차 일관 적용)

1. 자동 추천 텍스트 절대 사용 안 함 (덮어쓰기로 차단)
2. 검수자 추천 명령만 진행
3. read-only 명령은 2~6개 묶음 허용 (위험 명령은 단일)
4. t 접두사 회피 패턴
5. 위험 자동 추천 발견 시 즉시 무해 명령(echo)으로 덮어쓰기
6. PAT 등 인증 정보는 사용자만 보관
7. 의심 다이얼로그 발견 시 즉시 멈춤 + 검수자 식별
8. 옵션 2번 영구 자동 승인 절대 선택 금지 (44차+45차+46차+47차 신규 변종 누적: xxd, npm run *, Attribution+경로, grep -nE, awk, similar commands in 디렉토리, project\ 디렉토리 단위, allow all edits during this session 세션 단위, sed *, git *, awk * 명령)
9. 자동 추천 등장 여부 무관 매 단계 t 접두사 일관 적용
10. NEXT_SESSION.md/CLAUDE.md/데이터 파일/코드 파일 등 변경 작업은 사용자 GUI 에디터 직접 수정 (45차 일반화: Antigravity + Cursor 모두 정책 #10 동등 — 47차 일관 적용 객관 입증)
11. Linux-specific Bash 명령 Claude Code 직접 발송 금지 (객관 발견 누적: PowerShell `;` → Bash `&&` 자동 변형, cd/d → cd, findstr → grep, dir → ls, Windows 절대 경로 → Unix 스타일, git mv → mv 압축 변형 후 자율 보완, grep 정규식 정밀화 자율 보강, sed 정규식 escape 자율 단순화 — 47차 신규)
12. (47차 신규) ⭐⭐⭐⭐⭐ **저장 전 검증 정책** — GUI 직접 수정 후 저장 전 사용자 → 검수자 스크린샷 검증 진행, 빌드 실패 + git checkout 사이클 사전 차단

# 42차 → 43차 → 44차 → 45차 → 46차 → 47차 사용자 정책 변경 (48차 유지)

**유지 사항:**
- 자동 추천 변종 추적 / 환경 점검 / 메타 작업 진행하지 않음
- 분석 작업 본질에 집중
- 작업 진행은 가능한 최대한 많이 진행 (45차+46차+47차 정착 — 47차 본질 1건 부분 종결 + 본질 작업 3건 완전 종결 + commit/push 4건 + 신규 발견 5건+ + 인계 정정 5건 누적, 46차 대비 본질 작업 3배 처리 객관 입증)

**유지 사항 (운영 절차):**
- 신규 전략 5원칙 그대로 유지
- 사용자 정책 #1~#12 절대 우선
- 정책 #10 (GUI 에디터 직접 수정) 일반화 적용 (Antigravity + Cursor 동등)
- 정책 #15 (Claude Code 자율 행동 객관 평가 흡수/차단) 운영 패턴 정착
- (47차 신규) 정책 #12 (저장 전 검증) 일관 적용

# 검수자 명시적 운영 지침 (48차 사용자 정책 반영)

1. 매 보고 첫 줄에 "[X차 보고 — 우선순위 N]" 형식
2. 자동 추천 등장 보고 생략 (47차 후반 객관 정정 적용 — 매번 강조 않음)
3. 단계 통합 우선
4. 보고는 결과 검증 + 다음 명령만 (간결화)
5. 우선순위별 회차 상한 도달 시 즉시 알림
6. 디버깅 늪 신호 감지 시 즉시 알림
7. ⭐⭐⭐⭐⭐ 사용자 정책 #1~#12 절대 우선
8. 다이얼로그 처리 안내를 명령 작성 시 미리 포함
9. 명령 변형 위험 회피: PowerShell `;` 사용 금지, 단일 명령 또는 `&&` 직접 사용
10. 48차 종결 시점 결정은 사용자 결정 필수
11. ⭐⭐⭐⭐⭐ 옵션 2번 영구 승인 절대 선택 금지 (44차+45차+46차+47차 누적 변종 포함)
12. ⭐⭐⭐⭐ 산출물 강제 보존 모드 (부분 commit + 세이프티 commit)
13. ⭐⭐⭐⭐⭐ 메타 작업 진행하지 않음. 분석 작업 본질에 집중.
14. ⭐⭐⭐⭐⭐ 작업 진행은 가능한 최대한 많이 진행 (45차+46차+47차 정착 객관 입증, 46차 대비 본질 작업 3배 처리)
15. ⭐⭐⭐⭐ Claude Code 자율 행동 객관 인지 (정책 #2 부분 위반 발생 시 효과 평가 후 흡수 또는 차단 결정 — 47차 운영 패턴 정착, 차단 7건/흡수 5건 객관 누적)
16. ⭐⭐⭐⭐⭐ (47차 신규) **저장 전 검증 정책** — GUI 직접 수정 시 사용자 저장 전 스크린샷 보내기 → 검수자 객관 검증 → 안전 확인 → 저장 진행
17. ⭐⭐⭐⭐ Journey Builder UI/UX 4건 (12h) 진입 시 React Rules of Hooks 사전 평가 + 단계별 commit + 빌드 검증 필수 (48차 우선순위 1 후보)

# 48차 시작 첫 명령 (Claude Code에 입력 예정)

다음 명령으로 47차 종결 시점 정합성을 한 번에 검증한 뒤 즉시 우선순위 1 (Journey Builder 또는 사용자 결정) 진입:

t48차 시작합니다. 47차 종결 시점 정합성 검증 + 우선순위 1 (사용자 결정 필요 — Journey Builder UI/UX 4건 또는 shared-context 청크 추가) 진입 부탁드립니다. git -C "D:\project\GeniegoROI" log --oneline -6 && git -C "D:\project\GeniegoROI" status --short. 추가 설명 없이 raw 출력만 보여주세요. 다이얼로그가 뜨면 1번 Yes 안전합니다 (옵션 2번 절대 금지).

이 명령 결과 스크린샷을 곧 보내드릴 예정입니다. 검수 부탁드립니다.

# 48차 종결 기준

다음 중 하나 이상 충족 시 48차 종결 권장:
- 우선순위 1 부분/완전 종결 (Journey Builder UI/UX 또는 사용자 결정 작업)
- 우선순위 1~3 모두 부분 종결
- 사용자 명시 종결 결정
- 디버깅 늪 신호 3회 이상 누적
- 본질 분석 작업 1건 완전 종결 + 회차 25회 이상 누적
---

# 49차 인계 — 48차 종결 시점

## 48차 종결 시점 git 상태 (확정)
- master HEAD: `8eeb3e4`
- origin/master HEAD: 동일 SHA (동기화 완료)
- working tree: 깨끗
- remote: genie-go/Geniego_ROI.git
- gh CLI 인증: ✅ 유지

## 48차 commit 흐름 (origin/master 반영 완료)
- `8eeb3e4` build(vite): add shared-context chunk to manualChunks (48차 priority 1) — GlobalDataContext + SecurityGuard, B-1-a 후보 4개 -> 2개 객관 정정, build success 19.63s, shared-context 86.47 kB
- `5006fc5` (47차 종결)

## 48차 핵심 성과

1. **shared-context 청크 추가 완전 종결** ⭐⭐⭐⭐⭐
   - GlobalDataContext.jsx (91 KB, 214건 import) + SecurityGuard.js (21 KB, 174건 import)
   - 빌드 19.63s + shared-context 청크 86.47 kB (gzip 30.81 kB) 객관 등장
   - 47차 vendor-locales 패턴 동일 적용

2. **47차 인계 진단 정정 8건 누적** (12번~20번)
   - 12. Claude Code 자율 진단 명령 흡수 패턴 객관 정착
   - 13. B-1-a 후보 4개 → 2개 객관 정정 (ContaminationGuard + demoSeedData import 3건만 → 분리 효과 미미)
   - 14. 검수자 명령 설계 본인 평가 — 추측 기반 패턴 작성 금지 + hex 덤프 우선 절차
   - 15. frontend/vite.config.js 들여쓰기 비정상 (10칸/8칸/12칸, 일반 패턴 4칸과 차이)
   - 16. 47차 5cb2cef commit 시점 들여쓰기 잔존 추정
   - 17. context + contexts 이중 디렉토리 객관 등장 (47차 인계 미기록)
   - 18. dashboards 디렉토리 미존재 (47차 인계 우선순위 3 후보 본질 무효)
   - 19. pages 디렉토리 100+ 파일 (단일 청크 분리 효과 미미)
   - 20. 우선순위 3 본질 가치 객관 ↓ (index 254 KB, 8 MB 임계 충분 안전)

3. **정책 #15 차단/흡수 결정 패턴 결정적 정착** ⭐⭐⭐⭐⭐
   - 차단 결정 누적 8건+ (자율 명령 자동 생성 + 검수자 명령 변형, 47차 22회차 패턴 결정적 재현)
   - 흡수 결정 누적 14건+ (read-only 진단 + 사용자 승인 단계 보존)
   - 47차 22회차 분석 흡수 + 결정 권한 차단 패턴 결정적 정착

4. **회차 효율**: 18/25 (47차 30/25 대비 우선순위 1 1건 종결 + 정책 메타 누적 16건)

## ⭐⭐⭐⭐⭐ 48차 결정적 운영 패턴 (49차 일관 적용 필수)

### 1. 정책 #11 신규 변종 + 신규 경고 메시지 5건 객관 누적

⭐ **47차+48차 누적 다이얼로그 경고 메시지**:
- `Command contains script block that may execute arbitrary code` (script block 사용 시)
- `Command contains malformed syntax that cannot be parsed: Command too long for parsing (974 bytes)` (948 bytes 초과)
- `Command invokes .NET methods` (.NET API 사용 시) — ⭐ 48차 신규
- `Compound command contains cd with path operation` (Set-Location + ; + 다른 명령 복합) — ⭐ 48차 신규

⭐ **48차 정책 #8 변종 누적**:
- `Yes, and don't ask again: <복합 명령 단위>` (script block + 디스크 쓰기 + 외부 입력)
- `Yes, and don't ask again for: git checkout *` — ⭐ 48차 신규
- `Yes, and don't ask again for: Get-Content *` — ⭐ 48차 신규
- `Yes, and don't ask again for: npm run *` (예상)
- 모든 변종 = **2번 영구 승인 절대 금지** 일관 적용

### 2. ⭐⭐⭐⭐⭐ 추측 기반 패턴 작성 금지 + hex 덤프 우선 절차 본질 정착

48차 9회차+10회차 검수자 명령 설계 본질 오류 객관 누적:
- 9회차: `\r\n` 패턴 (CRLF 가정) → 패턴 미일치
- 10회차: `` `n `` 패턴 (LF 가정) → 패턴 미일치
- ⭐ 본질 정정: hex 덤프 객관 분석으로 **CRLF + 들여쓰기 10칸/8칸** 확정

⭐ **49차 일관 적용 필수**: 디스크 패턴 매칭 시 추측 기반 패턴 작성 절대 금지 + hex 덤프 객관 분석 우선

### 3. 사용자 GUI 직접 수정 패턴 한계 객관 발견

48차 7회차~9회차 사용자 GUI 직접 수정 시도 2회 실패 누적:
- Antigravity 자동 들여쓰기 + 자동 빈 줄 추가 동작과 충돌 위험 ↑
- 신규 4줄 모두 사라짐 (Ctrl+Shift+K 다중 적용) + 코드 무너짐

⭐ **결정적 패턴 변경**: PowerShell 텍스트 치환 명령 채택 (정책 #10 본질 가치 보존 — 사용자 GUI 검토 가능성 + 코드 변경 추적)
- Claude Code 직접 수정 회피 (검수자 본인 명령 + 사용자 1번 Yes 승인)
- 정책 #12 (저장 전 검증) 동등 적용 (치환 후 사용자 GUI 검증 + 빌드 검증)

### 4. 47차 본질 오류 정정 5건 누적

- ⭐ src 디렉토리 = `frontend/src` (47차 인계 미기록, 검수자 명령 src 자율 보정 흡수)
- ⭐ frontend/vite.config.js L7 `chunkSizeWarningLimit: 8000` (47차 미기록)
- ⭐ frontend/vite.config.js 들여쓰기 비정상 (10칸/8칸/12칸)
- ⭐ 검수자 7회차+8회차 GUI 안내 들여쓰기 본질 오류 (6칸/4칸/8칸 추정 → 실제 10칸/8칸/12칸)
- ⭐ Claude Code 9회차 LF 진단 객관 오류 (실제 CRLF) → 11회차 자율 hex 덤프로 자율 정정

### 5. ⭐⭐⭐⭐⭐ 검수자 보고 길이 제어 본질 가치 재입증

48차 11회차 사용자 피드백:
> "자율 명령어 자동 생성건에 대해서 설명이 너무 길어서 무슨 말인지 오히려 혼란 가중됩니다 짧게 설명하고 진행을 하였으면 합니다"

⭐ 47차 정책 #14 신규 전략 5원칙 #4 (검수자 보고 간결화) 재정착 객관 입증
⭐ **49차 일관 적용 필수**: 검수자 보고는 결과 검증 + 다음 명령만 (간결화 강화)

## 49차 우선순위 후보

| 우선순위 | 작업 | 권장 회차 |
|---|---|---|
| **우선순위 1** | Journey Builder UI/UX 4건 (12h) — 47차 인계 우선순위 1 후보, 사용자 직접 GUI (정책 #10) | 8~12 |
| **우선순위 2 (정리)** | docs/ 12건 분석 보고서 추가 정찰 (V383~389 머지 6건, BUG-008/012, BUG_FIX_FINAL 등) | 6~10 |
| **우선순위 3 (정리)** | NEXT_SESSION.md 분량 누적 분석 (현재 약 3,000줄+, 차수별 분리 검토) | 2~4 |
| **우선순위 4 (검토)** | frontend/vite.config.js 들여쓰기 정정 (10칸/8칸 → 4칸 일관) — 코드 동작 무관, 스타일 일관성 | 3~5 |
| **우선순위 5 (검토 보류)** | pages 카테고리별 청크 분기 분석 — 본질 효과 미확정, 분석 회차 ↑↑ | 8~12 |
| 49차 종결 commit | NEXT_SESSION.md + commit/push (단계 통합) | 3 |

## 41차 정착 검수자 운영 전략 (42~48차 일관 적용, 49차 유지)
신규 전략 5원칙:
1. 자동 추천 보고 생략 (등장은 정상 상태)
2. 명령 일관 패턴 — `tt` 접두사 + 한글 시작
3. 다이얼로그 자동 처리 — read-only 명령은 1번 Yes 안전
4. ⭐ **검수자 보고 간결화** (48차 결정적 재입증)
5. 단계 통합 — add + commit + push 한 번에

## 31차 정착 사용자 정책 (32~48차 유지, 49차 일관 적용)

1. 자동 추천 텍스트 절대 사용 안 함 (덮어쓰기로 차단)
2. 검수자 추천 명령만 진행
3. read-only 명령은 2~6개 묶음 허용 (위험 명령은 단일)
4. tt 접두사 회피 패턴 (47차+48차 객관 정착)
5. 위험 자동 추천 발견 시 즉시 무해 명령(echo)으로 덮어쓰기
6. PAT 등 인증 정보는 사용자만 보관
7. 의심 다이얼로그 발견 시 즉시 멈춤 + 검수자 식별
8. 옵션 2번 영구 자동 승인 절대 선택 금지 (44~48차 누적 변종 다수: xxd, npm run *, Attribution+경로, grep -nE, awk, similar commands in 디렉토리, project\ 디렉토리 단위, allow all edits during this session 세션 단위, sed *, git *, awk *, **48차 신규: git checkout *, Get-Content *, .NET methods, Compound cd**)
9. 자동 추천 등장 여부 무관 매 단계 t 접두사 일관 적용
10. NEXT_SESSION.md/CLAUDE.md/데이터/코드 파일 변경은 사용자 GUI 직접 수정 (47차 일반화: Antigravity + Cursor 동등) — ⭐ **48차 한계 발견** (Antigravity 자동 들여쓰기 충돌 위험, PowerShell 텍스트 치환 대안 채택)
11. Linux-specific Bash 명령 Claude Code 직접 발송 금지 (47차+48차 누적 변형: PowerShell `;` → Bash `&&` 자동 변형, cd → 회피, findstr → grep, dir → ls, Windows 절대 경로 → Unix 스타일, git mv → mv 압축 변형, grep 정규식 정밀화 자율 보강, sed 정규식 escape 자율 단순화, **48차 신규: Set-Content → .NET WriteAllText 자율 변형, Compound cd 경로 변조 경고**)
12. **(47차 신규) ⭐⭐⭐⭐⭐ 저장 전 검증 정책** — GUI 직접 수정 후 저장 전 사용자 → 검수자 스크린샷 검증, 빌드 실패 + git checkout 사이클 사전 차단 — ⭐ **48차 결정적 본질 가치 재입증** (5회차 잘못된 파일 수정 사전 차단 + 8회차 들여쓰기 미세 이슈 대안 채택)

## 검수자 명시적 운영 지침 (49차 사용자 정책 반영)

1. 매 보고 첫 줄에 "[X차 보고 — 우선순위 N]" 형식
2. 자동 추천 등장 보고 생략 (47차 후반 객관 정정)
3. 단계 통합 우선
4. ⭐⭐⭐⭐⭐ **보고는 결과 검증 + 다음 명령만 (간결화 강화)** — 48차 결정적 재입증
5. 우선순위별 회차 상한 도달 시 즉시 알림
6. 디버깅 늪 신호 감지 시 즉시 알림
7. ⭐⭐⭐⭐⭐ 사용자 정책 #1~#12 절대 우선
8. 다이얼로그 처리 안내를 명령 작성 시 미리 포함
9. 명령 변형 위험 회피: PowerShell `;` 사용 금지, 단일 명령 또는 `&&` 직접 사용
10. 49차 종결 시점 결정은 사용자 결정 필수
11. ⭐⭐⭐⭐⭐ 옵션 2번 영구 승인 절대 선택 금지 (47차+48차 누적 변종 포함, **신규 변종 등장 가능성 일관 추적**)
12. ⭐⭐⭐⭐ 산출물 강제 보존 모드 (부분 commit + 세이프티 commit)
13. ⭐⭐⭐⭐⭐ 메타 작업 진행하지 않음. 분석 작업 본질에 집중.
14. ⭐⭐⭐⭐⭐ 작업 진행은 가능한 최대한 많이 진행
15. ⭐⭐⭐⭐ Claude Code 자율 행동 객관 인지 (정책 #2 부분 위반 발생 시 효과 평가 후 흡수 또는 차단 결정 — 47차+48차 정책 정착, **차단 8건+/흡수 14건+ 객관 누적**)
16. ⭐⭐⭐⭐⭐ **(47차 신규) 저장 전 검증 정책** — GUI 직접 수정 시 사용자 저장 전 스크린샷 → 검수자 객관 검증 → 안전 확인 → 저장 진행 (**48차 본질 가치 재입증**)
17. ⭐⭐⭐⭐ Journey Builder UI/UX 4건 (12h) 진입 시 React Rules of Hooks 사전 평가 + 단계별 commit + 빌드 검증 필수 (49차 우선순위 1 후보)
18. ⭐⭐⭐⭐⭐ **(48차 신규) 추측 기반 패턴 작성 금지 + hex 덤프 우선 절차** — 디스크 패턴 매칭 시 일관 적용

## 49차 시작 첫 명령

t49차 시작합니다. 48차 종결 시점 정합성 검증 + 우선순위 1 (사용자 결정 필요) 진입 부탁드립니다. git -C "D:\project\GeniegoROI" log --oneline -6 && git -C "D:\project\GeniegoROI" status --short. 추가 설명 없이 raw 출력만 보여주세요. 다이얼로그가 뜨면 1번 Yes 안전합니다 (옵션 2번 절대 금지 + 신규 변종 .NET methods/git checkout */Compound cd 모두 절대 금지).

## 49차 종결 기준

다음 중 하나 이상 충족 시 49차 종결 권장:
- 우선순위 1 부분/완전 종결
- 우선순위 1~3 모두 부분 종결
- 사용자 명시 종결 결정
- 디버깅 늪 신호 3회 이상 누적
- 본질 분석 작업 1건 완전 종결 + 회차 25회 이상 누적
---

# 49차 종결 결과 (2026-05-08)

## 종결 시점 git 상태
- master HEAD: c26d54e (변경 없음)
- working tree: clean (commit 없이 종결)

## 49차 핵심 성과 3건

### 1. PHP 서버 변환 작업 = 불필요 확정
- .py 30개 = 모두 로컬 개발 도구 (jsx 수정/i18n 동기화/JSON 패치/Claude API)
- frontend/dist/ 빌드 산출물 = 정적 파일 + .htaccess만
- .py 호출 흔적 없음 (.htaccess + index.html grep 검증)

### 2. docs/ Claude Code 환상 출력 정정
- 11회차 ls 출력에 BUG_010_DEBUG_CODE_FIX.md 등 4개 환상 파일
- 24회차 cmd /c dir 교차 검증 → 환상 출력 확정
- 실제 파일명: BUG-010_DEBUG_CODE_FIX.md (하이픈+언더스코어 혼합)
- BUG 12건 헤더 정찰 → 모두 정상 (P0~P4 Resolved)

### 3. 검수자 본인 진단 오류 자가 정정 2건
- 27차: vite.config.js 들여쓰기 4칸 과잉 → 32차 GUI 직접 검증 → 정상 2칸 (정정 불필요)
- 35차: NEXT_SESSION.md 분량 2174줄 → 39차 GUI 직접 검증 → 실제 2916줄

## 49차 정책 변경 (50차 일관 적용)

### 정책 #1 강화 (사용자 22회차 결정)
- 검수자 우선 진행 (Claude Code 자율 추천 무조건 폐기)

### 정책 #8 신규 변종 누적
- Test-Path *
- .NET methods: [regex]::Escape, $string.Contains, $string.Replace
- 회피: -replace 연산자 또는 GUI 직접 수정

### GUI 수정 안내 표준 형식 정착 (사용자 34회차 요청)
- 파일/라인/수정 전/수정 후/Step별 절차 명시

## 49차 회차: 39회차 (종결 시 41~42 예상)

## 50차 시작 첫 명령
```
t50차 시작합니다. 49차 종결 시점 정합성 검증 부탁드립니다. git -C "D:\project\GeniegoROI" log --oneline -6 && git -C "D:\project\GeniegoROI" status --short. raw 출력만. 다이얼로그 1번 Yes 안전 (옵션 2번 절대 금지 + 신규 변종 .NET methods/git checkout */Get-Content */Compound cd/Test-Path * 모두 절대 금지).
```
## 50차 우선순위 1 (사용자 41회차 결정) — NEXT_SESSION.md 전체 재정리

### 현재 상태
- 라인: 2962줄
- 크기: 200+ KB
- 누적: 18~49차 인계 단일 파일

### 재정리 목표
- 라인: 1000줄 이내
- 크기: 100 KB 이내
- 보존: 핵심 정책 + 48~49차 운영 패턴 + 50차 인계만
- 폐기: 18~47차 legacy 인계 (별도 archive 파일로 분리)

### 재정리 방법 (50차 1회차 검수자 제안)
1. NEXT_SESSION_ARCHIVE_18_47.md 신규 파일 생성 → legacy 인계 이전
2. NEXT_SESSION.md 핵심만 유지 (48~49차 운영 패턴 + 정책 #1~#15)
3. 검수자 GUI 수정 안내 표준 형식 보존
4. 50차 시작 첫 명령 + 50차 종결 기준 명시

### 50차 회차 예상
- 우선순위 1: 5~10회차
- 본질 작업 추가: 5~10회차 (Journey Builder UI/UX 일부)
- 종결: 회차 20~25

---
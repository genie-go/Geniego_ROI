# 61차 종결 (2026-05-10)

## 61차 누적 commits 3건
- 7b00e25 — perf(Attribution): wrap remaining 6 components with React.memo
- 4b1a87c — perf(InfluencerUGC): wrap 5 main tab components with React.memo
- c2696c2 — perf(PerformanceHub): wrap 4 main tab components with React.memo

## 61차 종결 시점 git 상태
- master HEAD: c2696c2
- origin/master HEAD: c2696c2 (push 완료)
- working tree: 깨끗
- CI/CD 파이프라인: 트리거됨

## 61차 본질 작업 3건

### Track Q-cont — Attribution.jsx 잔여 6 memo 종결 (7b00e25)
- 완료 6개: LtvCacTab (751), AnomalyMiniChart (810), AnomalyTab (825), RadarChart (913), ModelCompareTab (946), GuideTab (1067)
- 빌드: 61.41 kB (gzip 17.66 kB)

### Track R — InfluencerUGC.jsx 5 main tabs memo (4b1a87c)
- import에 memo 추가
- 완료 5개: IdentityTab (53), ContractTab (138), SettleTab (308), ROITab (479), InfluencerGuideTab (628)
- 보류 1개: UGCTab (682) — return 위치 모호로 보류
- 보조 미적용: Stars (46), AIGauge (851), AIGrade (864), CreatorScoreModal (876), Section (992), AIEvalTab (1014)
- 빌드: 67.17 kB (gzip 15.91 kB)

### Track R-2 — PerformanceHub.jsx 4 main tabs memo (c2696c2)
- import에 memo 추가
- 완료 4개: PerformanceTab (77), SettlementTab (339), CreatorTab (501), SKUProfitTab (749)
- 보류/미착수: ESGTab (913), CohortTab (840), PerfGuideTab (953)
- 보조 미적용: SecurityOverlay (16), KpiCard (49), MiniBar (62), Trend (310)
- 빌드: 50.28 kB (gzip 12.01 kB)

## 60차 회차 ~110, 본질 비중 ~95%

## 60차 신규 학습
1. PowerShell Out-File -Encoding UTF8이 한글 깨짐 유발 — Read+Write 툴로 우회 필수
2. Claude Code Read 툴은 한글 정상 처리 (Out-File과 인코딩 동작 다름)
3. function declaration memo 래핑 시 시작/끝 별도 Edit, 다음 컴포넌트 주석을 unique 컨텍스트로 활용
4. Conversation auto-compact 임박 시 안전 commit + push 우선 → 다음 차수 인계
5. 자율 추천 commit 메시지 영문화 학습 효과 — Claude Code가 정책 #5 학습 가능성 시사

## 60차 신규 정책
**정책 #19**: 한글 포함 파일 분할/추출 시 PowerShell Out-File 절대 사용 금지. Claude Code Read+Write 툴로 직접 추출하여 인코딩 무결성 보장.

## 미해결 우선 이슈 (60차 시점 그대로)
- BUG-008: 일부 진행 (JourneyBuilder + Topbar + AIInsights + WmsManager + CatalogSync 완료, 추가 컴포넌트 잔여)
- 광고 플랫폼 커넥터 UI 부재 (High Priority)
- 실시간 주문 수집 API 미연동 (High Priority)
- 택배사 API 미연동 (High Priority)
- 마케팅 대행사용 핵심 기능 미착수
- Attribution.jsx 잔여 6개 memo 래핑 (61차 Track Q 연장)

## 61차 우선순위

### Track Q-cont — Attribution.jsx 잔여 6개 memo (1순위, 본질, 60차 연장)
- LtvCacTab, AnomalyMiniChart, AnomalyTab, RadarChart, ModelCompareTab, GuideTab
- 회차: ~30 예상

### Track R — 다음 React.memo 후보 (2순위, 본질)
- 후보: InfluencerUGC.jsx (1273줄), PerformanceHub.jsx (1084줄), RollupDashboard.jsx (1103줄), AutoMarketing.jsx (1053줄)
- 권장: InfluencerUGC.jsx (마케팅 도메인 일관성)

### 진행 순서: Q-cont → R
### 총 예상 회차: 60-80
# GeniegoROI 다음 세션 인수인계 문서

> Last Updated: 2026-05-09 (52차 종결)
> Last Commit hash: 8aa7a8e (52차 우선순위 1 종결 - Journey Builder 용어 단순화)

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


> 44차~48차 작업 기록은 NEXT_SESSION_ARCHIVE_44_48.md 로 분리 (51차)
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

# 50차 종결 결과 (2026-05-08)

## 50차 commit (a5288ad) — push 완료
- NEXT_SESSION.md 재정리 (1766줄 삭제 / 1767줄 삽입)
- NEXT_SESSION_ARCHIVE_23_43.md 신규 생성 (1767줄)
- 23~43차 세션 기록 분리 완료

## 50차 핵심 성과
1. 우선순위 1 완전 종결 — NEXT_SESSION.md (2787 → 1138줄 / Get-Content 기준)
2. ARCHIVE 분리 정합성 검증 (working tree clean)
3. 검수자 진단 자가 정정 다수 (12회차/23회차/29회차/36회차 등)

## 50차 회피 패턴 (정책 #8 추가)
- Get-Content + Set-Content 파이프라인 (UTF-8 BOM 손상)
- .NET API ([System.IO.File], [System.Text.UTF8Encoding] 등)
- code 외부 명령 (VS Code 새 인스턴스 충돌)
- 한글 IME 상태 GUI Find & Replace 따옴표 직접 입력 (구문 오류 다발)

## 우선순위 2 보류 (51차 이월)
Journey Builder UI/UX 4건 작업 중 "용어 단순화" 시도 — 한글 IME 작은따옴표 입력 문제로 33→58건 빌드 에러 반복 발생, 백업 복원으로 완전 복구 후 보류 결정.

---

# 51차 우선순위

## 우선순위 1 — Journey Builder 용어 단순화 (이월)
- 사전 매핑표 작성 (.bak 파일 + diff 도구)
- PowerShell 자동 치환 스크립트 (인코딩 안전 검증 후)
- Phase 1 (4건 핵심 용어) → 빌드 검증 → Phase 2 (가이드 텍스트)
- 회차: 8~12

## 우선순위 2 — Journey Builder 나머지 3건 (UX 개선)
- 1번 온보딩 (4h)
- 3번 모바일 최적화 (3h)
- 4번 피드백 강화 (2h)
- 회차: 12~18

## 우선순위 3 — NEXT_SESSION.md 추가 감축 (선택)
- 현재 1138줄 → 목표 1000줄 (138줄 감축)
- 회차: 3~5

# 51차 시작 첫 명령

t51차 시작합니다. 50차 종결 commit 정합성 검증 부탁드립니다. git -C "D:\project\GeniegoROI" log --oneline -8 && git -C "D:\project\GeniegoROI" status --short && (Get-Content -Path "D:\project\GeniegoROI\NEXT_SESSION.md" | Measure-Object -Line).Lines. raw 출력만. 다이얼로그 1번 Yes 안전 (옵션 2번 절대 금지 + 신규 변종 .NET methods/Get-Content+Set-Content 파이프라인/code 외부 명령/한글 IME 따옴표 입력 모두 절대 금지).
---

## 51차 종결 결과 (2026-05-09)

### 51차 핵심 성과

1. 우선순위 3 완전 종결 - NEXT_SESSION.md 358줄 감축 (953 to 595, 목표 138 2.6배 초과)
2. NEXT_SESSION_ARCHIVE_44_48.md 신규 생성 (457줄, 50차 23~43차 패턴 동일 재현)
3. .gitignore bak 패턴 추가 - 백업 파일 git 제외 (NEXT_SESSION.md.bak*)

### 51차 회피 패턴 (정책 8 추가 변종 1건)

- EUC-KR 또는 CP949 인코딩 markdown 파일에서 Select-String 한글 정규식 매칭 실패
- 회피: type cmdlet 또는 GUI Outline 직접 사용
- 사례: 51차 시 한글/영문 키워드/i18n 패턴 모두 7회 0건 매칭

### 51차 commit 흐름

- 87697d4 docs(session): 51차 종결 - NEXT_SESSION 358줄 감축 + 44~48차 ARCHIVE 분리
- df6df96 (50차 종결)

### 51차 종결 시점 git 상태

- master HEAD: 87697d4 (이 종결 인계 추가 후 추가 commit 예정)
- origin/master HEAD: 87697d4 동기화 완료
- working tree: NEXT_SESSION.md 변경 (이 종결 섹션 추가)

---

## 52차 우선순위 (51차 인계)

### ✅ 우선순위 1 종결 (52차 완료) - Journey Builder 용어 단순화

- **52차 commit**: 8aa7a8e (2026-05-09)
- 매핑: 여정→경로(24건) / 단계→과정(2건) / 액션→동작(2건) — 총 28건+
- 수정 범위: JourneyBuilder.jsx FB 한글 fallback 객체 (L106~178)
- 빌드 검증: built in 25.06s, 에러 없음 (50차 33→58 빌드 에러 회피 검증)
- 전략: K 변수명 무수정 → 35개 jsx 파일 무수정 (locale fallback만 수정)
- 누적 보류 (50차+51차) → 52차 종결

### 우선순위 2 - Journey Builder 나머지 3건 (UX 개선)

- 1번 온보딩 (4h)
- 3번 모바일 최적화 (3h)
- 4번 피드백 강화 (2h)
- 회차: 12 to 18

### 우선순위 3 - NEXT_SESSION.md 추가 감축 (선택)

- 51차에서 358줄 감축 완료 (목표 초과)
- 추가 감축 필요시 14 to 22차 영역 (현재 L48 to L536) ARCHIVE 분리 검토
- 회차: 3 to 5

### 52차 종결 기준

- 우선순위 1 완전 종결 또는
- 사용자 명시 종결 결정
- 본질 분석 작업 1건 완전 종결 + 회차 25 이상 누적
---

# 52차 시작 첫 명령

t52차 시작합니다. 51차 종결 commit 5f640aa 정합성 검증 부탁드립니다. (사용자 지시)

# 52차 종결 결과 (2026-05-09)

## 52차 핵심 성과 3건 (51차 표준 유지)

1. **우선순위 1 본질 작업 완전 종결** — Journey Builder 용어 단순화 28건+ commit 8aa7a8e (50차+51차 누적 보류 → 52차 종결)
2. **JourneyBuilder.jsx FB 한글 fallback 객체 28건+ 수정** — 매핑: 여정→경로(24건), 단계→과정(2건), 액션→동작(2건). K 변수명 무수정 전략으로 35개 jsx 무수정 → built in 25.06s, 에러 없음
3. **.gitignore에 *.bak*_pre_* 패턴 추가** — 회차별 사전 백업 파일 git 제외 (51차 NEXT_SESSION.md.bak* 패턴 확장)

## 52차 회피 패턴 신규 발견

- 없음 (51차 누적 패턴 8종 그대로 유지, 신규 변종 미발생)

## 52차 회차: 57 (종결 시점, 53차에서 정정)

# 53차 우선순위 (52차 인계)

## 우선순위 1 — Journey Builder UX 개선 3건 (이월, 51차+52차 우선순위 2)
- ✅ 1번 온보딩 (4h) — 53차 완료 (commit d10fdb8)
- ⬜ 3번 모바일 최적화 (3h) — 잔여
- ✅ 4번 피드백 강화 (2h) — 53차 완료 (commit 0c72312)
- 회차: 12 to 18

## 우선순위 2 — NEXT_SESSION.md 추가 감축 (선택, 51차 우선순위 3 이월)
- 51차에서 358줄 감축 완료 (목표 초과)
- 추가 감축 필요 시 14 to 22차 영역 (현재 L48 to L536) ARCHIVE 분리 검토
- 회차: 3 to 5

## 53차 종결 기준
- 우선순위 1 완전 종결 또는
- 사용자 명시 종결 결정
- 본질 분석 작업 1건 완전 종결 + 회차 25 이상 누적

---

## 53차 진행 (종결 시점)

### 53차 회차: 56+ (종결 시점)

### 53차 본질 작업 종결 2건
1. 우선순위 1-4 피드백 강화 종결 (commit 0c72312) - JourneyBuilder Toast 6 handlers
2. 우선순위 1-1 온보딩 모달 종결 (commit d10fdb8) - showOnboarding state + localStorage detection + 3 buttons modal

### 53차 빌드 검증
- 4번 commit 후: built in 19.86s, JourneyBuilder chunk 52.44kB
- 1번 commit 후: built in 19.37s, JourneyBuilder chunk 54.45kB (+2.01kB)
- warning 0건, error 0건

### 53차 정착 정책 (54차 인계)
- Claude Code Edit 툴 검수자 명시 명령 사용 (정책 #1 위반 X) - GUI 직접 수정 사고 회피
- npm --prefix "PATH" run build 패턴 - cd 결합 명령 회피
- Antigravity 자동 입력 명령은 Enter 안 먹음 - 사용자 직접 붙여넣기 필요 (정책 #5 변종)

### 54차 우선순위 1 잔여 → 완료
- 3번 모바일 최적화 (모바일 카드 뷰) ✅

---

## 54차 종결 결과

### 완료 commit
- 1e3e5da: feat(ux): 54cha priority 1-3 - JourneyBuilder mobile optimization (Hero/header/buttons/Sub-tab/Content)
- 8acb28e: feat(ux): 54cha priority 1-3 extension - JourneyBuilder Onboarding modal + mobile card view (hybrid B+C)

### 본질 작업 비중
- 회차 65 누적 (예상)
- 본질 작업 commit 2건 (1e3e5da + 8acb28e)
- Edit 툴 11건 적용 (사용자 직접 수정 0%)

## 55차 우선순위 (인계)
- 우선순위 1: design tokens + theme provider 도입 (1차 인프라)
- 우선순위 2: 모듈 분리 (점진 마이그레이션)

---

## 55차 진행 (종결 시점)

### 본질 작업 1건 — design tokens SSoT 분리 완료
- commit 76e78ad: feat(theme): 55ch priority 1 - design tokens SSoT extraction (tokens.js new)
- frontend/src/theme/tokens.js 신설 (100줄, 6개 테마 vars 객체 + defaultTheme + themeKeys export)
- frontend/src/theme/ThemeContext.jsx 마이그레이션 (229→144줄, vars 하드코딩 85줄 제거, import 사용 전환)
- 빌드 검증 통과 (20.77s, 에러 0건)
- shared-context chunk 정상 생성

### 55차 정책 준수 결과
- 정책 #1 (검수자 명령 우선): 100% 준수 (자율 추천 매번 t 덮어쓰기)
- 정책 #4 (commit 메시지 ASCII): 100% 준수
- 정책 #8 (옵션 2번 영구 승인 절대 금지): 100% 준수
- 정책 #11 (Linux Bash 회피): npm --prefix 패턴 사용
- 사용자 직접 저장 0%: 100% 달성 (54차 계승)

## 56차 우선순위 (인계)
- 우선순위 1: styles.css :root 토큰 자동 생성 (Phase 2) — tokens.js를 SSoT로 styles.css L1~83 :root 블록 동적 주입, JS/CSS 이중 관리 해소
- 우선순위 2: 5단 breakpoint + CSS 모듈 분리 (54차 인계 항목 잔여)
- 우선순위 3: 다른 페이지 모바일 최적화 이식 (DbAdmin, FeedbackCenter, EmailMarketing — 54차 hybrid B+C 패턴 이식)

### 56차 진입 전 사전 결정 사항
- 우선순위 3: 다른 페이지 모바일 최적화 이식 (DbAdmin/FeedbackCenter 등)

---

## 56차 결산 (commit dd93210 기준)

## 56차 본질 commits (3건)

| 커밋 | 트랙 | 내용 |
|---|---|---|
| 8ddb455 | Track C | JourneyBuilder bak52/53/54 .archive/ 이관 + .gitignore |
| b6de084 | Track B-1 | tokens.js deep_space 순환참조 버그 수정 (--bg, --surface 직접 hex) |
| dd93210 | Track B-2 | sync-css-tokens.cjs 신규 + styles.css :root SSoT 동기화 + --accent 추가 |

## Track A (BUG-005 XSS) 검증 결과
- 7건 dangerouslySetInnerHTML 사용 모두 sanitizeHtml 래핑 확인
- xssSanitizer.js의 sanitizeHtml = DOMPurify.sanitize 직접 호출 검증 (L36)
- 결론: BUG-005는 이미 완전 해소된 상태. 추가 작업 0건. PM_PRIORITY_PLAN.md에서 closed 처리 권장.

## 신규 인프라
- frontend/scripts/sync-css-tokens.cjs (60줄): tokens.js arctic_white -> styles.css :root in-place 패치
- 사용법: cd frontend; node scripts/sync-css-tokens.cjs
- 다음 차수 검토: package.json에 npm script 등록, prebuild hook 도입

## 56차 신규 학습
- PowerShell -Filter 옵션은 일부 환경에서 미동작, glob 패턴 직접 사용 권장
- Select-String이 한글 인코딩 파일에서 매칭 실패 가능, Get-Content -Raw + 정규식 우회
- styles.css :root는 단순 폴백이 아니라 디자인 시스템 전역 변수(팔레트, radius, shadow, fs, sp, font 등)도 보유
- 통째 교체 위험, in-place 라인별 패치 필수
- patchRootBlock 반환 시 stylesSrc.replace 감싸기 누락 주의 (파일 헤더 손실 위험)
- Claude Code 자율 Edit 추천 발견 시 옵션 다이얼로그 1번 Yes만, 2번 (allow all edits during this session) 절대 금지

## 57차 우선순위 후보
1. PM_PRIORITY_PLAN.md 갱신 (BUG-005 closed 반영)
2. package.json sync:tokens npm script 등록
3. BUG-008 React 최적화 (P3)
4. 광고 플랫폼 커넥터 UI (High Priority)

---

## 57차 결산 (commit 0155fb3 기준)

### Track D — PM_PRIORITY_PLAN.md BUG-005 closed (44bbaf9)
- L33: 미해결 카운트 2개/18% → 1개/9%
- L34: BUG-005 → ~~BUG-005~~ closed (56차)
- L361: BUG-005 Week 3 → closed 표기

### Track E — frontend/package.json sync:tokens npm script (a468070)
- "sync:tokens": "node scripts/sync-css-tokens.cjs"
- 동작 검증: [sync-css-tokens] no change (already in sync)

### Track F — JourneyBuilder.jsx React.memo 3건 (c68b0f3)
- DonutChart, HBarChart, FlowPreview memo 래핑
- memo import 추가 (L15)
- 빌드: 18.84s, 청크 60.78→57.72 kB (-3.06 kB)
- Backdrop은 효용 낮아 의도적 스킵

### Track G — Topbar.jsx React.memo 3건 (0155fb3)
- NotificationDropdown, ProfileDropdown, ProfileEditModal memo 래핑
- memo import 추가 (L5)
- 빌드: 18.95s, index.js 254.28→254.31 kB (+0.03 kB, memo 래퍼 오버헤드)
- 파일 위치: frontend/src/layout/Topbar.jsx (components 아님)

### 57차 회차 / 본질 비중
- 회차: ~70
- 본질 비중: ~95%
- GUI 직접 수정: 0% (정책 #10 100% 달성)

### 57차 신규 학습 (정책 #16, #17 추가)
- 정책 #16: 자율 추천 백틱(`) 포함 시 무조건 검수자 명령 덮어쓰기
- 정책 #17: Bash 자동 변환(cd && npm) 발견 시 즉시 Esc + npm --prefix 직접 발송
- React.memo 패턴: function declaration → const = memo(function ...) 변환, 닫는 } → });
- 청크 크기 변화로 memo 효과 측정 가능

---

## 58차 결산 (Track H/I — 본질 2건 종결)

### Track H — NEXT_SESSION.md 57차 결산 추가 (4339d29)
- 36 insertions, 1 deletion
- 4건 트랙 (D/E/F/G) 결산 + 회차/본질% + 정책 #16/#17 학습 추가

### Track I — AIInsights.jsx React.memo 7건 (fcd4fbc)
- 자식 컴포넌트 7개 memo 래핑
- InsightCard (L58/L87), ChatMsg (L90/L121), InsightCardsTab (L124/L154)
- TrendsTab (L157/L222), AIAssistantTab (L225/L299)
- HistoryTab (L302/L338), GuideTab (L341/L367)
- memo import 추가 (L1)
- 빌드 검증: 33s, AIInsights-B4twpbtS.js 26.97 kB (gzip 9.01 kB)
- SecurityOverlay (L17): 의도적 스킵 (props 빈번 변경, 57차 Backdrop 패턴 답습)

### 58차 회차 / 본질 비중
- 누적 commits: 2건 (4339d29 → fcd4fbc)
- GUI 직접 수정: 0% (정책 #10 100% 달성, 57차 답습)
- 본질 비중: ~95%

### 58차 신규 학습
- AIInsights.jsx 위치: pages/ (Topbar는 layout/, 컴포넌트별 디렉토리 다름)
- 자식 컴포넌트 7개 일괄 memo 래핑 안전 패턴 (각 컴포넌트당 opening + closing 2건 Edit)
- 닫는 괄호 위치 확정 방법: 다음 함수 시작 라인 직전이 닫는 괄호 (Read 툴로 컨텍스트 확인 후 unique 매칭)
- Conversation compacted 시 검수자 절차 재구성 필요 (자율 동작 위험)
- 자율 추천 .NET API PowerShell 스크립트 (System.Text.UTF8Encoding 등)는 ConstrainedLanguage 위험 — 즉시 인터럽트

---

## 58차 Track J 분할 계획 (실행은 59차)

### 현재 JourneyBuilder.jsx 구조
- L1~L210: import + 상수 + 유틸 (210줄)
- L213: DonutChart (memo)
- L226: HBarChart (memo)
- L249: Backdrop (memo 의도적 미적용)
- L259: FlowPreview (memo)
- L289: export default function JourneyBuilder()

### 분할 계획 (3-way split)
1. JourneyBuilderConstants.js (신규, ~210줄): L1~L210 상수/유틸 추출
2. JourneyBuilderCharts.jsx (신규, ~75줄): DonutChart/HBarChart/FlowPreview 추출 + Backdrop 검토
3. JourneyBuilder.jsx (메인만, ~195줄): import 경로 추가, 메인 컴포넌트만 보존

### 위험 요소
- import 경로 정확성 (../components vs ../utils 결정)
- 빌드 검증 필수
- 시각 회귀 가능성 (의존성 추적)
- React DevTools 컴포넌트 트리 구조 변화
- 청크 크기 변동 추적 (현재 57.72 kB → 분할 후 측정)

### 59차 실행 시 주의사항
- 분할 전 git stash로 baseline 확보
- 각 파일 추출 후 즉시 빌드 검증
- 시각 회귀 발견 시 즉시 revert
- 분할 commit은 각 단계별 분리 (3건 권장)

---

## 59차 React.memo 후보 (jsx 큰 파일 top10)

| 파일 | 크기 | 비고 |
|---|---|---|
| pages/WmsManager.jsx | 175 KB | 1순위 (Track I 패턴) |
| pages/CatalogSync.jsx | 159 KB | 2순위 |
| pages/RollupDashboard.jsx | 124 KB | 3순위 |
| pages/PriceOpt.jsx | 107 KB | 4순위 |
| pages/InfluencerUGC.jsx | 98 KB | 5순위 |
| context/GlobalDataContext.jsx | 91 KB | Context — memo 적용 부적합 |
| pages/AutoMarketing.jsx | 81 KB | 6순위 |
| pages/JourneyBuilder.jsx | 82 KB | 적용 완료 (Track F) |
| pages/AuthPage.jsx | 80 KB | 7순위 |
| pages/PerformanceHub.jsx | 81 KB | 8순위 |

### 59차 권장 진행 순서
1. WmsManager.jsx React.memo (Track I 패턴 답습)
2. CatalogSync.jsx React.memo
3. JourneyBuilder.jsx 분할 (58차 Track J 계획 실행)
4. 회차 여유 시 RollupDashboard.jsx 추가

### 우선 처리 권장
- WmsManager + CatalogSync = 334 KB 핵심 페이지
- 두 파일 memo 효과 = JourneyBuilder + AIInsights 합산 이상 예상
- 청크 크기 측정 (분할 전후 비교)

### 주의사항
- GlobalDataContext.jsx는 Context 컴포넌트 — memo 적용 부적합 (Provider 패턴)
- 큰 파일은 자식 컴포넌트 수가 많아 시그니처 확인 회차 증가 예상
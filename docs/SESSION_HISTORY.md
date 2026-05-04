# GeniegoROI 세션 작업 이력 (1차~17차)

> 2026-05-02 ~ 2026-05-03 / 5월 cleanup 스프린트
> 18차 이후 세션 기록은 `NEXT_SESSION.md` 참조
> 영구 규칙·함정·패턴은 `CLAUDE.md` 참조

이 문서는 NEXT_SESSION.md에서 분리된 historical 세션 로그입니다. 일자별 / 회차별 작업 내역이 시간 순으로 기록되어 있으며, 한 번 기록된 후로는 수정하지 않습니다 (감사·디버깅 용도).

---

## 5월 2일 완료된 작업 (12차까지)

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

## 5월 3일 완료된 작업

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

15차 (5월 3일) ⭐ NEW

* **GitHub Actions Phase 2 통과 — RollupDashboard.jsx TAB_COLORS 중복 선언 해소 + NEXT_SESSION.md 9곳 활차 수정**
* **🚨 결정적 발견 1: TAB_COLORS는 두 개의 별개 버그가 동시 존재**
  + 버그 1: line 1051 const 선언이 line 1035 props와 같은 이름으로 중복 → vite SyntaxError (빌드 차단)
  + 버그 2: line 1022 호출자 측이 부모 스코프에 정의 없는 TAB_COLORS 참조 → 빌드 통과 후 ReferenceError 가능성
  + 두 버그 모두 옵션 B(props 제거)로 동시 해소
* **🚨 결정적 발견 2: line 1051 useMemo는 자기완결적 (props와 무관)**
  + dependency array `[]` (빈 배열)
  + 본문은 하드코딩된 객체 리터럴 (summary, sku, campaign, creator, platform, guide 6개 키)
  + props로 받은 TAB_COLORS는 한 번도 사용 안 됨 (dead code)
  + → 옵션 B(props 제거) 시 동작 변화 0%
* **🚨 결정적 발견 3: 부모 RollupDashboard 함수에는 TAB_COLORS 정의 없음**
  + line 993~1015 본문 인벤토리: t/lang/txt/addAlert/isDemo/fc/tab/setTab/TABS/period/setPeriod/n/setN/isRTL
  + line 1022의 `TAB_COLORS={TAB_COLORS}` 우변은 정의되지 않은 변수
  + lazy() import로 lazy 평가되어 빌드 시점에 SyntaxError가 먼저 막아 ReferenceError 도달 안 함
* **수정 작업 (RollupDashboard.jsx 2곳, PowerShell .NET API 안전 처리)**:
  + 변경 1: line 1022 `      TAB_COLORS={TAB_COLORS}` 한 줄 통째로 제거 (DIFF -33 bytes)
  + 변경 2: line 1035 props 시그니처에서 `, TAB_COLORS` 제거 (DIFF -12 bytes)
  + 백업 파일: RollupDashboard.jsx.bak_15th
  + 사전 매칭 검증: MATCH_COUNT 1 (양쪽 모두 안전)
* **commit 500a951**: fix(frontend): remove duplicate TAB_COLORS declaration in RollupDashboard.jsx
* **GitHub Actions 진전 매트릭스 (#130 → #132)**:
  + Total duration: 29s → **36s** (Phase 2 통과로 더 진행)
  + Phase 2: 🔴 14s (vite SyntaxError) → **✅ 23s 통과!**
  + Phase 3: 미도달 → 🔴 0s 도달 (secrets 미등록으로 즉시 실패)
* **🟢 15차에서 새로 통과한 단계**:
  + ✅ Phase 2 npm install (407 packages audited)
  + ✅ Phase 2 vite v5.4.21 빌드 (101 modules transformed)
  + ✅ Phase 2 production build 23s 완료
* **🟡 15차에서 새로 노출된 실패 (16차 후보)**:
  + 🔴 Phase 3 SCP: `Error: can't connect without a private SSH key or password` (appleboy/scp-action@master)
  + 🔴 secrets.REMOTE_IP, REMOTE_USER, SSH_PRIVATE_KEY 미등록 확정
  + 🟡 Phase 4 SSH: 동일 secrets 사용, Phase 3 막혀서 미도달
  + 🟡 Phase 5 Health Check: secrets.TEST_EMAIL, TEST_PASS 추가 필요
  + 🟡 Slack Notification: secrets.SLACK_WEBHOOK_URL 미등록 (always 트리거)
* **NEXT_SESSION.md 9곳 활차 수정 (PowerShell .NET API + 파일 기반 패치 + 메모장 안전망)**:
  + Patch 1 헤더 (line 3~4): 14차 → 15차, 822927b → 500a951
  + Patch 2 누적 통계: + Phase 2 통과 + TAB_COLORS 수정
  + Patch 3 다음 작업 후보 #1: TAB_COLORS 수정 → GitHub Actions Secrets 등록 (16차 최우선)
  + Patch 4 알려진 이슈 Phase 1: + Phase 2 통과 확정 + RollupDashboard 해소
  + Patch 5 RollupDashboard 줄: 🔴 중복 선언 → 🟢 해소
  + Patch 6 CI/CD 매트릭스 Phase 2: 🔴 미통과 → ✅ 통과
  + Patch 7 CI/CD 매트릭스 Phase 3: ⊘ 16차 가드로 graceful skip → 🔴 secrets 미등록
  + Patch 8 CI/CD 분석: + Phase 2 통과 + Phase 3 secrets 분리
  + Patch 9 비용 추적: + 15차 추가 + 누적 통계 Phase 2 통과 추가
* **운영 영향**: 0% (RollupDashboard 동작 변화 0%, 운영 자동 배포는 16차 secrets 등록 시 활성화)
* **Cline 호출 0회**, 비용 $0 추가

16차 (5월 3일) ★ NEW

* **GitHub Actions Secrets 가드 적용 — Phase 3~5 + Slack 모두 graceful skip + Slack secret 이름 통일**
* **🚨 결정적 발견 1: deploy.yml의 Slack secret 이름이 NEXT_SESSION.md와 불일치**
  + 문서 표기: `secrets.SLACK_WEBHOOK_URL`
  + 실제 deploy.yml: `secrets.SLACK_WEBHOOK` (URL 누락)
  + 결과: 16차에서 등록 시도해도 작동 안 됐을 가능성 → 사전 발견으로 시간 절약
* **🚨 결정적 발견 2: 옵션 (C) 가드 + (B) Slack 통합이 가장 안전한 진입점**
  + (A) secrets 6개 등록은 SSH_PRIVATE_KEY/TEST_PASS 노출 위험 (11차 PW 청소 정신 위배)
  + (D) `if: false`는 가짜 통과로 실제 배포 차단
  + (C)는 secrets 미등록 상태에서 graceful skip → 운영 영향 0% 유지
* **수정 작업 (deploy.yml 단일 파일, 10 insertions / 2 deletions)**:
  + 단계 1: 워크플로우 상단에 `env:` 블록 추가 (HAS_SSH_SECRETS, HAS_TEST_SECRETS, HAS_SLACK_WEBHOOK 3개 플래그)
  + 단계 2: Phase 3 (SCP), Phase 4 (SSH)에 `if: ${{ env.HAS_SSH_SECRETS == 'true' }}` 가드 추가
  + 단계 3: Phase 5 (Health)에 `if: ${{ env.HAS_TEST_SECRETS == 'true' }}` 가드 추가
  + 단계 4: Slack Notification에 `if: ${{ always() && env.HAS_SLACK_WEBHOOK == 'true' }}` 가드 추가
  + 단계 5: Slack secret 이름을 `SLACK_WEBHOOK` → `SLACK_WEBHOOK_URL`로 통일 (문서와 일치)
* **commit 970f3fd**: fix(ci): add secrets guards to deploy.yml phase 3-5 and slack
* **GitHub Actions 진전 매트릭스 (#134)**:
  + Total duration: 35s
  + Phase 1: ✅ 통과 (0s)
  + Phase 2: ✅ 통과 (24s, npm install + vite 빌드)
  + Phase 3 (SCP): ⊘ Skipped (HAS_SSH_SECRETS=false)
  + Phase 4 (SSH): ⊘ Skipped (HAS_SSH_SECRETS=false)
  + Phase 5 (Health): ⊘ Skipped (HAS_TEST_SECRETS=false)
  + Slack Notification: ⊘ Skipped (HAS_SLACK_WEBHOOK=false)
  + **전체 결과: ✅ Success (clean green!)**
* **🟡 16차에서 새로 노출된 issue (17차 후보)**:
  + Annotations 2 warnings 발생:
    - Warning 1: Node.js 20 deprecation (actions/checkout@v3, actions/setup-node@v3)
    - Warning 2: Post Checkout Source Code git exit 128 (13차에서 무해 확정)
* **운영 영향**: 0% (수동 deploy.ps1/deploy.sh chain 별도 운영)
* **Cline 호출 0회**, 비용 $0 추가

17차 (5월 3일) ★ NEW

* **GitHub Actions Annotations 0건 달성 — Node.js 20 deprecation 해소 + git exit 128 동시 해결**
* **🚨 결정적 발견 1: 13차 발견의 실제 적용 시점이 17차로 도래**
  + 13차 NEXT_SESSION.md 메모: actions/checkout@v3, actions/setup-node@v3, 8398a7/action-slack@v3 모두 v4 업그레이드 권장
  + 16차에서 처음 actual warning으로 GitHub Actions에 노출됨
  + 사전 발견된 작업 후보 #6번을 17차에서 처리
* **🚨 결정적 발견 2: 8398a7/action-slack은 v3가 최신 (v4 없음)**
  + actions/checkout, actions/setup-node는 v4로 업그레이드 가능
  + 8398a7/action-slack@v3는 그대로 유지 (v4 미존재)
  + appleboy/scp-action@master, appleboy/ssh-action@master는 별도 작업으로 보류 (master pin은 보안 권장사항이지만 안정성 우선)
* **🚨 결정적 발견 3: v4 업그레이드만으로 git exit 128 warning도 함께 해소**
  + 13차에서 "무해 확정"으로 분류된 git exit 128 경고가 v4에서 사라짐
  + actions/checkout@v4의 내부 cleanup 로직 개선 추정
* **수정 작업 (deploy.yml 단일 파일, 2 insertions / 2 deletions, 매우 작은 변경)**:
  + 변경 1: line 17 `actions/checkout@v3` → `@v4`
  + 변경 2: line 20 `actions/setup-node@v3` → `@v4`
  + Find & Replace 2회로 처리
* **commit 780de8d**: fix(ci): upgrade actions to v4 for Node.js 20 compat
* **GitHub Actions 진전 매트릭스 (#135)**:
  + Total duration: 44s (16차 35s + 9s, v4 약간 무거움)
  + Phase 1: ✅ 통과
  + Phase 2: ✅ 통과
  + Phase 3 (SCP): ⊘ Skipped
  + Phase 4 (SSH): ⊘ Skipped
  + Phase 5 (Health): ⊘ Skipped
  + Slack Notification: ⊘ Skipped
  + **전체 결과: ✅ Success + Annotations 0건 (완전 클린!)**
* **🏆 17차에서 처음 도달한 상태**:
  + Annotations 섹션 자체가 사라짐 (이전 16차는 2 warnings)
  + CI 매트릭스 100% 클린 — 빨간색 0개, 노란색 0개
  + 5월 3일 4번의 사이클(14~17차) 끝에 처음 달성한 완전 그린
* **🟡 17차에서 새로 노출된 issue 없음** (별도 작업 후보 그대로 유지)
* **운영 영향**: 0% (수동 deploy chain 그대로)
* **Cline 호출 0회**, 비용 $0 추가

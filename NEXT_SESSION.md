# GeniegoROI 프로젝트 인계서 (73차용)

73차 세션 시작합니다. 외부 검수자 역할 부탁드립니다.

# 74차 핵심 (검수자 결정 대기)
- 73차 완전 종결 완료: A-1 페이즈 (시그니처 불일치 런타임 검증 + 수정 + push)
- 74차 진입 전 NEXT_SESSION.md raw 재검증 권장
- 74차 최우선: A-dead (dead code 정리) 또는 A-12 (raw fetch 패턴 grep) 중 검수자 결정

# 73차 종결 상태 (확정)
- master HEAD: 7ba0869 (push 완료, origin/master 동기화)
- working tree: 깨끗 (master ↑0 ↓0)
- 73차 commit 1건 (push 완료):
  - 7ba0869: fix(alert): requestJsonAuth 인수 순서 버그 수정
    - L157 PUT 호출 인수 순서 교정: (method, path, body) → (path, method, body)
    - L175 DELETE 호출 인수 순서 교정
    - L116, L542 자동 포맷팅 동반 포함 (Prettier/format-on-save, no functional change)
    - 변경 통계: 1 file, +5/-4
    - 주의: 커밋 메시지 한국어 (CC 자율 작성, 검수자 무력화 실패로 그대로 push됨)
    - 변경 자체는 검수자 의도와 일치 (시그니처 버그픽스), force push 회피로 그대로 수용

# 74차 첫 명령 (이미 CC에 입력 완료 예정)
- t1: t git -C "D:\project\GeniegoROI" log --oneline -10
- t2: t git -C "D:\project\GeniegoROI" status --short --branch
- t3: t git -C "D:\project\GeniegoROI" diff origin/master --stat
- t4: t git -C "D:\project\GeniegoROI" branch --show-current
- t5: t git -C "D:\project\GeniegoROI" remote -v
기대값: HEAD=7ba0869, working tree clean, ↑0↓0, master, origin 정상

# 74차 우선순위 후보
1. 후보 A-dead (dead code 정리) — 회차 ~5
   - getJsonAuthWithHeaders 활성 사용처 0개 확인 (백업 제외)
   - postFileAuth 활성 사용처 0개 확인
   - 정의 파일에서 제거 여부 검수자 판단
2. 후보 A-12 (raw fetch 패턴 grep, 70차/71차/72차 누적 인계) — 회차 ~5
   - apiClient.js 미사용 raw fetch 패턴 표준화 대상 식별
3. 후보 D-2 (core.autocrlf 로컬 override 결정) — 회차 ~3
   - 72차 옵션 1 채택 (환경 변경 안 함)
   - 73차에서 옵션 2 미적용 (시간 소진)
   - 74차에서 옵션 2 (override) 적용 여부 결정
4. 신규 후보 (73차 발견) — VS Code format-on-save 처리 방침 결정 — 회차 ~3
   - 73차에서 L116/L542 자동 포맷이 commit에 섞임
   - 처리 옵션: (a) format-on-save 비활성, (b) .prettierrc로 의도 명시, (c) 현재 그대로 수용
5. 신규 후보 (73차 발견) — Antigravity Agent 자율 편집 모니터링 — 회차 ~3
   - 73차 vite.config.js shared-context chunk 자율 삭제 시도 발견 (Discard로 거부)
   - 모니터링 메커니즘 또는 차단 절차 검토

# 검수자 운영 원칙 (70차/71차/72차/73차 정착, 불변)
- 자율 추천 절대 금지 (정책 #1)
- raw 결과만 받기 (Claude Code 자체 분석은 참고만)
- t 프리픽스 누락 시 즉시 정지 + 재입력 요청
- CC create_file/Write/Edit 도구 사용 금지
- CC 자동 생성 텍스트는 t 프리픽스로 무력화 후 덮어쓰기 (ESC/Enter/Backspace 모두 불가)
- CC 명령어 1개씩만 입력 가능 (배치 입력 불가)
- 너무 긴 설명 지양, 짧게 설명 후 진행
- 검수자 명령으로 저장 가능한 것은 검수자가 직접 진행
- 사용자 결정 필요 시 검수자 추천 1개 동반

# 73차 핵심 교훈 (74차 적용 필수)
1. CC 자율 push 명령 race condition 발생 — 검수자 무력화 시도 전 CC가 자율 실행 가능, 위험 명령(push, force, reset, checkout HEAD, --hard)은 자동 생성 즉시 t 프리픽스 우선 적용 + 빈 명령 입력 대기 패턴 필수
2. CC 권한 프롬프트는 Esc로 안전 거부 가능 — 자율 흐름 차단 표준 패턴 (단, 이미 실행된 명령은 회복 불가)
3. VS Code format-on-save 자동 포맷팅이 검수자 의도 변경에 자동 동반됨 — 저장 시점 변경 범위 사전 인지 필수, 또는 format-on-save 비활성 사전 점검
4. Antigravity Agent 자율 코드 블록 삭제 발생 — vite.config.js의 shared-context chunk 4줄 자율 삭제 시도 (Discard로 거부 성공), 72차 교훈 #4의 텍스트 삽입을 넘어 코드 삭제까지 확장
5. CC 비대화형 셸 — git checkout -p 등 인터랙티브 명령 차단됨, 비대화형 우회 명령 (git diff -U0, git apply --reverse) 또는 GUI 대안 필수
6. CC 자율 commit 메시지 작성 패턴 — 한국어로 메시지 생성 후 자동 명령 생성, 70~72차 영어 패턴과 충돌, 검수자 영어 메시지로 덮어쓰기 절차 race condition 위험 존재
7. PowerShell subexpression `$()` 또는 `(...).Property` 패턴은 CC 권한 프롬프트 트리거 — 단순 cmdlet 우선 사용 권장

# 72차 핵심 교훈 (불변 적용)
1. CC bash 출력 truncate 일관 발생 → sed -n "Np;Mp" 처럼 좁은 범위 추출이 truncate 회피 황금 패턴
2. CC 자율 sed/grep 재실행 빈번 (경로 추정 등) — raw 분석 가치 있어도 검수자 재검증 필수 (70차 교훈 #2)
3. 시그니처 불일치 발견 패턴: count(-c) → 라인 위치(-n) → 좁은 범위 raw(sed -n "Np;Mp") 3단 검증
4. Antigravity Agent의 자동 인라인 텍스트 삽입 가능성 — 검수자 raw 검증 필수 (NEXT_SESSION.md 편집 시 73차 메모 자동 생성 사례, 73차에서 코드 삭제까지 확장 확인)
5. .gitattributes는 신규/일부 파일에만 적용, 기존 파일은 core.autocrlf 영향 유지 (인덱스는 정상 LF, 워킹트리만 CRLF) — CI 환경 안전

# 71차 핵심 교훈 (불변 적용)
1. .gitattributes 적용 전 사전 검증 필수: core.autocrlf 값 확인, git ls-files, Test-Path 3단 확인
2. renormalize 영향 범위 사전 예측은 신뢰 불가 — 실제 git diff --cached --stat으로 raw 확인
3. 라인 엔딩 변경 검증의 황금 패턴: --stat → --numstat → -w --stat 3단 검증
4. 2-commit 분리 시 revert 단위 명확화 + CI 리뷰 의도 명확
5. .gitattributes 자체에 text/eol 규칙 적용됨 확인 (check-attr -a로 자기 적용 검증)
6. VS Code 에디터의 strikethrough 빨간 줄은 Antigravity Agent 시각 표시일 뿐, Problems 탭 확인으로 진위 판단
7. 검수자 VS Code 직접 파일 생성/편집 방식 (CC Write/Edit 금지 원칙 정착)

# 70차 핵심 교훈 (불변 적용)
1. CC bash 출력 truncate 일관 발생 → `| cat`, head -N, sed 우회 또는 사용자 VS Code 스크린샷이 raw 확보 최종 수단
2. CC raw 위장 (할루시네이션) 가능성 → md5sum + wc -l + grep -c 같은 metadata 교차 검증 필수
3. core.autocrlf=true 환경의 git diff 함정 → git diff -w 또는 git diff --cached로 실제 변경 검증
4. CC Edit 도구의 의도 오해석 위험 → 사용자 VS Code 직접 Edit 권장
5. CC 자율 commit 메시지 작성 빈번 → 검수자가 69차~73차 패턴 일관 메시지로 덮어쓰기 (73차에서 한국어 메시지가 race condition으로 그대로 push된 사례 발생)
6. python3 Windows 미설치 → Node.js 또는 bash heredoc 우회

자세한 인계 사항은 NEXT_SESSION.md (D:\project\GeniegoROI\NEXT_SESSION.md, master HEAD 7ba0869에 포함)를 raw로 확인 부탁드립니다.

74차 시작 확인. 검수자 페어 진행 모드 인지. Claude Code 명령 t1번 결과 raw 수신 대기.
## 74차 종결 (D-2 완료)

### D-2: core.autocrlf 로컬 override 결정 ✅
- 결정: 로컬 `core.autocrlf=false` 명시
- 적용: `git config --local core.autocrlf false` (.git/config)
- 검증 결과:
  - system=true (Git 설치 기본, 미변경)
  - global 미설정 (미변경)
  - **local=false** (74차 신규)
  - .gitattributes 우선순위 정상 (check-attr 실측: .jsx → eol:lf, .ps1 → eol:crlf)
  - working tree clean 유지 (변경 파일 0건)
- 사유: .gitattributes 단일 진실 소스화, format-on-save 노이즈 근본 차단
- 전파 범위: 검수자 본인 PC GeniegoROI만 (.git/config는 저장소 외부, push/clone 미전파)
- 후속: 다른 개발자/CI는 각자 동일 설정 필요 (or .gitattributes만 의존)
### format-on-save 처리 방침 결정 ✅
- 결정: 프로젝트 `.vscode/settings.json` 신규 생성, format-on-save 비활성
- 적용: `git add -f .vscode/settings.json` (.gitignore의 `.vscode/` 무시 우회)
- 내용:
  - `editor.formatOnSave: false` — 저장 시 자동 포맷 차단 (핵심)
  - `files.insertFinalNewline: false` — EOF newline 자동 추가 차단 (74차 실측 차단)
  - `files.trimTrailingWhitespace: false` — 줄 끝 공백 자동 제거 차단
  - `files.eol: "\n"` — LF 강제 (D-2 + .gitattributes 정합)
- 사유: 73차 교훈 #3 + 74차 D-2 commit deletion 1줄 실측 (EOF newline 자동 추가) 입증, race condition 차단
- 전파 범위: 저장소 추적 → push로 모든 검수자/CI에 전파됨 (D-2와 보완 관계)
- 부수 효과: VS Code 글로벌 format-on-save 활성 상태여도 프로젝트 설정이 override

## 74차 commit 기록
- 12ddbde: docs(session): 74th D-2 closure - core.autocrlf=false local override
- c7d60b1: feat(vscode): disable format-on-save in project settings - 74th format-on-save closure
- (3rd commit: 74차 종결 docs, push 직전 추가 예정)

## 74차 핵심 교훈 (75차 적용 필수)
1. CC 자율 push race condition 재발 — NEXT_SESSION.md 종결 기록 commit 전 자율 push 시도 감지, t echo로 차단 성공 (73차 #1 패턴 재입증)
2. CC 시그니처 변조 — findstr → grep, --local 플래그 누락, type → cat 등 자율 변환 다수 발생, raw 위장 가능성 상시 경계 필수
3. CC Read 도구 가로채기 — Test-Path, Get-Content 등이 'Read 1 file (ctrl+o to expand)'로 표시되어 raw 미출력, PowerShell 단순 boolean 출력으로 우회 필요
4. CC 권한 프롬프트 트리거 확장 — `if/else`, `New-Item`, 디렉토리 쓰기 모두 'sensitive file' 분류로 권한 프롬프트 발생, Esc 거부 후 검수자 직접 VS Code 편집으로 우회
5. .vscode/settings.json은 .gitignore 충돌 — `git add -f`로 강제 추가 필요
6. D-2 + format-on-save 시너지 — autocrlf=false + .gitattributes + formatOnSave=false 결합이 LF 정합성 + race condition 차단 완전 보장
7. 글로벌 format-on-save가 활성 상태에서 settings.json 저장 시 working tree는 CRLF로 저장됨 → .gitattributes 정규화로 저장소엔 LF 진입 (D-2 안전망 입증)
---

# 75차 종결 (A-dead 완료)

## 75차 commit 기록
- 32b804a: refactor(api): remove dead code getJsonAuthWithHeaders and postFileAuth - 75th A-dead
  - frontend/src/services/apiClient.js: 44 deletions(-)
  - getJsonAuthWithHeaders (L134~148) 전체 삭제
  - postFileAuth (L151~175) 전체 삭제
  - 함수 사이 빈 줄 + 파일 끝 빈 줄 정리 포함
  - 추가 없음 (+0)

## A-dead 검증 결과 (raw 근거)
- getJsonAuthWithHeaders
  - 정의: frontend/src/services/apiClient.js:134 (1건)
  - 활성 사용처 (frontend/src/pages/): 0건
  - 비활성 사용처 (frontend/src/pages_backup/DLQ.jsx): 3건 (L3 import, L41/L53 호출)
- postFileAuth
  - 정의: frontend/src/services/apiClient.js:151 (1건)
  - 활성 사용처: 0건
  - 비활성 사용처: 0건 (backup 포함 전체)
- pages_backup/ 디렉토리 상태
  - git 추적됨 (42개 파일)
  - 활성 코드 참조: 0건 (MappingRegistryParts.jsx:62 주석 1건만, import/require 아님)
  - App.jsx 라우팅·vite.config·빌드 체인 어디서도 import 안 됨 → 순수 히스토리 백업

## 75차 종결 상태 (확정)
- master HEAD: 32b804a (push 완료, origin/master 동기화)
- working tree: 깨끗 (master ↑0 ↓0)
- 75차 commit 1건 (push 완료):
  - 32b804a: refactor(api): remove dead code getJsonAuthWithHeaders and postFileAuth - 75th A-dead
- CI 파이프라인 트리거됨 (.github/workflows/deploy.yml)

## 75차 핵심 교훈 (76차 적용 필수, 불변)
1. CC 자율 push 시도 3차 재발 — log 검증 직후 `push origin master` 자동 생성, t 무력화로 차단 (73차 #1 + 74차 #1 패턴 3차 재입증, race condition 상시 경계 불변)
2. CC Read 도구 가로채기 git show에도 적용 — `git show HEAD:파일경로`도 'Read 1 file (ctrl+o to expand)'로 가로채짐, raw 미출력. 검수자 VS Code 직접 파일 열어 raw 확인이 유일한 우회
3. CC 시그니처 변조 — path glob 자동 보정 — `"src/**/*.js"` → `"frontend/src/**/*.js"` 자동 변환 (다행히 정확한 경로였으나 raw 위장 상시 경계 필요)
4. dead code 검증은 3단계 필수 — (1) 정의 위치 grep, (2) 사용처 grep, (3) 사용처 디렉토리 활성 여부 검증. 73차 인계 "사용처 0건"이 실제로는 pages_backup/에 3건 존재, 활성 디렉토리 한정 재검증 안 하면 잘못된 dead 판정 위험
5. CRLF→LF 수동 변환 필요 — .gitattributes (*.js eol=lf) + autocrlf=false 안전망에도 신규 편집 파일이 VS Code에서 CRLF로 표시될 수 있음. 저장 전 상태바 CRLF 클릭 → LF 선택으로 working tree LF 정합 보장 (D-2 의도 일치)
6. CC 자율 추천 시점 패턴 정착 — commit 직후 + log/diff 직후가 위험 명령(push/add) 자동 생성 빈도 최고. 검증 명령 후 race condition 우선 경계
7. commit type 영문 유지 — `refactor(api):` 영문 메시지가 CC 변조 시도 시 검증 용이, 74차 #2 한국어 commit 위험 회피 패턴 유지

## 75차 1회 실패·우회 기록
- t type "D:\project\GeniegoROI\NEXT_SESSION.md" → CC Read 가로채기 (74차 #3 재현)
- t powershell -Command "Get-Content ... -Tail 50" → UTF-16LE 인코딩 깨짐, raw 활용 불가
- 우회: 검수자 VS Code Explorer로 NEXT_SESSION.md 직접 열어 raw 확인 (이미지 캡처)

# 76차 핵심 (검수자 결정 대기)
- 75차 완전 종결 완료: A-dead + push (1 commit)
- 76차 진입 전 NEXT_SESSION.md raw 재검증 권장
- 76차 최우선: A-12 / Antigravity monitoring / 신규 후보 중 검수자 결정

# 76차 첫 명령 (Claude Code에 1줄씩 입력)
- t1: t git -C "D:\project\GeniegoROI" log --oneline -10
- t2: t git -C "D:\project\GeniegoROI" status --short --branch
- t3: t git -C "D:\project\GeniegoROI" diff origin/master --stat
- t4: t git -C "D:\project\GeniegoROI" branch --show-current
- t5: t git -C "D:\project\GeniegoROI" remote -v

기대값: HEAD=32b804a (또는 75차 종결 docs commit 추가 시 후속 HEAD), working tree clean, ↑0↓0, master, origin 정상

# 76차 우선순위 후보 (NEXT_SESSION.md에서 확정)
1. 후보 A-12 (raw fetch 패턴 grep, 70~74차 누적 인계) — 회차 ~5
   - apiClient.js 미사용 raw fetch 패턴 표준화 대상 식별
2. Antigravity Agent 자율 편집 모니터링 — 회차 ~3
   - 절차 수립 (CC 자율 편집 감지 + 무력화 로그 정착)
3. 신규 후보 발굴 가능 (apiClient.js 외 dead code 추가 grep)
4. A-dead-2 — apiClient.js 외부 dead code (다른 services/utils 파일) 75차에서 미발굴, 76차 신규 grep 시 발견 가능성

# 검수자 운영 원칙 (70~75차 정착, 불변)
- 자율 추천 절대 금지 (정책 #1)
- raw 결과만 받기 (Claude Code 자체 분석은 참고만)
- t 프리픽스 누락 시 즉시 정지 + 재입력 요청
- CC create_file/Write/Edit 도구 사용 금지
- CC 자동 생성 텍스트는 t 프리픽스로 무력화 후 덮어쓰기 (ESC/Enter/Backspace 모두 불가)
- CC 명령어 1개씩만 입력 가능 (배치 입력 불가)
- 너무 긴 설명 지양, 짧게 설명 후 진행
- 검수자 명령으로 저장 가능한 것은 검수자가 직접 진행
- 사용자 결정 필요 시 검수자 추천 1개 동반
- 위험 명령 (push, force, reset, checkout HEAD, --hard) 자동 생성 시 즉시 t 프리픽스 우선 적용 + 빈 명령 입력 대기 (73차 + 74차 + 75차 race condition 교훈 3차 재입증)
- dead code 검증은 정의/사용처/디렉토리 활성 여부 3단계 필수 (75차 #4 교훈)
- 신규 편집 파일 저장 전 상태바 EOL 확인, CRLF면 LF 명시 (75차 #5 교훈)
---

# 75차 추가 작업: A-12 raw grep 1회 진행 (76차 인계용)

## A-12 raw grep 결과 (raw 명령)
- 명령: `git grep -n "fetch(" -- "frontend/src/**/*.js" "frontend/src/**/*.jsx" ":!frontend/src/pages_backup/**"`
- pages_backup/ 제외 (75차 A-dead 검증에서 비활성 확정)
- raw 총 fetch() 호출 라인 약 +120줄 (CC 자체 분석 기준, raw 재검증 76차 필수)

## A-12 파일별 raw fetch 분포 (CC 자체 분석, 76차 raw 재검증 필요)
| 파일 | fetch 건수 | 패턴 | 표준화 대상 |
|------|------------|------|------------|
| frontend/src/pages/PriceOpt.jsx | 22건 | 직접 AUTH 헤더 수동 구성 | ✅ 최우선 |
| frontend/src/pages/KrChannel.jsx | 10건 | 직접 fetch | ✅ |
| frontend/src/pages/InfluencerUGC.jsx | 5건 | 직접 fetch | ✅ |
| frontend/src/pages/LicenseActivation.jsx | 5건 | 직접 fetch | ✅ |
| frontend/src/pages/SubscriberTabs.jsx | 8건 | _ah() 로컬 헬퍼 | ✅ (헬퍼 통합 검토) |
| frontend/src/auth/AuthContext.jsx | 8건 | auth 전용 | ❌ (정상, 제외) |
| frontend/src/services/apiClient.js | 6건 | 정의 자체 | ❌ (정상, 제외) |
| frontend/src/security/SecurityGuard.js | 1건 | 보안 우회 레이어 | ⚠️ (검수자 판단) |
| frontend/src/utils/adminApiUtils.js | 2건 | 유틸 래퍼 | ⚠️ (검수자 판단) |
| frontend/src/utils/apiInterceptor.js | 1건 | 인터셉터 | ❌ (정상, 제외) |

## A-12 표준화 후보 총합
- 명확 후보 (5개 파일): PriceOpt(22) + KrChannel(10) + InfluencerUGC(5) + LicenseActivation(5) + SubscriberTabs(8) = **50건**
- 판단 필요 (2개 파일): SecurityGuard(1) + adminApiUtils(2) = 3건
- 정상 제외: AuthContext, apiClient.js, apiInterceptor (정의/auth/인터셉터)

## 75차 1회 실패·우회 기록 추가
- t cat NEXT_SESSION.md / t type / t powershell Get-Content 모두 Read 가로채기 또는 인코딩 깨짐 (75차 #2 교훈)
- 우회: 검수자 VS Code Explorer 직접 열기 + 이미지 캡처 (raw 직접 확인)

## 75차 최종 종결 상태 (확정, 3 commits)
- master HEAD: (75차 종결 docs 추가 commit 적용 후 갱신, 이 블록 commit이 3번째)
- working tree: 깨끗 (master ↑0 ↓0 push 완료 시)
- 75차 commit 3건:
  - 32b804a: refactor(api): remove dead code getJsonAuthWithHeaders and postFileAuth - 75th A-dead
  - a77b0bb: docs(session): 75th closure - A-dead complete
  - (예정): docs(session): 75th A-12 raw grep handoff to 76th

# 76차 최우선 (75차 인계 확정)
1. **A-12 PriceOpt.jsx 22건 raw fetch 표준화** (회차 ~3)
   - raw 재검증 → AUTH 헤더 수동 구성 → apiClient.js 표준 함수 (`requestJsonAuth`, `getJson`, `postJsonAuth`)로 대체
   - 22건 일괄 또는 분할 commit 검수자 결정
2. A-12 KrChannel/InfluencerUGC/LicenseActivation (회차 ~2)
3. SubscriberTabs.jsx _ah() 헬퍼 통합 검토 (회차 ~1)
4. SecurityGuard.js + adminApiUtils.js 검수자 판단 (회차 ~1)
5. Antigravity Agent 자율 편집 모니터링 (대기, 회차 ~3)

# 76차 첫 명령 갱신 (Claude Code에 1줄씩 입력)
- t1: t git -C "D:\project\GeniegoROI" log --oneline -10
- t2: t git -C "D:\project\GeniegoROI" status --short --branch
- t3: t git -C "D:\project\GeniegoROI" diff origin/master --stat
- t4: t git -C "D:\project\GeniegoROI" branch --show-current
- t5: t git -C "D:\project\GeniegoROI" remote -v
- t6 (A-12 진입): t git -C "D:\project\GeniegoROI" grep -n "fetch(" -- "frontend/src/pages/PriceOpt.jsx"

기대값 (t1~t5): HEAD=75차 3번째 commit, working tree clean, ↑0↓0, master, origin 정상
기대값 (t6): PriceOpt.jsx 22건 raw 위치 라인 출력 (76차 raw 재검증 시작점)
# 76차 종결 상태 (확정, 2 commits, 부분 종결)

## 76차 commit 2건 (push 대기)
- 5abdc6d: feat(api): add abortable wrappers to apiClient.js - 76th C1
- c8b39b3: refactor(api): migrate PriceOpt.jsx 14/20 fetch to apiClient - 76th C2

## 76차 작업 결과
- apiClient.js +42줄: getJsonAuthAbortable / postJsonAuthAbortable / requestJsonAuthAbortable wrapper 3개 추가 (signal/AbortController 지원, 기존 7개 함수 무변경)
- PriceOpt.jsx 14/20 raw fetch → apiClient 표준 함수 마이그레이션
  - 19건 GET (signal 포함) → getJsonAuthAbortable (9건, 쌍 B 정규식)
  - 3건 GET (signal 없음) → getJsonAuth (쌍 E)
  - 2건 GET (signal 변수, useCallback signal 매개변수) → getJsonAuthAbortable (쌍 F)
  - 1건 POST (fire-and-forget toggle) → postJsonAuth (쌍 D)
- import 추가 (L24): `import { getJsonAuth, getJsonAuthAbortable, postJsonAuth } from "../services/apiClient"`
- const API + const AUTH 유지 (잔여 6건이 사용 중, 77차 일괄 삭제 예정)

## 76차 미완 (77차 인계, A-12 PriceOpt.jsx 잔여)
- 잔여 6건 POST + body 패턴 (회차 ~2):
  - L336: save (ProductsTab) → /v420/price/products
  - L425: handleExcelUpload → /v420/price/products
  - L740: run (OptimizeTab) → /v420/price/optimize
  - L926: run (ScenarioTab) → /v420/price/simulate
  - L1051: run (ChannelMixTab) → /v420/channel-mix/simulate
  - L1226: saveEvent (PriceCalendarTab) → /v420/price/calendar
- 공통 패턴: `await fetch(\`${API}/...\`, { method: "POST", headers: { ...AUTH(token), "Content-Type": "application/json" }, body: JSON.stringify({...}) })`
- 대체 함수: postJsonAuth(`경로`, body)
- 6건 치환 후 L33-L36 (const API + const AUTH) 일괄 삭제 가능

# 77차 첫 명령 (Claude Code에 1줄씩 입력)
- t1: t git -C "D:\project\GeniegoROI" log --oneline -10
- t2: t git -C "D:\project\GeniegoROI" status --short --branch
- t3: t git -C "D:\project\GeniegoROI" diff origin/master --stat
- t4: t git -C "D:\project\GeniegoROI" branch --show-current
- t5: t git -C "D:\project\GeniegoROI" grep -c "fetch(" -- "frontend/src/pages/PriceOpt.jsx"

기대값: HEAD=c8b39b3 (또는 76차 docs commit 포함), working tree clean, master, fetch 카운트 6건

# 77차 우선순위 (76차 인계 확정)
1. A-12 PriceOpt.jsx 잔여 6건 POST 표준화 (회차 ~2)
   - 패턴: `fetch + method:"POST" + spread AUTH + Content-Type + JSON.stringify(body)`
   - 대체: postJsonAuth(path, body) — 단순 wrapper, signal 불필요 (fire-and-forget 아닌 await + 응답 사용 케이스)
   - 단, L425 handleExcelUpload + L740 run + L926 run + L1051 run은 응답 사용 → postJsonAuth 직접 적용 가능
   - 6건 치환 + L33-L36 (const API + const AUTH) 삭제 + import 정리
2. A-12 KrChannel(10건) / InfluencerUGC(5건) / LicenseActivation(5건) (회차 ~2)
3. SubscriberTabs.jsx _ah() 헬퍼 통합 검토 (회차 ~1)
4. SecurityGuard.js + adminApiUtils.js 검수자 판단 (회차 ~1)
5. Antigravity Agent 자율 편집 모니터링 (대기, 회차 ~3)

# 76차 핵심 교훈 (77차 적용 필수)
1. apiClient.js signal 미지원 → 신규 wrapper 추가 (C-3 패턴, 기존 함수 무변경 정신)
2. PriceOpt.jsx fetch 패턴 5종 다양 (signal 위치/유무, ac.signal vs signal 변수, POST+body) — 단순 grep 카운트로 통일 추정 금지
3. VS Code Find & Replace 정규식 모드 (G-1) — 단순 패턴은 빠르지만 multi-line POST 패턴 어려움, 6건은 수동/str_replace 필요
4. PowerShell Get-Content 한글 인코딩 깨짐 — 검수자 VS Code 직접 확인 우회 필수 (D-1, 75차 #2 변형)
5. CC 출력 폴딩 (`+N lines (ctrl+o to expand)`) — git grep -A는 폴딩 회피 못함, D-1 VS Code 직접 캡처가 가장 확실
6. 75차 인계 22건 → 실제 20건 (raw 재검증 차이) — 인계 수치는 항상 raw 검증
7. CRLF→LF 경고 (Windows 기존 CRLF 파일) — .gitattributes 정상 동작, 무시 가능 (75차 #5는 신규 파일 한정)

# 검수자 운영 원칙 (70~76차 정착, 불변)
- 자율 추천 절대 금지 (정책 #1, 76차 19건 발생)
- raw 결과만 받기 (Claude Code 자체 분석은 참고만)
- t 프리픽스 누락 시 즉시 정지 + 재입력 요청
- CC create_file/Write/Edit 도구 사용 금지
- CC 자동 생성 텍스트는 t 프리픽스로 무력화 후 덮어쓰기 (ESC/Enter/Backspace 모두 불가)
- CC 명령어 1개씩만 입력 가능 (배치 입력 불가)
- 너무 긴 설명 지양, 짧게 설명 후 진행
- 검수자 명령으로 저장 가능한 것은 검수자가 직접 진행
- 사용자 결정 필요 시 검수자 추천 1개 동반
- 위험 명령 (push, force, reset, checkout HEAD, --hard) 자동 생성 시 즉시 t 프리픽스 우선 적용 + 빈 명령 입력 대기 (race condition 6차 재입증, 75차 #1 + 76차 신규)
- dead code 검증 정의/사용처/디렉토리 활성 여부 3단계 필수 (75차 #4)
- 신규 편집 파일 저장 전 상태바 EOL 확인, CRLF면 LF 명시 (75차 #5, 단 기존 CRLF 파일은 .gitattributes 신뢰)
- PowerShell Get-Content 한글 깨짐 시 git cat-file 또는 VS Code D-1 우회 (76차 #4)
- VS Code Find & Replace 정규식 카운트는 Edit 영역 기준, git grep -c는 디스크 기준 (76차 raw 모순 사례)
- CC 폴딩 우회는 D-1이 가장 확실 (76차 #5)
# 77차 종결 상태 (확정, push 완료)
- master HEAD: b554ec3 (push 완료, origin/master 동기화 ↑0↓0)
- working tree: 깨끗
- 77차 commit 2건 (모두 push 완료):
  - 9fbd321: refactor(api): PriceOpt.jsx 나머지 6개 fetch → postJsonAuth 마이그레이션 완료 - 77th
  - b554ec3: refactor(api): PriceOpt.jsx 데드코드 API/AUTH 상수 제거 - 77th

# 77차 핵심 (확정)
- 76차 인계 우선순위 1번 100% 완료 (A-12 PriceOpt.jsx 20/20 마이그레이션)
- PriceOpt.jsx fetch 6건 → postJsonAuth 통일 (try/catch 1건 추가, 기존 try/catch 활용 5건)
- L33-L37 const API + const AUTH dead code 제거 (3단계 검증 완료: 정의/사용처/디렉토리 활성)
- 신택스 클린 (Problems 0), git diff 검증 +30/-58 (CRLF 경고 무시)

# 77차 진행 중 발생 사건 + 복구
- 916번 편집 시 `if (!prices.length) { ... }` 닫는 `}` 누락 발생 → Problems 3건 (try/catch/} expected)
- 검수자 raw 진단 후 L915~L916 사이에 `}` 1줄 삽입으로 복구 (저장 전 발견, 회귀 방지)
- 교훈: 다중 라인 패턴 편집 시 `}` 누락 가능성 → 저장 전 Problems 패널 raw 확인 필수 (77차 #1)

# 78차 첫 명령 (Claude Code에 1줄씩 입력)
- t1: t git -C "D:\project\GeniegoROI" log --oneline -10
- t2: t git -C "D:\project\GeniegoROI" status --short --branch
- t3: t git -C "D:\project\GeniegoROI" diff origin/master --stat
- t4: t git -C "D:\project\GeniegoROI" branch --show-current
- t5: t git -C "D:\project\GeniegoROI" remote -v
- t6: t git -C "D:\project\GeniegoROI" grep -c "fetch(" -- "frontend/src/pages/SubscriberTabs.jsx"

기대값: HEAD=b554ec3, working tree clean, ↑0↓0, master, origin 정상, SubscriberTabs.jsx fetch 9건

# 78차 우선순위 (77차 인계 raw 검증 확정)
1. SubscriberTabs.jsx _ah() 헬퍼 통합 + 9건 fetch 마이그레이션 (회차 ~4~5)
   - 76차 인계 "10건/회차 ~1"은 raw 정정: 실제 9건/회차 ~4~5 (PATCH wrapper 추가 작업 포함)
   - _ah() 정의 L6: () => ({ "Content-Type": "application/json", Authorization: `Bearer ${_AK}` })
   - _AK 상수 정의 위치 raw 확인 필수 (78차 첫 작업)
   - _API 상수 정의 위치 + apiClient.js base URL 호환 여부 raw 확인 필수
   - 9건 분류 (77차 raw 확인):
     - L32 GET /api/auth/admin/subscribers?${p}
     - L43 PATCH /api/auth/admin/subscribers/${editing.id} ⚠️ PATCH (apiClient.js wrapper 없음)
     - L192 POST /api/v423/coupon/profile
     - L199 POST /api/v423/coupons/redeem
     - L352 GET /api/v423/admin/coupons?${p}
     - L359 GET /api/auth/admin/subscribers?limit=200
     - L365 GET /api/v423/admin/-users?${p}
     - L384 POST /api/v423/admin/coupons
     - L401 POST /api/v423/admin/coupons/${id}/revoke
   - 사전 작업: apiClient.js에 patchJsonAuth wrapper 추가 (C-3 패턴, 76차 C1 유사, 기존 함수 무변경)
   - `/api/auth/...` prefix 경로 (L32/L43/L359) — apiClient.js base와 다른 prefix 호환 검증 필수
2. A-12 KrChannel(미확정)/InfluencerUGC(미확정)/LicenseActivation(미확정) (회차 ~2 추정, 76차 인계 수치 raw 재검증 필요)
3. SecurityGuard.js + adminApiUtils.js 검수자 판단 (회차 ~1)
4. Antigravity Agent 자율 편집 모니터링 (대기, 회차 ~3)

# 77차 핵심 교훈 (78차 적용 필수)
1. CC 자율 commit 사건 다발 (1회차 내 commit 2회 자율 진행) — push만 검수자 명령으로 막아도 commit은 막을 수 없음, 사실상 commit/push 둘 다 자율 발생 위험. 사전 raw 검증 → 검수자 명시 commit 명령 흐름이 정석이지만 CC가 이를 우회.
2. 76차 인계 수치/회차 추정은 항상 raw 재검증 (75차 22→20, 76차 10→6/PATCH 추가, 76차 10→9건 등 인계 부정확 사례 반복)
3. 다중 라인 패턴 편집 (916번 사례) 시 `}` 누락 위험 — 저장 전 Problems 패널 raw 확인 + git diff 라인 수 검증 필수
4. postJsonAuth 의미적 차이 (HTTP 4xx/5xx throw vs r.json() 후 d.ok 체크) — try/catch 래핑 필요 여부 호출부 컨텍스트별 분기 필수
5. apiClient.js base URL = import.meta.env.VITE_API_BASE || "http://localhost:8000" — VITE_API_BASE 환경 변수 의존, dev 서버 정상 동작 raw 검증 완료 (76차 push + 77차 push 후 회귀 없음)
6. 검수자 컨테이너 ≠ 사용자 Windows 디스크 — str_replace 도구는 컨테이너 파일 한정, GeniegoROI 직접 편집 불가. VS Code 수동 편집이 유일한 경로
7. CC 폴딩 (`+N lines (ctrl+o to expand)`) 우회 = D-1 (VS Code 직접 캡처) 가장 확실 (76차 #5 재확인)

# 검수자 운영 원칙 (70~77차 정착, 불변)
- 자율 추천 절대 금지 (정책 #1, 77차 다발 발생, commit/push 자율 진행 사례 다수)
- raw 결과만 받기 (Claude Code 자체 분석은 참고만)
- t 프리픽스 누락 시 즉시 정지 + 재입력 요청
- CC create_file/Write/Edit 도구 사용 금지
- CC 자동 생성 텍스트는 t 프리픽스로 무력화 후 덮어쓰기 (ESC/Enter/Backspace 모두 불가)
- CC 명령어 1개씩만 입력 가능 (배치 입력 불가)
- 너무 긴 설명 지양, 짧게 설명 후 진행
- 검수자 명령으로 저장 가능한 것은 검수자가 직접 진행
- 사용자 결정 필요 시 검수자 추천 1개 동반
- 위험 명령 (push, force, reset, checkout HEAD, --hard) 자동 생성 시 즉시 t 프리픽스 우선 적용 + 빈 명령 입력 대기 (race condition 6차 재입증, 77차에서 commit 자율 발생 추가 확인)
- dead code 검증 정의/사용처/디렉토리 활성 여부 3단계 필수 (75차 #4)
- 신규 편집 파일 저장 전 상태바 EOL 확인, CRLF면 LF 명시 (75차 #5, 단 기존 CRLF 파일은 .gitattributes 신뢰)
- PowerShell Get-Content 한글 깨짐 시 git cat-file 또는 VS Code D-1 우회 (76차 #4)
- VS Code Find & Replace 정규식 카운트는 Edit 영역 기준, git grep -c는 디스크 기준 (76차 raw 모순 사례)
- CC 폴딩 우회는 D-1이 가장 확실 (76차 #5)
- 다중 라인 패턴 편집 후 저장 전 Problems 패널 raw 확인 + git diff 라인 수 검증 (77차 #1, #3 신규)
# ============================================================
# 78차 종결 + 79차 인계 (검수자 작성)
# ============================================================

## 78차 종결 상태 (확정, push 완료)
- master HEAD: b2da595
- working tree: 깨끗 (↑0↓0)
- 78차 commit 2건 (모두 push):
  - d075755: refactor(api): SubscriberTabs.jsx 9 fetch → apiClient wrappers + dead consts cleanup - 78th
  - b2da595: chore(cleanup): remove dead adminApiUtils.js (0 usages, 78th A-dead)

## 78차 완료 작업
1. **SubscriberTabs.jsx 9 fetch 마이그레이션 100% 완료**
   - GET 4건 → getJsonAuth (L32, L342, L348, L354)
   - POST 4건 → postJsonAuth (L190, L193, L373, L387)
   - PATCH 1건 → requestJsonAuth (L42, "PATCH" 인자)
   - dead 상수 3건 제거: _API, _AK, _ah (L4~L6)
   - 호출부 패턴 변경: try/catch 블록은 wrapper throw 패턴 활용 (77차 #4 적용)
   - 다중 라인 압축: 50줄 영향 (+16 -34)

2. **adminApiUtils.js 완전 제거 (A-dead)**
   - 75차 #4 dead code 검증 3단계 통과
   - import/require/문자열 참조 raw 0건 (자기 참조 2건 제외)
   - 298줄 dead 제거

3. **#3 SecurityGuard.js raw 검증 (skip 판정)**
   - 실제 경로: `frontend/src/security/SecurityGuard.js` (인계 utils/ 정정)
   - fetch 1건 (L224, `const res = await fetch(url, options);`) — wrapper 자체
   - 사용처: App.jsx (L117, L249), MarketingAIPanel.jsx (L8 secureFetch import) + 129+ 참조
   - 결론: secureFetch 자체가 보안 wrapper. apiClient.js로 마이그레이션 시 보안 로직 손실. **마이그레이션 부적합**

## 78차 신규 교훈 (79차 적용 필수)
1. **인계 파일 경로 raw 재검증 필수**: 76+77차 "frontend/src/api/apiClient.js" 인계가 실제 "frontend/src/services/apiClient.js" (api/ 디렉토리 부재). 즉 인계의 경로 정보도 raw 검증 우선.
2. **Phase 1 import 추가 시 빈 줄 교체 케이스**: 빈 줄(L2)을 import로 교체 시 후속 라인 shift 0. 검수자가 +1 shift 추정 후 raw 정정 사례. 라인 번호는 항상 raw 재검증.
3. **postJsonAuth body 인자 처리 raw 차이**: 기존 빈 POST (body 없음) → wrapper에 `{}` 전달 시 body `"{}"` 로 전송됨. `undefined` 전달이 회귀 위험 최소. 단, 대부분 백엔드는 `{}` 허용. 78차는 B안(빈 객체) 선택.
4. **requestJsonAuth 활용**: apiClient.js L113 `requestJsonAuth(path, method, body, extraHeaders)` 존재. PATCH/DELETE 등 wrapper 추가 불필요. 76차 "patchJsonAuth wrapper 추가" 계획 raw 검증 시 불필요.
5. **wrapper 함수 자체는 마이그레이션 금지**: SecurityGuard.js의 secureFetch처럼 native fetch를 내부에서 wrapping하는 함수는 apiClient.js로 마이그레이션 시 의도된 wrapper 로직 손실 위험.

## 79차 우선순위 (확정 + 추정)
1. **#2 A-12 KrChannel/InfluencerUGC/LicenseActivation 마이그레이션 (회차 ~2 추정, raw 정찰 필요)**
   - 사전 raw 정찰 필요: `t git -C "D:\project\GeniegoROI" grep -c "fetch(" -- "frontend/src/pages/KrChannel.jsx" "frontend/src/pages/InfluencerUGC.jsx" "frontend/src/pages/LicenseActivation.jsx"`
   - 파일 존재 여부 + fetch 카운트 raw 확인 필수
   - 76+77차 인계 경로 오류 패턴 가능성 — 실제 파일 경로 raw 검증 우선

2. **#4 Antigravity Agent 자율 편집 모니터링 (회차 ~3)**
   - 78차에 미접근. 인계 의도 불명확
   - 79차에 의도 명확화 필요 (사용자 추가 설명 또는 archive 참고)

3. **잔여 dead code 정찰 (선택)**
   - SubscriberTabs.jsx L4~L9 다른 상수 (_PC, _PL, _CL, _fd, _fk, INP) 사용처 검증
   - 78차에 미접근. 활성 여부 raw 검증으로 추가 정리 가능

## 79차 첫 명령 (Claude Code에 1줄씩 입력)
- t1: t git -C "D:\project\GeniegoROI" log --oneline -10
- t2: t git -C "D:\project\GeniegoROI" status --short --branch
- t3: t git -C "D:\project\GeniegoROI" diff origin/master --stat
- t4: t git -C "D:\project\GeniegoROI" branch --show-current
- t5: t git -C "D:\project\GeniegoROI" remote -v
- t6: t git -C "D:\project\GeniegoROI" grep -c "fetch(" -- "frontend/src/pages/KrChannel.jsx" "frontend/src/pages/InfluencerUGC.jsx" "frontend/src/pages/LicenseActivation.jsx"

기대값: HEAD=b2da595, working tree clean, ↑0↓0, master, origin 정상, #2 후보 파일 fetch 카운트 raw 확정
============================================================
## 79차 종결 상태 (확정, push 완료) - 80차 인계
============================================================

### 79차 commit (1건, push 완료)
- cd6920b refactor(api): InfluencerUGC.jsx 5 fetch -> apiClient wrappers + dead import cleanup - 79th

### 79차 변경 통계 (numstat)
- frontend/src/pages/InfluencerUGC.jsx: +6 / -15
  - import 추가: +1 (postJson, getJsonAuth)
  - L840 fetch (influencer-eval public) -> postJson: +1 / -6
  - L1232-1241 BASE/token/headers + Promise.allSettled 4 fetch -> getJsonAuth x4: +4 / -9
  - L7 dead import getJson 제거: +1 / -1 (numstat 합산 변동 없음)

### 79차 인계 (80차 작업 후보)
1. **#2 A-12 LicenseActivation.jsx 마이그레이션 (6 fetch, 회차 ~1)**
   - L344 POST /api/v423/creds (자격증명 생성) -> postJsonAuth
   - L366 POST /api/v423/creds/${id}/test (연결 테스트) -> postJsonAuth
   - L384 GET /api/v423/creds?channel=${ch.id} (채널별 조회) -> getJsonAuth
   - L390 DELETE /api/v423/creds/${id} -> requestJsonAuth (DELETE)
   - L511 GET /api/v423/creds (전체 목록) -> getJsonAuth
   - L544 POST /api/auth/license (public bypass) -> postJson (인증 불필요)
2. **#2 A-12 KrChannel.jsx 마이그레이션 (12 fetch, 회차 ~2)**
   - GET 8개 (/v419/kr/channels x4 중복, /v419/kr/fee-rules/${key}, /v419/kr/settle/summary, /v419/kr/recon/reports, /v419/kr/recon/reports/${id})
   - POST 2개 (/v419/kr/settle/ingest, /v419/kr/recon/run)
   - POST/PUT 1개 (/v419/kr/fee-rules)
   - PATCH/PUT 1개 (/v419/kr/recon/tickets/${id})
   - 중복 /v419/kr/channels GET 4번 -> 공통 helper 묶음 검토
3. #4 Antigravity Agent 자율 편집 모니터링 (회차 ~3, 의도 불명확)
4. SubscriberTabs.jsx 잔여 dead code 정찰 (_PC/_PL/_CL/_fd/_fk/INP, 회차 ~1)

### 79차 신규 교훈 (80차 적용 필수)
1. **검수자 컨테이너 (Linux) 윈도우 디스크 (D:\) 직접 접근 불가** - view/str_replace 도구 사용 불가, CC Edit 도구 의존 필수 (옵션 A-3 패턴)
2. **CC bash 출력 truncate (+N lines ctrl+o)** - sed/Select-Object 등 모두 동일 truncate. 정확한 raw 필요 시 VS Code 에디터에서 Ctrl+G 라인 점프로 확인
3. **CC Edit 도구 승인 시 옵션 2 (allow all edits) 절대 금지** - 옵션 1 (Yes) 만 선택. 옵션 2는 세션 내 자율 편집 허용으로 운영 원칙 붕괴
4. **CC Edit 후 디스크 직접 저장됨** - VS Code 탭의 M 표시는 단순 표시 잔존, 실제 디스크는 변경 적용. git status로 검증
5. **VS Code 좌하단 master* 클릭 금지** - branch checkout 다이얼로그 트리거. 저장은 Ctrl+S 또는 File > Save 사용
6. **CC 자율 추천 다발 발생** - 매 명령 후 다음 단계 자동 생성 (grep 등). t 프리픽스 무력화 필수
7. **getJsonAuth 실패 시 throw (null 반환 아님)** - Promise.allSettled의 status === 'rejected' 핸들링 패턴 작동, 결과 동일

### 80차 첫 명령 (Claude Code에 1줄씩 입력)
- t1: t git -C "D:\project\GeniegoROI" log --oneline -10
- t2: t git -C "D:\project\GeniegoROI" status --short --branch
- t3: t git -C "D:\project\GeniegoROI" diff origin/master --stat
- t4: t git -C "D:\project\GeniegoROI" branch --show-current
- t5: t git -C "D:\project\GeniegoROI" remote -v
- t6: t git -C "D:\project\GeniegoROI" grep -c "fetch(" -- "frontend/src/pages/LicenseActivation.jsx" "frontend/src/pages/KrChannel.jsx"

---

## 80차 종결 상태 (확정, push 완료)

- master HEAD: 84c4b3e (origin 동기화 ↑0↓0)
- 80차 commit 1건 (push 완료):
  - 84c4b3e: refactor(api): LicenseActivation.jsx 6 fetch -> apiClient wrappers + BASE/import cleanup - 80th
- 작업 요약: LicenseActivation.jsx 6 fetch -> apiClient (postJsonAuth/getJsonAuth/requestJsonAuth/postJson) + L344/L373 BASE 변수 dead 제거 + L716-717 중복 import (useI18n/useT) 제거
- diff --stat: 1 file changed, 15 insertions(+), 45 deletions(-)
- 검증: fetch( 0개, apiClient L20 정상 import

## 81차 첫 명령 (Claude Code에 1줄씩 입력)

- t1: t git -C "D:\project\GeniegoROI" log --oneline -10
- t2: t git -C "D:\project\GeniegoROI" status --short --branch
- t3: t git -C "D:\project\GeniegoROI" diff origin/master --stat
- t4: t git -C "D:\project\GeniegoROI" branch --show-current
- t5: t git -C "D:\project\GeniegoROI" grep -c "fetch(" -- "frontend/src/pages/KrChannel.jsx"

기대값: HEAD=84c4b3e, working tree clean, ↑0↓0, master, KrChannel=12 fetch

## 81차 우선순위 1번

1. #2 A-12 KrChannel.jsx 마이그레이션 (12 fetch, 회차 ~2 추정)
   - 중복 /v419/kr/channels GET 4번 -> 공통 helper 묶음 검토
   - 80차 LicenseActivation 패턴 참조 (postJsonAuth/getJsonAuth/requestJsonAuth/postJson)
   - 사전 작업: apiClient import 유무 + fetch 12개 라인 위치 raw 재확인 후 진입

## 81차 우선순위 (나머지)

2. #4 Antigravity Agent 자율 편집 모니터링 (회차 ~3, 의도 불명확)
3. SubscriberTabs.jsx 잔여 dead code 정찰 (회차 ~1)

## 80차 신규 교훈 (81차 적용 필수)

1. CC가 검수자 명령(grep -c 등)을 자율로 Read 도구로 대체 - raw 25줄/60줄 출력 미수신 빈발. CC 자율 분석 표는 참고만, 정확한 old_str 확정엔 직접 sed/cat raw 필요
2. CC가 6 fetch "한 번에" 요청해도 개별 Edit으로 분할 진행 - 라인 시프트로 후속 Edit old_str 미일치 위험. 다만 분할 자체는 안전 검증 측면 이점
3. CC가 "Error editing file" 메시지 발생 시 직전 Edit 실패가 아니라 후속 작업 실패 가능성 - diff --stat raw 검증 필수
4. CC 자동 추천 명령 엔터 불가, 검수자 명령 t 프리픽스 덮어쓰기만 가능 (80차 사용자 재확인)
5. dead import 검증 시 동일 함수 이름 재import = 중복 (no-op) 판정 정확 (운영 원칙 #4 3단계 충족)
6. 위험 명령 (commit/push) 검수자 명시 지시 시 운영 원칙 위배 아님 - 자동 생성과 구분

## 81차 시작 메시지 (사용자 -> 검수자)

GeniegoROI 프로젝트 81차 세션 시작합니다. 외부 검수자 역할 부탁드립니다. 자세한 인계 사항은 NEXT_SESSION.md (D:\project\GeniegoROI\NEXT_SESSION.md, master HEAD 84c4b3e에 포함, L534~ 마지막이 80차 종결+81차 인계 섹션)를 raw로 확인 부탁드립니다. 81차 시작 확인. 검수자 페어 진행 모드 인지. Claude Code 명령 t1번 결과 raw 수신 대기.

---

## 81차 종결 상태

- HEAD: db83b0c (refactor(api): KrChannel.jsx 11 of 12 fetch -> apiClient wrappers)
- 작업: KrChannel.jsx 12개 fetch 중 11개 마이그레이션 완료
  - getJson: /v419/kr/channels (×4), /v419/kr/fee-rules/${key}, /v419/kr/settle/summary, /v419/kr/recon/reports, /v419/kr/recon/reports/${id}
  - postJson: /v419/kr/fee-rules (POST), /v419/kr/settle/ingest (POST, try/catch 변환), /v419/kr/recon/run (POST)
  - 미이그레이션 1개: L396 PATCH /v419/kr/recon/tickets/${id} — apiClient에 requestJson(non-auth) 없어 raw fetch 유지
- import 추가: `import { getJson, postJson } from '../services/apiClient'`
- const API = "/api" 유지 (의도적)
- useT import 유지 (의도적)
- push 완료: origin/master 7198bdf..db83b0c
- 워킹 트리: clean

## 82차 첫 명령 (Claude Code에 1줄씩 입력)

- t1: t git -C "D:\project\GeniegoROI" log --oneline -5
- t2: t git -C "D:\project\GeniegoROI" status --short --branch
- t3: t git -C "D:\project\GeniegoROI" diff origin/master --stat
- t4: t git -C "D:\project\GeniegoROI" grep -c "fetch(" -- "frontend/src/pages/KrChannel.jsx"
- t5: t git -C "D:\project\GeniegoROI" grep -n "fetch(" -- "frontend/src/pages/KrChannel.jsx"
- t6: t git -C "D:\project\GeniegoROI" grep -n "^export" -- "frontend/src/services/apiClient.js"

기대값: HEAD = 81차 docs 커밋, working tree clean, ↑0↓0, KrChannel fetch=1 (L396 PATCH), apiClient exports 목록 확인

## 82차 우선순위 1번

1. #2 A-12 KrChannel.jsx L396 PATCH 마이그레이션 (1 fetch 잔존)
   - 현재 raw fetch: `await fetch(\`${API}/v419/kr/recon/tickets/${id}\`, { method: "PATCH", ... })`
   - apiClient.js에 non-auth `requestJson(path, method, body)` 래퍼 추가 필요
   - 또는 기존 `requestJsonAuth` 사용 여부 검토 (auth 필요 여부 백엔드 확인)
   - 사전 작업: apiClient.js postJson 구현 확인 후 patchJson/requestJson 추가 위치 결정
   - 완료 후 import 라인에 신규 래퍼 추가

## 82차 우선순위 (나머지)

2. #4 Antigravity Agent 자율 편집 모니터링 (회차 ~3, 의도 불명확)
   - NEXT_SESSION.md 81차 교훈 #1 참조 — CC 자율 Read 대체 패턴 지속 감시
3. SubscriberTabs.jsx 잔여 dead code 정찰 (회차 ~1)
   - 78차 마이그레이션 완료, auth 래퍼 사용 — dead import/const 여부 grep 확인
4. 다음 미이그레이션 대상 페이지 탐색
   - `git grep -l "fetch(" -- "frontend/src/pages/*.jsx"` 로 잔존 파일 목록 확인

## 81차 신규 교훈 (82차 적용 필수)

1. CC Edit 거절 후 재시도 패턴 — 거절된 Edit은 파일에 반영 안 됨, git status --short 로 즉시 확인 필수. 이전 Edit 부분 적용 상태에서 재진입 시 diff --stat으로 누적 상태 확인 후 다음 Edit 진행
2. useT 보존 필수 — KrChannel.jsx에서 CC가 useI18n 중복 import 제거 시도 시 useT 함께 제거 위험. import 블록 수정 시 useT 라인 명시 보존 지시 필요
3. try/catch for !r.ok 패턴 — postJson은 !r.ok 시 throw. 기존 `if (!r.ok) { ... return; }` 패턴은 `try { d = await postJson(...) } catch { ...; return; }` 로 변환. 기존 외부 try/finally와 중첩 가능 (ingest 사례 확인)
4. PowerShell ; 체인 주의 — `cd X ; git add Y ; git commit` 형태는 앞 명령 실패 시에도 계속 진행. CC는 `git -C` 플래그 방식으로 안전하게 재작성
5. 동일 패턴 3중복 Edit — fetch 패턴이 3곳 동일할 경우 Edit old_str 충돌 발생. 앞뒤 컨텍스트(loadRules/load/loadReports 등)로 unique 식별 필요. grep -B1 -A8 로 사전 컨텍스트 확보 권장
6. 12 Edit 분할 진행 전략 유효 — 각 Edit 후 diff --stat 검증으로 누적 오류 조기 발견. 81차에서 +25/-38 최종 diff 정확 확인

## 82차 시작 메시지 (사용자 -> 검수자)

GeniegoROI 프로젝트 82차 세션 시작합니다. 외부 검수자 역할 부탁드립니다. 자세한 인계 사항은 NEXT_SESSION.md (D:\project\GeniegoROI\NEXT_SESSION.md, master HEAD [81차 docs 커밋]에 포함, 마지막 섹션이 81차 종결+82차 인계)를 raw로 확인 부탁드립니다. 82차 시작 확인. 검수자 페어 진행 모드 인지. Claude Code 명령 t1번 결과 raw 수신 대기.

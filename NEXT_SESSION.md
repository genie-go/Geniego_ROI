# NEXT_SESSION.md (82차 종결 + 83차 인계)

---

## 현재 상태 (82차 종결, 확정 - push 미완)
- master HEAD: a592f8d
- working tree: clean
- origin 동기화: ↑2↓0 (push 미완)
- 82차 commit 2건:
  - 3d12477: refactor(api): apiClient.js patchJson wrapper 추가 (PATCH method) - 82nd
  - a592f8d: refactor(api): KrChannel.jsx 12 of 12 fetch -> apiClient wrappers (patchJson migration 완료) - 82nd
- 82차 작업 내용:
  - apiClient.js: patchJson(path, body) 함수 추가 (putJson 패턴 미러링, PATCH method, defaultHeaders, !res.ok throw, +19 lines)
  - KrChannel.jsx L5 import: { getJson, postJson, patchJson } 으로 patchJson 추가
  - KrChannel.jsx L396-399 raw fetch 4줄 → `await patchJson(\`/v419/kr/recon/tickets/${id}\`, patch);` 1줄 교체
  - KrChannel.jsx 사이드 이펙트 보존: `if (selReport) openReport(selReport.id);` 유지
- KrChannel.jsx fetch 잔존: 0개 (A-12 12/12 완료)
- fetch 잔존 (pages/*.jsx): 33파일 (PowerShell .Count 정확 카운트)
  - 상위 3개: AIInsights.jsx, AIPrediction.jsx, AIRecommendTab.jsx
  - 나머지 30개 미확인 (다음 회차 grep로 전체 목록 확보)
- SubscriberTabs.jsx: fetch 0건 (78차 클린, dead import 검증은 미실시 - 83차 #3)

---

## 83차 시작 메시지 (사용자 -> 검수자)

GeniegoROI 프로젝트 83차 세션 시작합니다. 외부 검수자 역할 부탁드립니다.

# 83차 핵심 (검수자 결정 대기)
- 82차 종결 완료: KrChannel.jsx 12/12 fetch 마이그레이션 (A-12 종료) + 82차 인계 docs (전체 재작성)
- master HEAD: a592f8d (origin 동기화 ↑2↓0, push 미완)
- 83차 진입 전 NEXT_SESSION.md raw 재검증 권장
- 83차 최우선: #1 push (82차 commits 2건 origin/master 업로드)

자세한 인계 사항은 NEXT_SESSION.md (D:\project\GeniegoROI\NEXT_SESSION.md, master HEAD a592f8d에 포함) 를 raw로 확인 부탁드립니다.

83차 시작 확인. 검수자 페어 진행 모드 인지. Claude Code 명령 t1번 결과 raw 수신 대기.

---

## 83차 첫 명령 (Claude Code에 1줄씩 입력)
- t1: t git -C "D:\project\GeniegoROI" log --oneline -10
- t2: t git -C "D:\project\GeniegoROI" status --short --branch
- t3: t git -C "D:\project\GeniegoROI" diff origin/master --stat
- t4: t git -C "D:\project\GeniegoROI" branch --show-current
- t5: t powershell -Command "(git -C 'D:\project\GeniegoROI' grep -l 'fetch(' -- 'frontend/src/pages/*.jsx').Count"
- t6: t git -C "D:\project\GeniegoROI" grep -l "fetch(" -- "frontend/src/pages/*.jsx"

기대값:
- HEAD = a592f8d (push 전) 또는 새 commit (push 후 docs commit 있을 시)
- working tree clean
- ↑2↓0 (push 전) 또는 ↑0↓0 (push 후)
- master 브랜치
- fetch 잔존 파일 카운트 = 33
- 잔존 파일 목록 (AIInsights.jsx, AIPrediction.jsx, AIRecommendTab.jsx, ... 30개 더)

---

## 83차 우선순위
1. **#1 push 우선 수행** (82차 commits 2건 + docs commit origin/master 업로드) - 검수자 승인 후 즉시 진행, 회차 ~1
2. **#2 fetch 마이그레이션 33파일 우선순위 선정** - 규모/복잡도/auth 여부 기준 첫 마이그레이션 대상 결정. 추천: AIInsights.jsx 또는 auth 무관 파일 우선. 회차 ~3 (정찰 + Edit + commit)
3. **#3 SubscriberTabs.jsx dead import 검증** (78차 마이그레이션 후 미정리 여부) - 75차 #4 3단계 검증 (정의/사용처/디렉토리 활성). 회차 ~1
4. **#4 Antigravity Agent 자율 편집 모니터링** (~3회차, 의도 불명확) - 82차 1회차에서 7회+ 자율 호출 발생, 패턴 지속 감시
5. **#5 자율 Edit 거부 절차 재확인** - 옵션 A-3 합의 절차 유지, 옵션 A-Read 1회 합의 신설 (82차 신규)

---

## 82차 신규 교훈 (83차 적용 필수)
1. **CC 출력 truncate 패턴** - `+N lines (ctrl+o to expand)` 잘림은 대용량 출력 환경 제약. grep -A20 도 ~4줄에서 잘림. 우회: PowerShell Get-Content + Select-Object -Index (작은 청크 분할) 또는 -Last N + UTF8 인코딩 명시
2. **PowerShell `$()` subexpression 권한 prompt 옵션 2 절대 금지** - "Yes, and don't ask again for: Get-Content" 옵션은 shift+tab 패턴과 유사. 옵션 1 (Yes) 만 선택 (81차 옵션 2 금지 규칙 확장)
3. **CC 자율 Edit 거부 후 절차 복원 패턴** - 동일 코드 재제안이라도 검수자 합의 (옵션 A-3) 명시 후 재진행. 거부 후 부분 적용 가능성 - git status --short 즉시 확인 (81차 #1 강화)
4. **CC 자율 Read/Bash 호출 다발 발생** - 82차 1회차에서 7회+ 발생 (NEXT_SESSION.md 읽기, KrChannel 본문 읽기, 자동 commit 명령 등). t 프리픽스 덮어쓰기 일관 적용 필수. Read 도구 자율 호출은 옵션 A-Read 1회 명시 합의 시에만 허용
5. **import 라인 + 본문 Edit 분리 전략** - 단일 Edit 통합 시 unique 식별 어려움 + Problems 경고 누적 위험. import 라인 별도 Edit 1회 + 본문 Edit 별도 1회 → 각 Edit 후 git status / diff --stat 즉시 검증 (81차 #6 강화)
6. **fetch 마이그레이션 시 사이드 이펙트 보존 명시** - `if (selReport) openReport(selReport.id)` 등 fetch 줄 후속 라인 명시 지시 필수. fetch 4줄만 교체하면 사이드 이펙트 손실 위험 (patchTicket void 함수 패턴 사례)
7. **잔존 fetch 정확 카운트는 PowerShell `.Count` 사용** - `git grep -l "fetch(" -- "pages/*.jsx"` 출력은 CC truncate 가능성. `(... | grep -l ...).Count` 로 숫자만 반환받아 docs 정확 기록 (33파일 확정 사례)
8. **UTF-8 인코딩 명시 필수 (PowerShell Get-Content)** - 기본 인코딩으로 한글 파일 읽으면 .Count 부정확, 본문 깨짐. `-Encoding UTF8` 명시로 정확 처리 (NEXT_SESSION.md 라인 수 사례)
9. **파일 EOF append 시 Edit 도구는 위험** - old_string 미일치 시 실패. 대안 1) PowerShell Add-Content (안전, 임시 파일 필요) 2) **전체 재작성 + 메모장 복붙** (가장 안전, 인코딩 깨짐 위험 0) - 82차 종결 docs 본 방식 채택

---

## 검수자 운영 원칙 (70~82차 정착, 불변)
- 자율 추천 절대 금지 (79차/80차/81차/82차 다발 발생)
- raw 결과만 받기 (Claude Code 자체 분석은 참고만)
- t 프리픽스 누락 시 즉시 정지 + 재입력 요청
- CC create_file/Write/Edit 도구 사용 금지 (단, 옵션 A-3 명시 합의 시 Edit 1회 허용)
- CC Read 도구 자율 호출 금지 (단, 옵션 A-Read 1회 명시 합의 시 1회 허용 - 82차 신규)
- CC 자동 생성 텍스트는 엔터 불가, 검수자 명령으로 t 프리픽스 덮어쓰기만 가능 (80차 사용자 재확인)
- CC 명령어 1개씩만 입력 가능
- 너무 긴 설명 지양
- 검수자 명령으로 저장 가능한 것은 검수자가 직접 진행
- 사용자 결정 필요 시 검수자 추천 1개 동반
- 위험 명령 (push, force, reset, checkout HEAD, --hard, commit, rm) 자동 생성 시 즉시 t 프리픽스 + 빈 명령 입력 대기
- dead code 검증 정의/사용처/디렉토리 활성 3단계 필수 (75차 #4)
- 다중 라인 패턴 편집 후 저장 전 Problems 패널 raw 확인 + git diff 라인 수 검증 (77차 #1, #3)
- 인계 파일 경로 raw 재검증 (78차 #1)
- VS Code 좌하단 master* 클릭 금지 (79차 #5)
- 인계 블록 Edit 후 sed 검증 필수 + 인계 블록 내 기대값 HEAD는 docs commit 후 HEAD로 정정 (80차 #7, #8)
- CC Edit 도구 승인 시 옵션 2 (allow all edits, shift+tab) 절대 금지 - 옵션 1 (Yes) 만 선택
- CC Edit 후 디스크 직접 저장됨 - VS Code 탭의 M 표시는 잔존, git status로 검증
- CC Edit 거부 후 부분 적용 상태 가능성, git status --short 즉시 확인 (81차 #1)
- import 블록 Edit 시 useT 등 활성 import 명시 보존 지시 (81차 #2)
- PowerShell `$()` subexpression 권한 prompt 옵션 2 (don't ask again) 절대 금지 - 옵션 1 (Yes) 만 (82차 #2)
- 파일 EOF append 작업은 전체 재작성 + 메모장 복붙 방식 우선 검토 (82차 #9)

---

## 과거 회차 핵심 교훈 누적 (78~81차)

### 78차 핵심 교훈
1. 인계 파일 경로 raw 재검증 - 시스템 메시지 추정 라인 번호와 실제 파일 라인 번호 차이 가능

### 79차 핵심 교훈
1. 자율 추천 금지 강화 - CC가 검수자 동의 없이 다음 작업 멋대로 진행 사례 다발
2. VS Code 좌하단 master* 클릭 금지 - 의도치 않은 stash/checkout 위험

### 80차 핵심 교훈
1. 인계 블록 Edit 후 sed 검증 필수 - Edit 도구 적용 결과는 미리보기와 실제 디스크가 다를 수 있음
2. 인계 블록 내 기대값 HEAD는 docs commit 후 HEAD로 정정 - 코드 commit 직후가 아닌 최종 HEAD 기준

### 81차 핵심 교훈
1. CC Edit 거부 후 재시도 패턴 - 거절된 Edit은 파일에 반영 안 됨, git status --short 로 즉시 확인 필수
2. useT 보존 필수 - import 블록 수정 시 활성 import 라인 명시 보존 지시 필요
3. try/catch for !r.ok 패턴 - postJson은 !r.ok 시 throw. 기존 `if (!r.ok) { ... return; }` 패턴은 `try { d = await postJson(...) } catch { ...; return; }` 로 변환
4. PowerShell `;` 체이닝 주의 - `cd X ; git add Y ; git commit` 형태는 앞 명령 실패 시에도 계속 진행. CC는 `git -C` 플래그 방식으로 안전하게 재작성
5. 동일 패턴 중복 Edit 시 unique 식별 - fetch 패턴이 3곳 동일할 경우 Edit old_str 충돌. 앞뒤 컨텍스트 unique 식별 필요
6. 12 Edit 분할 진행 전략 유효 - 각 Edit 후 diff --stat 검증으로 누적 오류 조기 발견

---

## 82차 작업 회고 (참고)
- 진행 회차: 약 30회차 (Opus 사용량 기준 회차 압박 없음 확인)
- CC 자율 호출 7회+ 발생, 모두 t 프리픽스로 덮어쓰기 성공
- PowerShell 권한 prompt 옵션 2 (don't ask again) 3회 발생, 모두 옵션 1 (Yes) 선택 성공
- Edit 도구 3회 사용 (apiClient.js patchJson, KrChannel.jsx import, KrChannel.jsx 본문) + 1회 거부 + 1회 실패 (NEXT_SESSION.md old_string 미일치)
- Read 도구 1회 자율 호출 합의 (옵션 A-Read 1회, 신규 패턴)
- docs 처리: Edit 도구 실패 후 전체 재작성 + 사용자 메모장 복붙 방식 채택 (82차 #9 교훈)
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
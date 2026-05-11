# GeniegoROI 프로젝트 인계서 (72차용)

## 71차 핵심 (검수자 결정 대기)
- 71차 완전 종결 완료: T-C (.gitattributes 추가 + LF renormalize) 2-commit 분리 진행
- 72차 진입 전 NEXT_SESSION.md raw 재검증 권장

## 71차 종결 상태 (확정)
- master HEAD: 2189993 (push 완료, origin/master 동기화)
- working tree: 깨끗 (master ↑0 ↓0)
- 71차 commit 2건 (모두 push):
  - 7cad7f5: chore(git): add .gitattributes for LF normalization (T-C phase 1)
  - 2189993: chore(git): renormalize line endings via .gitattributes (T-C phase 2)
- renormalize 실제 변경 범위: tools/migrations/_archived/_prod_files.txt 1개 파일 (12+/12-, -w 기준 변경 없음 확인)
- .gitattributes 검증: check-attr로 text=auto, eol=lf 자기 적용 확인

## 72차 첫 명령 (CC 입력 완료 예정)
- t1: t git -C "D:\project\GeniegoROI" log --oneline -10
- t2: t git -C "D:\project\GeniegoROI" status --short
- t3: t git -C "D:\project\GeniegoROI" diff origin/master --stat
- t4: t git -C "D:\project\GeniegoROI" branch --show-current
- t5: t git -C "D:\project\GeniegoROI" remote -v
- 기대값: HEAD=2189993, working tree clean, ↑0↓0, master, origin 정상

## 72차 우선순위 후보
1. 후보 A (T-1/T-3 후속 표준화) — 회차 ~10 (70차/71차 인계, 미진행)
   - apiClient.js 다른 인증 함수 사용처 raw 검색 (requestJsonAuth, getJsonAuthWithHeaders, postFileAuth)
   - raw fetch 패턴 grep으로 표준화 대상 파일 식별
2. 후보 B (메신저 5파일 verify) — 회차 ~10, 69차 인계 (미진행)
3. 후보 D (.gitattributes 후속 영향 검증) — 회차 ~3
   - 다른 작업자 clone 시 라인 엔딩 정상 적용 확인
   - CI 환경에서 라인 엔딩 관련 경고 모니터링

## 검수자 운영 원칙 (70차/71차 정착, 불변)
- 자율 추천 절대 금지 (정책 #1)
- raw 결과만 받기 (Claude Code 자체 분석은 참고만)
- t 프리픽스 누락 시 즉시 정지 + 재입력 요청
- CC create_file/Write/Edit 도구 사용 금지
- CC 자동 생성 텍스트는 t 프리픽스로 무력화 후 덮어쓰기 (ESC/Enter 불가)
- CC 명령어 1개씩만 입력 가능 (배치 입력 불가)

## 71차 핵심 교훈 (72차 적용 필수)
1. .gitattributes 적용 전 사전 검증 필수: core.autocrlf 값 확인, git ls-files, Test-Path 3단 확인으로 기존 상태 명확화
2. renormalize 영향 범위 사전 예측은 신뢰 불가 — 실제 git diff --cached --stat으로 raw 확인 (예상 대규모였으나 실제 1개 파일)
3. 라인 엔딩 변경 검증의 황금 패턴: --stat → --numstat → -w --stat 3단 검증 (70차 교훈 #3 적용)
4. 2-commit 분리 (Phase 1 add → Phase 2 renormalize) 시 revert 단위 명확화 + CI 리뷰 의도 명확
5. .gitattributes 자체에 text/eol 규칙 적용됨 확인 (check-attr -a로 자기 적용 검증)
6. VS Code 에디터의 strikethrough 빨간 줄은 Antigravity Agent 시각 표시일 뿐, Problems 탭 확인으로 진위 판단
7. 검수자 VS Code 직접 파일 생성/편집 방식 (CC Write/Edit 금지 원칙 + 70차 교훈 #4 대응 정착)

## 70차 핵심 교훈 (불변 적용)
1. CC bash 출력 truncate 일관 발생 → `| cat`, head -N, sed 우회 또는 사용자 VS Code 스크린샷이 raw 확보 최종 수단
2. CC raw 위장 (할루시네이션) 가능성 → md5sum + wc -l + grep -c 같은 metadata 교차 검증 필수
3. core.autocrlf=true 환경의 git diff 함정 → git diff -w 또는 git diff --cached로 실제 변경 검증
4. CC Edit 도구의 의도 오해석 위험 (sed 명령을 잘못 변환 사례) → 사용자 VS Code 직접 Edit 권장
5. CC 자율 commit 메시지 작성 빈번 → 검수자가 69차/70차/71차 패턴 일관 메시지로 덮어쓰기
6. python3 Windows 미설치 → Node.js 또는 bash heredoc 우회

## 검수자 페어 진행 모드
- 외부 검수자 (Claude.ai web)
- Claude Code (CC, VS Code 내장 Agent)
- 검수자가 t 프리픽스 명령으로 CC 자동 생성 텍스트 무력화 + 1개씩 명령 입력
- raw 결과는 검수자가 VS Code 스크린샷으로 검수자(Claude.ai)에 전달
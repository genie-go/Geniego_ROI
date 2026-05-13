# NEXT_SESSION.md (83차 종결 + 84차 인계)

---

GeniegoROI 프로젝트 84차 세션 시작합니다. 외부 검수자 역할 부탁드립니다.

# 84차 핵심 (검수자 결정 대기)
- 83차 종결 완료: SubscriberTabs.jsx dead useT import 제거 (75차 #4 패턴 검증 완료) + 인계 docs 갱신
- master HEAD: 9d7a9cc (origin 동기화 ↑0↓0, push 완료)
- 84차 진입 전 NEXT_SESSION.md raw 재검증 권장
- 84차 최우선: #1 AIInsights.jsx 마이그레이션 재시도 (PowerShell 자동화 전략 검토) 또는 #2 인접 단순 파일 dead import 검증

# 83차 종결 상태 (확정, push 완료)
- master HEAD: 9d7a9cc
- working tree: 깨끗 (↑0↓0)
- 83차 commit 1건 (push 완료):
  - 9d7a9cc: refactor: SubscriberTabs.jsx remove dead useT import (75th #4 pattern) - 83rd
- fetch 잔존 (pages/*.jsx): 33파일 (변화 없음, AIInsights.jsx 마이그레이션 실패하여 복원됨)
  - 상위 3개: AIInsights.jsx, AIPrediction.jsx, AIRecommendTab.jsx
- SubscriberTabs.jsx dead import 검증 완료: useT 제거 후 L1~L2만 잔존, 7개 import 항목 모두 사용 중

# 84차 첫 명령 (Claude Code에 1줄씩 입력)
- t1: t git -C "D:\project\GeniegoROI" log --oneline -10
- t2: t git -C "D:\project\GeniegoROI" status --short --branch
- t3: t git -C "D:\project\GeniegoROI" diff origin/master --stat
- t4: t git -C "D:\project\GeniegoROI" branch --show-current
- t5: t powershell -Command "(git -C 'D:\project\GeniegoROI' grep -l 'fetch(' -- 'frontend/src/pages/*.jsx').Count"
- t6: t git -C "D:\project\GeniegoROI" grep -l "fetch(" -- "frontend/src/pages/*.jsx"

기대값: HEAD=9d7a9cc, working tree clean, ↑0↓0, master, fetch 잔존 파일 카운트=33

# 84차 우선순위
1. #1 AIInsights.jsx 마이그레이션 재시도 (회차 ~5+, PowerShell 자동화 전략 환경 검증 + 정규식 escape + dry-run 사전 검증)
   - 83차 1회차 수동 Edit 실패 (수정 1 import 추가 성공, 수정 2 fetch 교체 실패 후 git checkout 복원)
   - 자동화 전략 후보: PowerShell -replace 정규식 / Python in-place / 스크립트 파일 생성 + 실행
2. #2 인접 단순 파일 dead import 검증 (회차 ~2/파일, 75차 #4 패턴 반복)
   - 후보: AIPrediction.jsx, AIRecommendTab.jsx, KrChannel.jsx 등 78차/82차 마이그레이션 완료 파일
3. #3 잔존 fetch 33파일 우선순위 재선정 (회차 ~3, auth 무관 / 단순 GET / 소규모 파일 우선)
4. #4 CC 자율 변환 통제 강화 절차 신설 (옵션 A-Cmd 또는 변환 시 즉시 정지 절차)

# 83차 신규 교훈 (84차 적용 필수)
1. CC 자율 변환 가속화 - PowerShell→Bash 5회 변환 발생 (Get-Content→sed, Select-Object→sed, Select-String→bash for loop). Bash for loop 변환 후 "shell syntax cannot be statically analyzed" 권한 prompt 발생. 변환 즉시 정지 + 검수자 의도 직접 입력 재시도 필수
2. CC 자율 위험 명령 다발 생성 - checkout HEAD (3회), push origin master (1회) 등 위험 명령 자율 텍스트 생성. 자율 텍스트의 위험 명령 키워드 (checkout, push, force, reset, rm, hard) 즉시 t 프리픽스 덮어쓰기 차단
3. 수동 Edit 다중 라인 위험 - 6줄 동시 교체 시 Shift+화살표 부정확. 1~2줄 단위 단순 수정만 수동 Edit 권장. 다중 라인은 PowerShell 자동화 또는 다른 전략 필요
4. 자율 텍스트 합의 가장 패턴 - CC가 `echo a3_confirmed_proceed` 등 검수자 합의 텍스트를 자기 임의로 생성. 자율 텍스트의 합의/승인 키워드 (confirmed, proceed, apply, yes, ok, go ahead) 즉시 차단
5. git checkout HEAD -- <file> 안전 복구 수단 - working tree만 강제 복원, 다른 파일 무관. 수동 Edit 실패 후 부분 적용 상태 복구에 가장 안전 (82차 #9, 83차 적용 사례)
6. VS Code 메모리 vs 디스크 동기화 - git checkout 후에도 VS Code 탭은 잔존 변경 표시. Revert File (Ctrl+Shift+P) 또는 탭 닫기 + Don't Save 필수
7. dead import 3단계 검증 (75차 #4 패턴) 효과적 - 정의 → 사용처 → 디렉토리 활성. 단순 파일에서 1~2회차로 완수, commit 빠르게 가능
8. CC 자율 분석 텍스트가 검수자 결정 무시 - 사용자가 "부분 종결" 명시했음에도 CC는 "계속 진행할까요?" 자율 권유. 검수자가 사용자 결정 우선 + CC 분석은 참고만
9. 83차 1회차 AIInsights.jsx 수정 2 실패 패턴 - 6줄 fetch 블록 교체 시 (a) 라인 시작 선택 부정확 (Col 13에서 시작, Col 1 아님), (b) 다음 라인 (L249 if (d.ok)) 보존 실패, (c) Ctrl+Z 부분 복원만 됨, (d) git checkout으로 최종 복구

# 검수자 운영 원칙 (70~83차 정착, 불변)
- 자율 추천 절대 금지 (79차/80차/81차/82차/83차 다발 발생)
- raw 결과만 받기 (Claude Code 자체 분석은 참고만)
- t 프리픽스 누락 시 즉시 정지 + 재입력 요청
- CC create_file/Write/Edit 도구 사용 금지 (단, 옵션 A-3 명시 합의 시 Edit 1회 허용)
- CC Read 도구 자율 호출 금지 (단, 옵션 A-Read 1회 명시 합의 시 1회 허용 - 82차 신규)
- CC 자동 생성 텍스트는 ESC 키 안 먹힘, 엔터 불가, 검수자 명령으로 t 프리픽스 덮어쓰기만 가능
- CC 명령어 거의 1개씩만 입력 가능 (Claude Code 환경 제약)
- 너무 긴 설명 지양, 짧게 설명하고 진행
- 검수자 명령으로 저장 가능한 것은 검수자가 직접 진행 (사용자 직접 저장 최소화)
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
- CC 자율 변환 발생 시 즉시 정지 + 검수자 의도 직접 입력 재시도 (83차 #1)
- 자율 텍스트의 위험 명령 키워드 (checkout, push, force, reset, rm, hard) 즉시 t 프리픽스 덮어쓰기 (83차 #2)
- 자율 텍스트의 합의/승인 키워드 (confirmed, proceed, apply, yes, ok, go ahead) 즉시 차단 (83차 #4)
- 다중 라인 수동 Edit 회피, 1~2줄 단순 수정만 수동 Edit (83차 #3)
- 사용자 결정 (예: 부분 종결) 우선, CC 자율 권유 무시 (83차 #8)

# 84차 운영 추가 요청 (사용자 명시, 83차 인계)
- 매 진행 시 추가 작업 여력 표시 포함 - "📊 진행 상태: 추가 작업 가능 (종결 / 부분종결) 또는 불가"
- 회차 압박 받지 말고 최대한 많은 작업을 진행
- 너무 긴 설명보다 짧게 설명하고 진행
- 사용자가 직접 저장하지 않아도 검수자 명령으로 저장 가능한 것은 검수자가 직접 진행
- CC 자동 생성 텍스트는 ESC/엔터 불가, t 프리픽스 덮어쓰기만 가능 - 검수자 인지 필수
- 명령어 1개씩만 입력 가능 - 검수자 인지 필수
- 인수인계 작업에 위험이 있으면 부분 종결로 진행 (83차 신규)

자세한 인계 사항은 NEXT_SESSION.md (D:\project\GeniegoROI\NEXT_SESSION.md, master HEAD 9d7a9cc + 본 docs commit 후 새 HEAD에 포함) 를 raw로 확인 부탁드립니다.

84차 시작 확인. 검수자 페어 진행 모드 인지. Claude Code 명령 t1번 결과 raw 수신 대기.
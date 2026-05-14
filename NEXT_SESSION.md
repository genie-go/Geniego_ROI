GeniegoROI 프로젝트 91차 세션 시작합니다. 외부 검수자 역할 부탁드립니다.

# 91차 핵심
- 90차 종결: 2 commits push 완료 (4bb6824 + 2ea8191)
- master HEAD: 2ea8191 (origin 동기화 ↑0↓0 - 90차 종결 commit 후 91차 인계 commit으로 변경 예정)
- 90차 결과: OrderHub.jsx 엔터프라이즈급 export 보강 (CSV Injection 가드, useState/useMemo/useCallback, addAlert, disabled/aria-label/aria-busy/title) + ko/en i18n 9키 추가 + 중복 키 정리
- 91차 방향: B안 (13개 추가 언어 i18n 동기화) 또는 신규 작업 영역

# 91차 첫 명령 (raw 검증)
- t1: t git -C "D:\project\GeniegoROI" log --oneline -10
- t2: t git -C "D:\project\GeniegoROI" status --short --branch
- t3: t powershell -Command "Get-Content 'D:\project\GeniegoROI\SESSION_90_VERIFICATION.md' -Encoding UTF8"

기대값: HEAD=2ea8191 (또는 91차 인계 commit), working tree clean, ↑0↓0

# 91차 작업 영역 후보 (검수자 사전 제시, 사용자 선택)
- **A안 (추천):** B안 옵션 1A - 13개 언어 × 90차 신규 9키 (117키, 단순 패턴, 빠른 진행)
- **B안:** B안 옵션 1B - 13개 언어 × 89차+90차 28키 풀 동기화 (364키, 풀 i18n-sync)
- **C안:** Connectors.jsx UI 작업 (88차 D안 보류, Phase 1, 5일 추정)
- **D안:** SECURITY_AUDIT_REPORT.md 기반 보안 작업
- **E안:** PM_ANALYSIS_REPORT.md + PM_PAGE_ANALYSIS.md 자체 재작성
- **F안:** CatalogSync.jsx 31줄 useCatalogSecurity 훅 진짜 버그 검증
- **G안:** ESLint 환경 복구 (90차에서 손상 확인, @eslint/eslintrc 누락, npm install 또는 의존성 재설치)
- **H안:** OrderHub.jsx 추가 보강 - PII 마스킹 옵션, 대용량 가드 (10000+ 행 사용자 확인 prompt), exportFilename 통합 유틸

# 90차 신규 교훈 (91차 적용 필수)
1. CC raw 출력 압축 빈번 - sed -n / for-loop PowerShell 우회 시 ctrl+o 압축, 사용자 직접 Explorer 캡쳐 효과적 (88차 신규 #2 재확인)
2. CC 자율 Edit 도구 다단계 사용 - 사용자 명세 도착 전 자체 적용 사례 누적 (89차 신규 #2 재발), 결과 일치하나 향후 주의
3. CC 자율 위험 명령 (push) 반복 차단 - push 자율 생성 3회 차단 (88차 신규 #4 재확인)
4. CC 자율 텍스트 한국어 합의 키워드 빈번 - "진행하시겠습니까?", "Edit 내용 지정해주시면 적용" 등 (88차 신규 #3 재확인)
5. CC 경로 자율 변경 - i18n/ko.js → i18n/locales/ko.js 자체 교정 (89차 신규 #3)
6. OWASP CSV Injection 가드 적용 - 엔터프라이즈 보안 강화 패턴 (`=`, `+`, `-`, `@`, `\t`, `\r` 접두 sanitize)
7. i18n 중복 키 위험 - 89차 키 + 90차 키 동일 이름 시 ESLint 'no-dupe-keys' 가능, 즉시 정리 권장
8. B안 i18n-sync는 별도 차수 - 다수 언어 동기화는 단순 패턴 fetch라도 작업 분량 폭증, 별도 차수 분리 권장
9. CRLF 경고 무해 - Windows core.autocrlf=true 환경 정상 동작
10. node -c syntax 검증 - ESLint 손상 시 대안, JS 파일 syntax 확인 가능 (JSX는 별도 빌드 필요)

# 검수자 운영 원칙 (70~90차 정착, 불변)
- 자율 추천 금지 (단, 검수자 추천 1개 동반 가능)
- raw 결과만 받기 (CC 자체 분석은 참고)
- t 프리픽스 누락 시 즉시 정지 + 재입력 요청
- CC create_file/Write/Edit 도구 사용 금지 (단, 합의 시 Edit 1회 허용)
- CC Read 도구 자율 호출 금지 (sed -n 우회)
- CC 자율 텍스트 t 프리픽스 덮어쓰기로 차단
- CC 명령어 1개씩만 입력
- 짧게 설명하고 진행
- 검수자 명령 직접 진행 우선
- 사용자 결정 시 검수자 추천 1개 동반
- 위험 명령 (push, force, reset, checkout HEAD, --hard, commit, rm, add) 자동 생성 시 즉시 차단
- dead code 검증 정의/사용처/디렉토리 활성 3단계 필수 (75차 #4)
- 자율 텍스트 위험 키워드 (checkout, push, force, reset, rm, hard) 즉시 차단 (83차 #2)
- 자율 텍스트 합의 키워드 (confirmed, proceed, apply, yes, ok, go ahead, 수정해줘, 진행할까요) 즉시 차단 (83차 #4 + 88차 #3)
- 다중 라인 수동 Edit 회피 (83차 #3)
- PowerShell → Bash 자동 변환 시 No 선택 (84차)
- Read 도구 우회: sed -n 사용 (85차)
- apiClient 교체 시 r.ok 분기 코드 동반 점검 (85차)
- PowerShell Add-Content 965 bytes 분할 (85차)
- 자율 텍스트 글자(엔터 안 쳐짐): 검수자가 t 프리픽스 명령어 별도 제공 (86차)
- 작성/저장 파일은 Write 도구 사용 시 UTF-8 보장 (86차)
- PowerShell 영구 허용 (2번) 절대 불가 - 매번 1번 Yes만 (87차)
- PM 문서 진단 단순 신뢰 금지, 75차 #4 검증 3단계 필수 (88차 #1)
- CC raw 출력 압축 우회 불가 - 사용자 직접 Explorer raw 클릭 채택 (88차 #2)
- CC 자율 합의 키워드 한국어 패턴 차단 (88차 #3)
- CC 자율 위험 명령 (add 포함) 사전 감지 강화 (88차 #4)
- 장문 보고서 = 검수자 작성 후 사용자 붙여넣기 채택 (88차 #5)
- 채팅 UI Edit new_string 200 line 초과 시 분할 또는 PowerShell 우회 사전 결정 필수 (89차)
- t 프리픽스 덮어쓰기는 시스템 설계, 위반 아님 (89차 명문화)
- Edit 합의 1회당 1 Edit 엄수, 자율 다단계 시 raw 검증 후 수습 (89차)
- CC 경로 자율 변경 사례 (src → frontend/src) 인지 + 검증 (89차)
- PowerShell 들여쓰기 검증 ` ' '` → `'·'` 치환 효과적 (89차)
- commit 분리 권장 - 변경 영역 분리 시 revert/cherry-pick 용이 (89차)
- OWASP CSV Injection 가드 적용 - 엔터프라이즈 보안 표준 패턴 (90차 신규)
- i18n 중복 키 즉시 정리 (90차 신규)
- B안 i18n-sync는 별도 차수 분리 (90차 신규)
- node -c syntax 검증 (ESLint 손상 시 대안, 90차 신규)

# 91차 운영 추가 요청 (사용자 명시)
- **매 명령마다 차수 표기 필수** (예: "91차 t1 명령")
- 작업 여력이 있는 한 추가 작업 최대 진행 - 다음 차수로 미루지 말 것
- 추가 작업 여력 부족 시에만 부분 종결 후 인계
- 부분 종결 시 다음 차수 명령문도 함께 작성
- 매 진행 시 추가 작업 여력 표시 - "📊 진행 상태: 추가 작업 가능 (종결/부분종결) 또는 불가"
- 짧게 설명하고 진행
- 검수자 명령 직접 진행 우선
- 자율 텍스트 t 프리픽스 덮어쓰기만 가능 (ESC/엔터 불가)
- 명령어 1개씩만 입력 가능
- 인계 작업 위험 시 부분 종결 (83차)
- 작업 규모 보수적 판단 회피 (84차)
- 단순 패턴 fetch는 적극 즉시 Edit (86차)
- 자율 텍스트 글자 엔터 안 쳐지면 검수자가 t 명령어 별도 제공 (86차)
- PowerShell 권한 1번 Yes만 (87차)
- 장문 보고서 = 검수자 작성 후 사용자 붙여넣기 (88차)
- 채팅 UI 텍스트 잘림 회피 = Edit 분할 또는 PowerShell 우회 (89차)
- t 프리픽스 덮어쓰기는 시스템 설계 (89차)
- CC 자율 Edit 다단계 누적 시 raw 검증 + 결과 일치 확인 (90차 신규)
- CC raw 압축 빈번 시 사용자 Explorer 직접 캡쳐 채택 (90차 신규)
- B안 옵션 1A/1B 선택 시 작업 분량 명확화 (90차 신규)

자세한 90차 인계 사항은 SESSION_90_VERIFICATION.md (D:\project\GeniegoROI\SESSION_90_VERIFICATION.md, master HEAD 2ea8191 이후 91차 인계 commit에 포함)를 raw로 확인 부탁드립니다.

91차 시작 확인. 검수자 페어 진행 모드 인지. Claude Code 명령 t1번 결과 raw 수신 대기.
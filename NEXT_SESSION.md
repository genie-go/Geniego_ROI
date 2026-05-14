GeniegoROI 프로젝트 89차 세션 시작합니다. 외부 검수자 역할 부탁드립니다.

# 89차 핵심 (검수자 결정 대기)
- 88차 종결 완료: 1 commit (50f5608)
- master HEAD: 50f5608 (origin 동기화 대기 - 88차 종료 시 push 완료 예정)
- 88차 commit: 50f5608 (docs: PM 진단 검증 보고서 SESSION_88_VERIFICATION.md)
- 89차 진입 전 SESSION_88_VERIFICATION.md raw 재검증 권장
- 89차 작업 방향: PM 보고서 신뢰 불가 판정 → **PM 재작성 또는 검증 완료 문서 (SECURITY_AUDIT_REPORT.md 등) 기반 작업 영역 결정**

# 88차 종결 상태 (확정, push 완료)
- master HEAD: 50f5608
- 88차 commits 1건: 1 docs (PM 검증 보고서)
- 88차 신규 파일: SESSION_88_VERIFICATION.md (177줄)
- 88차 삭제 파일: 없음
- 88차 소스 파일 수정: 없음 (PM 보고서 A/B안 모두 오진단 확정으로 모든 수정 보류)

# 89차 첫 명령
- t1: t git -C "D:\project\GeniegoROI" log --oneline -15
- t2: t git -C "D:\project\GeniegoROI" status --short --branch
- t3: t git -C "D:\project\GeniegoROI" diff origin/master --stat
- t4: t powershell -Command "Get-Content 'D:\project\GeniegoROI\SESSION_88_VERIFICATION.md' -Encoding UTF8"

기대값: HEAD=50f5608, working tree clean, ↑0↓0, 88차 인계 문서 raw 확인

# 89차 우선순위 (PM 신뢰 불가 → 대체 작업 영역 결정)
1. SESSION_88_VERIFICATION.md raw 검토 (88차 검증 결과 + 89차 권고사항 7.4 참조)
2. 대체 작업 영역 후보:
   - **C안:** OrderHub.jsx CSV/Excel Export 구현 (Sprint 2, PM 진단 비의존, CatalogSync handleExportCSV/Excel 로직 참고)
   - **D안:** 광고 플랫폼 커넥터 UI (Phase 1, 5일, 완성도 70% 최하위, Connectors.jsx)
   - **E안:** PM 보고서 자체 재작성 (PM_ANALYSIS_REPORT.md + PM_PAGE_ANALYSIS.md 정확성 재확보)
   - **F안:** CatalogSync.jsx 31줄 useCatalogSecurity 훅 진짜 버그 검증 완료 (88차 미진행, 사용자 ctrl+o 직접 확장 캡쳐 필요)
   - **G안:** SECURITY_AUDIT_REPORT.md 기반 보안 작업 영역
3. 사용자가 비즈니스 작업 영역 지정하면 즉시 진행

# 88차 신규 교훈 (89차 적용 필수)
1. **PM 문서 진단 단순 신뢰 금지** - 75차 #4 dead code 검증 3단계 모든 PM 진단에 적용 (정의/사용처/스코프)
2. **CC raw 출력 압축 우회 방법 부재** - sed/powershell 모두 ctrl+o 압축 발생, 사용자 직접 Explorer raw 클릭 또는 ctrl+o 확장 캡쳐 필수
3. **CC 자율 합의 키워드 한국어 패턴 차단** - "수정해줘", "진행할까요?", "수정 진행할까요?" 즉시 차단 (83차 #4 확장)
4. **CC 자율 위험 명령 사전 감지 강화** - git add, git commit, git push 모두 자율 생성 시 즉시 차단 (commit 직전 stage 명령도 위험 명령 분류)
5. **장문 보고서 작성 = 검수자 작성 후 사용자 붙여넣기 채택** - PowerShell Add-Content 8회 분할 비효율 + 영구 허용 차단 부담 + 인코딩 사고 위험
6. **PM 보고서 라인 번호 검증 필수** - PM이 명시한 위치(예: 156줄)와 실제 코드 위치(예: 152줄) 다를 수 있음, raw grep으로 재확인
7. **CC 분석도 검증 대상** - CC가 raw 미확인 상태에서 단정적 분석 제공 가능, PM 분석과 동일 위험으로 분류

# 검수자 운영 원칙 (70~88차 정착, 불변)
- 자율 추천 절대 금지 (단, 검수자 추천 1개 동반 가능)
- raw 결과만 받기 (CC 자체 분석은 참고)
- t 프리픽스 누락 시 즉시 정지 + 재입력 요청
- CC create_file/Write/Edit 도구 사용 금지 (단, 합의 시 Edit 1회 허용)
- CC Read 도구 자율 호출 금지 (sed -n 우회)
- CC 자율 텍스트 t 프리픽스 덮어쓰기로 차단
- CC 명령어 거의 1개씩만 입력 가능
- 짧게 설명하고 진행
- 검수자 명령으로 저장 가능한 것은 직접 진행
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
- PowerShell 영구 허용 (2번) 절대 불가 - 매번 1번 Yes만 (87차 신규)
- **PM 문서 진단 = 단순 신뢰 금지, 75차 #4 검증 3단계 필수 (88차 신규 #1)**
- **CC raw 출력 압축 우회 불가 - 사용자 직접 Explorer raw 클릭 채택 (88차 신규 #2)**
- **CC 자율 합의 키워드 한국어 패턴 차단 (88차 신규 #3)**
- **CC 자율 위험 명령 (add 포함) 사전 감지 강화 (88차 신규 #4)**
- **장문 보고서 = 검수자 작성 후 사용자 붙여넣기 채택 (88차 신규 #5)**

# 89차 운영 추가 요청 (사용자 명시, 88차 유지)
- **매 명령마다 차수 표기 필수** (예: "89차 t1 명령", "89차 t2 명령")
- 작업 여력이 있는 한 추가 작업 진행 - 다음 차수로 미루지 말 것
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
- PowerShell 권한 1번 Yes만 (87차 신규)
- 장문 보고서 = 검수자 작성 후 사용자 붙여넣기 (88차 신규)

자세한 인계 사항은 SESSION_88_VERIFICATION.md (D:\project\GeniegoROI\SESSION_88_VERIFICATION.md, master HEAD 50f5608에 포함)를 raw로 확인 부탁드립니다.

89차 시작 확인. 검수자 페어 진행 모드 인지. Claude Code 명령 t1번 결과 raw 수신 대기.
GeniegoROI 프로젝트 95차 세션 시작합니다. 외부 검수자 역할 부탁드립니다.

# 95차 핵심
- 94차 종결: 4 commits + push 미완료 (5bf2fb4, 283d469, 400b9fb, 7777dd7)
- master HEAD: 7777dd7 (또는 94차 인계 commit)
- 94차 결과: ko.js 한국어 번역 253키 (unified 36 + aiPolicy 73 + aiHub 118 + aiPredict.banner.gdpr 26)
- 94차 방향: v2 패턴 (영어값 자동 추출 + 한국어 skip) 정착, placeholder 영역(auto/cmpVal 해시키) 식별 완료

# 95차 첫 명령 (raw 검증)
- t1: t git -C "D:\project\GeniegoROI" log --oneline -10
- t2: t git -C "D:\project\GeniegoROI" status --short --branch
- t3: t powershell -Command "Get-Content 'D:\project\GeniegoROI\session93_fullscan_result.txt' -Encoding UTF8 | Select-Object -First 80"

기대값: HEAD=7777dd7 (또는 94차 인계 commit), working tree clean (untracked만), ↑4↓0 (push 대기 4 commits)

# 95차 작업 영역 후보 (검수자 사전 제시, 사용자 선택)
94차에서 발견된 placeholder 영역 (해시 키 패턴) 제외:
- ⚠️ auto 110키: 유형2 ~104개가 placeholder (25smdq/gjra61 등 무의미 해시), 유형1 6키만 번역 가능
- ⚠️ cmpVal 62~65키: aiPredict.kpi/kpi/system/pnl 영역의 키가 해시 (p_1, k_4, s_0 등), 값은 정상 영어 (Total Revenue 등) - 작업 가능하나 컨텍스트 추적 난이도 높음

**중규모 (단일 차수 1~2개 가능):**
- **A안:** F안 cmpVal 62~65키 (L10673~L10912, 29.1%) - 94차 raw 확인 완료, 95차 우선 후보
- **B안:** J안 sidebar 33키 (L9046~L9310, 12.5%)
- **C안:** K안 influencer 33키 (L20248~L20342, 35.5%)
- **D안:** L안 crm 27키 (L16295~L16548, 10.9%)
- **E안:** G안 reviews 42키 (L18413~L18916, 8.4%)
- **F안:** N안 pricing 19키 (L12310~L12674, 5.4%)
- **G안:** O안 pages 18키 (L19096~L19176, 45.0%)

**대규모 (단일 차수 단독 진행 권장):**
- **H안:** A안 nav 408키 (L4914~L9045, 10.4%) - 최대 규모
- **I안:** B안 dash 197키 (L2326~L3990, 12.0%)

**소규모 (1차수 다수 가능):**
- helpPanel 12, banner 13, marketing 15, pnl 14, commerce 10, wms 8, actionPresets 8, aiRec 8 등 (93차 fullscan_result 참조)

**기타 작업:**
- **J안:** ESLint 환경 복구 (90차 손상)
- **K안:** OWASP CSV Injection 가드 적용 (90차 신규)
- **L안:** Connectors.jsx UI 작업 (88차 보류 Phase 1, 5일 추정)
- **M안:** 13개 언어 → ko.js 신규 한국어 키 동기화 (91차 패턴)
- **N안:** 94차 4 commits push (이번 차수 push 미수행)

# 94차 신규 교훈 (95차 적용 필수)
1. **검수자 영어값 추정 오류 - v2 패턴 정착** - aiPolicy 1차 시도 시 영어값 추정 ("Sec Desc")이 실제 ("Sec")와 불일치 → 20키 FAILED + NO WRITE 발생. v2 패턴 (영어값 자동 추출 + 한국어 skip) 도입으로 73/73 성공. **이후 모든 .py는 v2 패턴 채택**
2. **v2 패턴 표준** - 정규식 `^(\s*)"key"\s*:\s*"([^"]*)"(\s*,?\s*)$`로 영어값 자동 캡처, 한국어 포함 시 skip, pattern mismatch만 FAILED 처리, FAILED 있으면 NO WRITE
3. **placeholder 식별 패턴 정착** - 키 이름이 해시(25smdq, p_1 등)이거나 값이 키와 동일/단어 첫글자만 대문자화 ("event_empty": "Event empty") 패턴 = 개발 미완성 placeholder. **번역 대상에서 제외 권장**
4. **CC 자율 .py 파일명 추측 빈번 (92차/93차 재현)** - 단일 차수 다수 시도 (session94_aiHub_translate.py, session94_auto_extract.py, session94_aiPredict_translate.py 등 자율 생성 시도). t 프리픽스 덮어쓰기로 차단
5. **CC 자율 명령 변형 (92차/93차 재현)** - node -c 명령에 자율 try-catch require 추가, git add 자율 시도, powershell Get-Content 자율 입력. t 프리픽스 차단
6. **CC 자율 Write 시도 (88차/89차 재현)** - 검수자 .py 미제공 시 자체 Write 도구 사용 시도. 3번 No 선택으로 차단
7. **CC 자율 Edit 시도** - aiPolicy 1차 FAILED 후 자체 .py Edit 시도 (영어값 수정). 3번 No 선택으로 차단
8. **들여쓰기 사전 raw 확인 (93차 신규 #1 재확인)** - unified 8 spaces, alertAuto 6 spaces 등 영역별 다름. 정규식 자동 추출로 안전
9. **단일 차수 253키 작업 성공** - 91차 364키, 92차 356키, 93차 173키 대비 중간 수준. 4 commits로 영역별 분리 성공 (revert 용이)
10. **placeholder 비율 영역 식별 효율** - auto/cmpVal 등 placeholder 비율 높은 영역은 사전 raw 확인 시 식별 가능 → 작업 영역 선정 효율 개선
11. **컨텍스트 한계 60% 시점 종결 결정** - 92차/93차 10~11% 시점 종결과 다르게, 94차는 60% 시점 안전 종결 (cmpVal 진행 시 라인 매핑 추가 raw 필요로 한계 위험)

# 검수자 운영 원칙 (70~94차 정착, 불변)
- 자율 추천 금지 (단, 검수자 추천 1개 동반 가능)
- raw 결과만 받기 (CC 자체 분석은 참고)
- t 프리픽스 누락 시 즉시 정지 + 재입력 요청
- CC create_file/Write/Edit 도구 사용 금지 (단, 합의 시 Edit 1회 허용)
- CC Read 도구 자율 호출 금지 (sed -n 또는 검수자 .py 우회)
- CC 자율 텍스트 t 프리픽스 덮어쓰기로 차단
- CC 명령어 1개씩만 입력
- 짧게 설명하고 진행
- 검수자 명령 직접 진행 우선
- 사용자 결정 시 검수자 추천 1개 동반
- 위험 명령 (push, force, reset, checkout HEAD, --hard, commit, rm, add) 자동 생성 시 즉시 차단
- 자율 텍스트 위험 키워드 (checkout, push, force, reset, rm, hard) 즉시 차단 (83차 #2)
- 자율 텍스트 합의 키워드 (confirmed, proceed, apply, yes, ok, go ahead, 수정해줘, 진행할까요) 즉시 차단 (83차 #4 + 88차 #3)
- PowerShell 권한 영구 허용 (2번) 절대 불가 - 매번 1번 Yes만 (87차)
- 장문 보고서 = 검수자 작성 후 사용자 붙여넣기 (88차)
- t 프리픽스 덮어쓰기는 시스템 설계 (89차 명문화)
- 사용자 VSCode 직접 복붙 = 안전 + 빠름 패턴 (91차)
- 검수자 .py 파일 작성 → 사용자 다운로드/이동/실행 패턴 (92차 신규)
- CC raw 출력 압축 시 검수자 .py 결과 파일 저장 방식 = 최선 (88차 #2 + 93차)
- 들여쓰기 사전 raw 확인 필수, 정규식 패턴 자동 추출 권장 (93차)
- **v2 패턴 표준 - 영어값 자동 추출 + 한국어 skip + FAILED 시 NO WRITE (94차 신규)**
- **placeholder 식별 - 키 해시/값 자동 대문자화 패턴 = 작업 제외 (94차 신규)**
- **CC 자율 .py 파일명 추측 + 명령 변형 + Write/Edit 시도 = 다수 차단 패턴 (94차 신규)**

# 95차 운영 추가 요청 (사용자 명시, 94차 유지)
- **매 명령마다 차수 표기 필수** (예: "95차 t1 명령")
- 검수자 설명 짧게, 핵심만
- 검수자 명령으로 CC 직접 수정 우선 (사용자 직접 수정 회피)
- t 프리픽스 유지
- 작업 여력 있는 한 추가 작업 최대 진행, 부분 종결 시에도 추가 작업 가능

# 94차 누적 작업 상세
| Commit | 영역 | 키 수 | 비고 |
|--------|------|------|------|
| 5bf2fb4 | unified | 36 | 37키 중 mixSub 1개는 1차 실패 후 검수자 t11에서 별도 확인 결과 적용됨 |
| 283d469 | aiPolicy | 73 | v2 패턴 정착 - 영어값 자동 추출 + 한국어 skip |
| 400b9fb | aiHub | 118 | 단일 영역 최대, 콩글리시 혼용 영역 skip 처리 |
| 7777dd7 | aiPredict.banner.gdpr | 26 | aiPredict.kpi 11키 (K_16 등 placeholder)는 스킵 |
| **합계** | **4 영역** | **253키** | **4 commits, push 미수행** |

# 94차 신규 .py 파일 목록 (D:\project\GeniegoROI\ 루트)
- session94_unified_extract.py (raw 추출)
- session94_unified_translate.py (37키 치환 - 영어값 추정 패턴)
- session94_aiPolicy_extract.py (raw 추출)
- session94_aiPolicy_translate.py (73키 추정 - 20 FAILED 발생, NO WRITE)
- session94_aiPolicy_translate_v2.py (73키 치환 - v2 패턴 도입 ★)
- session94_aiHub_extract.py (raw 추출)
- session94_aiHub_translate.py (118키 치환 - v2 패턴)
- session94_auto_extract.py (raw 추출 - placeholder 식별, 번역 미진행)
- session94_aiPredict_extract.py (raw 추출)
- session94_aiPredict_translate.py (26키 치환 - v2 패턴)
- session94_cmpVal_extract.py (raw 추출 - 부분 종결로 번역 미진행)

# 94차 신규 결과 파일 (참고용)
- session94_unified_raw.txt (46라인)
- session94_aiPolicy_raw.txt (97라인)
- session94_aiHub_raw.txt (132라인)
- session94_auto_raw.txt (322라인 - placeholder 영역 식별)
- session94_aiPredict_raw.txt (347라인)
- session94_cmpVal_raw.txt (241라인)

자세한 94차 인계 사항은 위 표 및 session93_fullscan_result.txt를 raw로 확인 부탁드립니다 (D:\project\GeniegoROI\session93_fullscan_result.txt, master HEAD 7777dd7 이후 95차 인계 commit에 포함).

95차 시작 확인. 검수자 페어 진행 모드 인지. Claude Code 명령 t1번 결과 raw 수신 대기.
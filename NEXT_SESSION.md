GeniegoROI 프로젝트 96차 세션 시작합니다. 외부 검수자 역할 부탁드립니다.

# 96차 핵심
- 95차 종결: 3 commits + push 미완료 (ab443ef, 5a4e8c3, 61a6796) + 94차 누적 4 commits = 총 7 commits push 대기
- master HEAD: 61a6796 (또는 95차 인계 commit)
- 95차 결과: ko.js 한국어 번역 148키 (cmpVal area1 69 + cmpVal area2 67 + helpPanel 12)
- 95차 방향: v2 패턴 정착 유지, area별 분리 commit, 매핑 부족 시 r2/r3/r4/r5 반복 보강 패턴 정착

# 96차 첫 명령 (raw 검증)
- t1: t git -C "D:\project\GeniegoROI" log --oneline -10
- t2: t git -C "D:\project\GeniegoROI" status --short --branch
- t3: t powershell -Command "Get-Content 'D:\project\GeniegoROI\session93_fullscan_result.txt' -Encoding UTF8 | Select-Object -First 80"

기대값: HEAD=61a6796 (또는 95차 인계 commit), working tree clean (untracked만), ↑7↓0 (push 대기 7 commits)

# 96차 작업 영역 후보 (검수자 사전 제시, 사용자 선택)
94차/95차에서 발견된 placeholder 영역 (해시 키 패턴) 제외:
- ⚠️ auto 110키: 유형2 ~104개가 placeholder (25smdq/gjra61 등 무의미 해시), 유형1 6키만 번역 가능

**중규모 (단일 차수 1~2개 가능):**
- **A안:** J안 sidebar 33키 (L9046~L9310, 12.5%)
- **B안:** K안 influencer 33키 (L20248~L20342, 35.5%)
- **C안:** L안 crm 27키 (L16295~L16548, 10.9%)
- **D안:** G안 reviews 42키 (L18413~L18916, 8.4%)
- **E안:** N안 pricing 19키 (L12310~L12674, 5.4%)
- **F안:** O안 pages 18키 (L19096~L19176, 45.0%)

**대규모 (단일 차수 단독 진행 권장):**
- **G안:** A안 nav 408키 (L4914~L9045, 10.4%) - 최대 규모
- **H안:** B안 dash 197키 (L2326~L3990, 12.0%)

**소규모 (1차수 다수 가능):**
- banner 13, marketing 15, pnl 14, commerce 10, wms 8, actionPresets 8, aiRec 8 등 (93차 fullscan_result 참조)

**기타 작업:**
- **I안:** ESLint 환경 복구 (90차 손상)
- **J안:** OWASP CSV Injection 가드 적용 (90차 신규)
- **K안:** Connectors.jsx UI 작업 (88차 보류 Phase 1, 5일 추정)
- **L안:** 13개 언어 → ko.js 신규 한국어 키 동기화 (91차 패턴)
- **M안:** 94차 4 commits + 95차 3 commits = 총 7 commits push (이번 차수 push 미수행)

# 95차 신규 교훈 (96차 적용 필수)
1. **콘솔 cp949 인코딩 우회 - 결과 파일 저장 패턴 정착** - translate v2 r1 실행 시 stdout에 em dash(—) 출력으로 cp949 인코딩 에러 발생 → 결과 파일 저장 방식(RESULT_PATH)으로 우회 성공. **이후 모든 translate .py는 결과 파일 저장 기본**
2. **유니코드 특수문자 매핑 주의** - middle dot "·" (U+00B7), em dash "—" (U+2014), 이모지 "⚡" (U+26A1) 등 영문값에 포함된 특수문자는 매핑 dict 키에서도 동일 유니코드 사용 필수. 정규식 \uXXXX 표기 권장
3. **v2 패턴 r1→r2→r3 반복 보강 패턴 정착** - cmpVal area1 (r1→r2→r3, 3회 반복), area2 (r1→r2, 2회 반복), helpPanel (r1→r2, 2회 반복). 매핑 부족 시 FAILED + NO WRITE → 누락 키만 매핑 추가 → r+1 실행
4. **영역 분리 .py - 단일 추출 + 다중 영역 식별** - cmpVal 영역이 2개로 분리되어 있음 (area1 L6711~L6834 124라인 + area2 L10673~L10912 240라인). 추출 .py는 영역별 자동 식별 + 별도 파일 저장
5. **영역별 commit 분리 성공** - 95차 3 commits (cmpVal area1 / cmpVal area2 / helpPanel). revert 용이 + 의미 단위 분리
6. **분석 + translate 통합 .py 단축 패턴** - 소규모 영역 (helpPanel 56라인)은 분석/translate 분리 대신 통합 .py로 단축. 매핑 부족 시 분석 결과 + FAILED + NO WRITE 동시 출력
7. **CC 자율 PowerShell 명령 변형 (94차 #5 재현)** - $env:PYTHONIOENCODING 자율 추가, Out-File 자율 변경, node -e require() 자율 추가. 모두 2번 No로 차단 성공
8. **CC 자율 raw 명령 추가 (94차 #5 재현)** - Get-Content -First 30 자율 추가 (검수자 명령 후속). 결과 확인용이지만 차단
9. **CC 자율 입력창 텍스트 (88차/89차 재현)** - 다음 .py 실행 명령을 입력창에 자율 입력 (translate.py, analyze.py 등). t 프리픽스 덮어쓰기로 차단
10. **사용자 파일 직접 복붙 위험 발생** - area1_raw.txt에 split.py 코드 잘못 붙여넣음 → Ctrl+Z로 복원 성공. **이후 사용자 복붙 대신 검수자 분석 .py로 우회**
11. **사용자 파일 다운로드/이동/실행 패턴 우월성 재확인** - VSCode 직접 복붙보다 검수자 .py → 사용자 다운로드/이동 → 검수자 t 실행 + 결과 파일 저장 → 사용자 raw 확인 방식이 안전 + 빠름
12. **단일 차수 148키 작업 안전 종결** - 91차 364키, 92차 356키, 93차 173키, 94차 253키 대비 중간 수준. 75% 컨텍스트 시점 안전 종결 (94차 60% 시점 종결과 유사)

# 검수자 운영 원칙 (70~95차 정착, 불변)
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
- 사용자 VSCode 직접 복붙 = 안전 + 빠름 패턴 (91차) **단 area1_raw.txt 사고 후 위험 (95차)**
- 검수자 .py 파일 작성 → 사용자 다운로드/이동/실행 패턴 (92차 신규)
- CC raw 출력 압축 시 검수자 .py 결과 파일 저장 방식 = 최선 (88차 #2 + 93차)
- 들여쓰기 사전 raw 확인 필수, 정규식 패턴 자동 추출 권장 (93차)
- **v2 패턴 표준 - 영어값 자동 추출 + 한국어 skip + FAILED 시 NO WRITE (94차 신규)**
- **placeholder 식별 - 키 해시/값 자동 대문자화 패턴 = 작업 제외 (94차 신규)**
- **CC 자율 .py 파일명 추측 + 명령 변형 + Write/Edit 시도 = 다수 차단 패턴 (94차 신규)**
- **콘솔 cp949 우회 - translate .py는 RESULT_PATH 결과 파일 저장 기본 (95차 신규)**
- **유니코드 특수문자 매핑 - middle dot/em dash/이모지 정규식 \uXXXX 표기 (95차 신규)**
- **r1→r2→r3 반복 보강 패턴 - 매핑 부족 시 FAILED + 누락 키 매핑 추가 + r+1 실행 (95차 신규)**
- **사용자 raw 복붙 사고 후 - 검수자 분석 .py로 우회 권장 (95차 신규)**

# 96차 운영 추가 요청 (사용자 명시, 95차 유지)
- **매 명령마다 차수 표기 필수** (예: "96차 t1 명령")
- 검수자 설명 짧게, 핵심만
- 검수자 명령으로 CC 직접 수정 우선 (사용자 직접 수정 회피)
- t 프리픽스 유지
- 작업 여력 있는 한 추가 작업 최대 진행, 부분 종결 시에도 추가 작업 가능

# 95차 누적 작업 상세
| Commit | 영역 | 키 수 | 비고 |
|--------|------|------|------|
| ab443ef | cmpVal area1 | 69 | r1→r2→r3 (3회 반복, middle dot/em dash 매핑 보강) |
| 5a4e8c3 | cmpVal area2 | 67 | r4→r5 (2회 반복, List View/Channel Intelligence/⚡ Conversion Funnel 매핑 보강) |
| 61a6796 | helpPanel | 12 | r1→r2 (2회 반복, Title/Summary/Steps/Tips/noHelpFound/tryOther 매핑 보강) |
| **합계** | **3 영역** | **148키** | **3 commits, push 미수행** |

# 95차 신규 .py 파일 목록 (D:\project\GeniegoROI\ 루트)
- session95_cmpVal_extract.py (cmpVal 영역 자동 식별 추출 - 2개 영역 발견)
- session95_cmpVal_split.py (cmpVal raw를 area1/area2 분리)
- session95_cmpVal_area1_analyze.py (area1 키-값 분석 + 한국어/placeholder 식별)
- session95_cmpVal_area1_translate_v2.py (r1 - 영어값 추정 패턴, FAILED)
- session95_cmpVal_area1_translate_v2_r2.py (r2 - 결과 파일 저장 패턴 도입, cp949 우회, FAILED - middle dot 누락)
- session95_cmpVal_area1_translate_v2_r3.py (r3 - middle dot/em dash 매핑 보강, 69키 성공 ★)
- session95_cmpVal_area2_analyze.py (area2 키-값 분석)
- session95_cmpVal_area2_translate_v2_r4.py (r4 - 40개 매핑 1차 추정, FAILED - List View/Channel Intelligence/⚡ Conversion Funnel 누락)
- session95_cmpVal_area2_translate_v2_r5.py (r5 - 누락 3개 매핑 보강, 67키 성공 ★)
- session95_helpPanel_extract.py (helpPanel 영역 자동 식별 추출 - 2개 영역 발견)
- session95_helpPanel_translate_v2.py (r1 - 일반 도움말 영역 1차 추정, FAILED - title/summary/steps 누락)
- session95_helpPanel_translate_v2_r2.py (r2 - 누락 8개 매핑 보강, 12키 성공 ★)

# 95차 신규 결과 파일 (참고용)
- session95_log10.txt (git log 10 raw)
- session95_cmpVal_raw.txt (cmpVal 전체 raw)
- session95_cmpVal_area1_raw.txt (area1 raw 125라인)
- session95_cmpVal_area2_raw.txt (area2 raw 241라인)
- session95_cmpVal_area1_analysis.txt (area1 키-값 분석 결과)
- session95_cmpVal_area2_analysis.txt (area2 키-값 분석 결과)
- session95_cmpVal_area1_v2_result.txt (area1 translate r3 결과)
- session95_cmpVal_area2_v2_result.txt (area2 translate r5 결과)
- session95_cmpVal_area1_diff.txt (area1 git diff -U0 결과)
- session95_helpPanel_raw.txt (helpPanel 전체 raw - 2개 영역)
- session95_helpPanel_v2_result.txt (helpPanel translate r2 결과)

자세한 95차 인계 사항은 위 표 및 session93_fullscan_result.txt를 raw로 확인 부탁드립니다 (D:\project\GeniegoROI\session93_fullscan_result.txt, master HEAD 61a6796 이후 96차 인계 commit에 포함).

96차 시작 확인. 검수자 페어 진행 모드 인지. Claude Code 명령 t1번 결과 raw 수신 대기.
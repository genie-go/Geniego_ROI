GeniegoROI 프로젝트 94차 세션 시작합니다. 외부 검수자 역할 부탁드립니다.

# 94차 핵심
- 93차 종결: 3 commits + push 완료 (85451ed, 8560d5a, 9d37f4c)
- master HEAD: 9d37f4c (또는 93차 인계 commit)
- 93차 결과: ko.js 한국어 번역 173키 (riskStatus 3 + alertAuto 71 + catalogSync 73 + gdpr 26)
- 93차 방향: ko.js 전체 124개 섹션 매핑 완료, 미번역 1,433키 / 61개 섹션 식별

# 94차 첫 명령 (raw 검증)
- t1: t git -C "D:\project\GeniegoROI" log --oneline -10
- t2: t git -C "D:\project\GeniegoROI" status --short --branch
- t3: t powershell -Command "Get-Content 'D:\project\GeniegoROI\session93_fullscan_result.txt' -Encoding UTF8 | Select-Object -First 80"

기대값: HEAD=9d37f4c (또는 93차 인계 commit), working tree clean, ↑0↓0

# 94차 작업 영역 후보 (검수자 사전 제시, 사용자 선택)
93차 전수 스캔 결과 (session93_fullscan_result.txt) 기반 우선순위:

**대규모 (단일 차수 단독 진행 권장):**
- **A안:** nav 섹션 408키 (L4914~L9045, 10.4%) - 최대 규모
- **B안:** dash 섹션 197키 (L2326~L3990, 12.0%)
- **C안:** aiHub 섹션 118키 (L15848~L15978, 91.5%) - 비율 높음
- **D안:** auto 섹션 110키 (L16549~L16869, 34.5%)

**중규모 (단일 차수 1~2개 가능):**
- **E안:** aiPolicy 73키 (L15139~L15234, 77.7%)
- **F안:** cmpVal 62키 (L10673~L10912, 29.1%)
- **G안:** reviews 42키 (L18413~L18916, 8.4%)
- **H안:** aiPredict 38키 (L11199~L11544, 11.7%)
- **I안:** unified 36키 (L12041~L12085, 83.7%)
- **J안:** sidebar 33키 (L9046~L9310, 12.5%)
- **K안:** influencer 33키 (L20248~L20342, 35.5%)
- **L안:** crm 27키 (L16295~L16548, 10.9%)
- **M안:** gdpr 26키 → **93차 완료**
- **N안:** pricing 19키 (L12310~L12674, 5.4%)
- **O안:** pages 18키 (L19096~L19176, 45.0%)

**소규모 (1차수 다수 가능):**
- helpPanel 12, banner 13, marketing 15, pnl 14, commerce 10, wms 8, actionPresets 8, aiRec 8, super 7, common 7, rollup 7, dataProduct 6, marketingIntel 6, audit 6, reportBuilder 5, g 4, workspace 4, dashboard 4, catalogSync 4*, acctPerf 4, admin 4, journey 4, amazonRisk 3, ds 3, attrData 2, graphScore 2, budget 2, webPopup 2, menu 2, priceOpt 1, kakao 1, gNav 1, Data 1, help 1, krChannel 1, channelKpiPage 1, influencerUGC 1, dt 1, mr 1, omniChannel 1, mobileNav 1, accountPerf 1, gAiRec 1, dbAdmin 1, aiInsightsPage 1, jb 1

(* catalogSync 4: 93차 73키 commit 후 잔여 패턴 매칭 노이즈 가능성, 재검증 필요)

**기타 작업:**
- **P안:** ESLint 환경 복구 (90차 손상)
- **Q안:** OWASP CSV Injection 가드 적용 (90차 신규)
- **R안:** Connectors.jsx UI 작업 (88차 보류 Phase 1, 5일 추정)
- **S안:** 13개 언어 → ko.js 신규 한국어 키 동기화 (91차 패턴)

# 93차 신규 교훈 (94차 적용 필수)
1. **검수자 4 spaces 들여쓰기 가정 오류** - alertAuto 71키 4 spaces 작성 후 실제는 6 spaces → indent_fix 추가 작업 발생. **사전 raw 확인 필수**
2. **이후 .py는 정규식 패턴 자동 추출 채택** - `^(\s*)"key"\s*:\s*"value"(\s*,?\s*)$` 패턴으로 들여쓰기/콤마/줄바꿈 자동 보존
3. **검수자 .py 다운로드 위치 오류 빈번** - 사용자 폴더 이동 시 D:\project\GeniegoROI\claude_agent\ 아닌 D:\project\GeniegoROI\ 루트로 이동되는 경우 발생. 실행 명령은 실제 위치에 맞춰야 함
4. **CC 자율 .py 파일명 추측 빈번 재현** - 92차 #1 패턴 그대로 (session93_alertAuto_translate.py, session93_catalogSync_translate.py 등 자율 생성 시도 다수)
5. **CC raw 압축 빈번 (88차 #2 재확인)** - 검수자 .py 결과 파일 저장 방식이 가장 안전 (session93_catalogSync_scan_result.txt, session93_fullscan_result.txt, session93_gdpr_raw.txt 패턴)
6. **CC 자율 명령 변형 (92차 #7 재현)** - `node -c ko.js` → `node -c ko.js && echo "OK"` 자율 추가, `cd && python` 자율 결합
7. **CC 자율 텍스트 합의 키워드 한국어** - "진행할까요?", "yes 생성하고 바로 실행해줘", "스크립트 생성하고 바로 실행해줘" 다수 발생, t 프리픽스 덮어쓰기로 차단
8. **CC 시각 오인 사례 (91차 #신규 재현)** - 검수자 제공 .py 파일을 폴더에서 "찾을 수 없다" 주장 (실제 다른 위치에 존재)
9. **단일 차수 173키 작업 성공** - 91차 364키, 92차 356키 대비 소폭 적음 (1.5h 소요 추정). 3개 영역 분리 commit으로 추적성 우수
10. **전수 스캔 + 우선순위 매핑 패턴 정착** - session93_fullscan.py 패턴으로 124개 섹션 / 1,433키 / 61섹션 식별 완료. 94차 이후 작업 영역 선정 효율 대폭 개선

# 검수자 운영 원칙 (70~93차 정착, 불변)
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
- dead code 검증 정의/사용처/디렉토리 활성 3단계 필수 (75차 #4)
- 자율 텍스트 위험 키워드 (checkout, push, force, reset, rm, hard) 즉시 차단 (83차 #2)
- 자율 텍스트 합의 키워드 (confirmed, proceed, apply, yes, ok, go ahead, 수정해줘, 진행할까요) 즉시 차단 (83차 #4 + 88차 #3)
- 다중 라인 수동 Edit 회피 (83차 #3)
- PowerShell → Bash 자동 변환 시 No 선택 (84차)
- Read 도구 우회: sed -n 또는 검수자 .py 사용 (85차/93차)
- apiClient 교체 시 r.ok 분기 코드 동반 점검 (85차)
- PowerShell Add-Content 965 bytes 분할 (85차)
- 자율 텍스트 글자(엔터 안 쳐짐): 검수자가 t 프리픽스 명령어 별도 제공 (86차)
- 작성/저장 파일은 Write 도구 사용 시 UTF-8 보장 (86차)
- PowerShell 영구 허용 (2번) 절대 불가 - 매번 1번 Yes만 (87차)
- PM 문서 진단 단순 신뢰 금지, 75차 #4 검증 3단계 필수 (88차 #1)
- CC raw 출력 압축 우회 불가 - 사용자 직접 Explorer raw 클릭 또는 검수자 .py 결과 파일 저장 채택 (88차 #2 + 93차)
- CC 자율 합의 키워드 한국어 패턴 차단 (88차 #3)
- CC 자율 위험 명령 (add 포함) 사전 감지 강화 (88차 #4)
- 장문 보고서 = 검수자 작성 후 사용자 붙여넣기 채택 (88차 #5)
- 채팅 UI Edit new_string 200 line 초과 시 분할 또는 PowerShell 우회 사전 결정 필수 (89차)
- t 프리픽스 덮어쓰기는 시스템 설계, 위반 아님 (89차 명문화)
- Edit 합의 1회당 1 Edit 엄수, 자율 다단계 시 raw 검증 후 수습 (89차)
- CC 경로 자율 변경 사례 (src → frontend/src) 인지 + 검증 (89차)
- PowerShell 들여쓰기 검증 ` ' '` → `'·'` 치환 효과적 (89차)
- commit 분리 권장 - 변경 영역 분리 시 revert/cherry-pick 용이 (89차 + 93차 3분리 commit 사례)
- OWASP CSV Injection 가드 적용 - 엔터프라이즈 보안 표준 패턴 (90차 신규)
- i18n 중복 키 즉시 정리 (90차 신규)
- node -c syntax 검증 (ESLint 손상 시 대안, 90차 신규)
- PowerShell Set-Content -Encoding UTF8 = BOM 위험, 이모지 손상 (91차 신규)
- 사용자 VSCode 직접 복붙 = 안전 + 빠름 패턴 (91차 신규)
- CC 시각 오인 사례 - raw 재검증 필수 (91차 신규)
- 검수자 .py 파일 작성 → 사용자 다운로드/이동/실행 패턴 (92차 신규)
- CC 자율 .py 파일명 추측 빈번 - 검수자 미제공 파일명 자율 실행 차단 (92차 신규)
- Python `replace(...,1)` 순서 의존성 함정 - 동일 key+value 중복 시 후순위 미스 → line-based fix 스크립트로 보충 (92차 신규)
- PowerShell ConstrainedLanguage 차단 - `New-Object System.Text.UTF8Encoding` 등 .NET 화이트리스트 외부 → Python 우회 (92차 신규)
- VSCode 외부 파일 변경 충돌 모달 - Compare 클릭 후 diff 확인, Overwrite 안전 (92차 신규)
- 컨텍스트 한계 사전 인지 - `% until auto-compact` 10~11% 시점 즉시 종결 진행 (92차 신규)
- **검수자 들여쓰기 가정 오류 방지 - 사전 raw 확인 필수, 정규식 패턴 자동 추출 권장 (93차 신규)**
- **검수자 .py는 정규식 패턴 자동 추출 채택 - `^(\s*)"key"\s*:\s*"value"(\s*,?\s*)$` (93차 신규)**
- **검수자 .py 위치 오류 빈번 - 실행 전 dir 명령으로 실제 위치 확인 권장 (93차 신규)**
- **CC 자율 .py 파일명 추측 92차 #1 재현 - 단일 차수 다수 시도 (93차 신규)**
- **CC 자율 명령 변형 92차 #7 재현 - node -c에 echo 자율 추가, cd && python 자율 결합 (93차 신규)**
- **CC 시각 오인 91차 #신규 재현 - 검수자 .py를 못 찾는다 주장 (93차 신규)**
- **검수자 .py 결과 파일 저장 방식 = raw 압축 우회 최선 (93차 신규)**
- **전수 스캔 + 우선순위 매핑 = 작업 영역 효율 선정 (93차 신규)**

# 94차 운영 추가 요청 (사용자 명시, 93차 유지)
- **매 명령마다 차수 표기 필수** (예: "94차 t1 명령")
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
- CC 자율 Edit 다단계 누적 시 raw 검증 + 결과 일치 확인 (90차)
- CC raw 압축 빈번 시 사용자 Explorer 직접 캡쳐 또는 검수자 .py 결과 파일 채택 (90차 + 93차)
- 사용자 VSCode 직접 복붙 패턴 - 이모지/멀티바이트 손상 위험 회피 시 채택 (91차 신규)
- 그룹별 raw 시범 후 일괄 작업 - 효율 + 안전 균형 (91차 신규)
- 검수자 시각 오인 가능성 인지 - raw 재검증 필수 (91차 신규)
- 검수자 .py 파일 생성 시 raw 캡쳐 기반 정확한 키 매핑 작성 (92차 신규)
- 단일 차수 ~300키 일괄 작업 가능 - 91차/92차 패턴 검증 (92차 신규)
- 컨텍스트 한계 10~11% 시점 즉시 종결 전환 (92차 신규)
- **들여쓰기 사전 raw 확인 필수 (93차 신규)**
- **검수자 .py 결과 파일 저장 방식 = raw 우회 최선 (93차 신규)**
- **3분리 commit 패턴 - 영역별 분리 시 revert 용이 (93차 검증)**

# 93차 누적 작업 상세
| Commit | 영역 | 키 수 | 비고 |
|--------|------|------|------|
| 85451ed | riskStatus + alertAuto | 74 | 들여쓰기 4→6 교정 1회 발생 |
| 8560d5a | catalogSync 잔여 | 73 | 약어 11키 (SKU/ROAS/SMS/CRM/VAT/ID) 제외 |
| 9d37f4c | gdpr | 26 | 100% 완전 미번역 영역 |
| **합계** | **3개 영역** | **173키** | **3 commits** |

# 93차 신규 .py 파일 목록 (D:\project\GeniegoROI\ 루트)
- session93_alertAuto_translate.py (71키 치환)
- session93_alertAuto_indent_fix.py (4sp → 6sp 교정)
- session93_catalogSync_scan.py (출력 압축 버전 - 미사용)
- session93_catalogSync_scan_v2.py (결과 파일 저장 버전)
- session93_catalogSync_translate.py (74키 치환)
- session93_orderHub_scan.py (orderHub 영역 스캔, 1키 발견 - 약어 SKU)
- session93_fullscan.py (124개 섹션 전수 스캔)
- session93_gdpr_raw.py (gdpr raw 추출)
- session93_gdpr_translate.py (26키 치환)

# 93차 신규 결과 파일 (참고용)
- session93_catalogSync_scan_result.txt (85개 의심 라인)
- session93_orderHub_scan_result.txt (1개 의심)
- session93_fullscan_result.txt (124섹션 매핑 / 1,433 의심 / 61섹션)
- session93_gdpr_raw.txt (gdpr 26라인)

자세한 93차 인계 사항은 위 표 및 session93_fullscan_result.txt를 raw로 확인 부탁드립니다 (D:\project\GeniegoROI\session93_fullscan_result.txt, master HEAD 9d37f4c 이후 94차 인계 commit에 포함).

94차 시작 확인. 검수자 페어 진행 모드 인지. Claude Code 명령 t1번 결과 raw 수신 대기.
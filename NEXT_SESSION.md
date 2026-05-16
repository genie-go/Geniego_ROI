GeniegoROI 프로젝트 100차 세션 시작합니다. 외부 검수자 역할 부탁드립니다.

# 100차 핵심
- 99차 종결: 3 commits 완료 (2d07d6c common+dashboard 10키 + f2513c9 phase2 4키 + 8755a41 phase3 6키)
- master HEAD: 8755a41 (또는 100차 인계 commit)
- **push 완료** (99차 종결 시점, 907e0a5..8755a41 origin/master 반영) - working tree clean
- 99차 결과: ko.js 한국어 번역 20키 + Phase 4 G안 다국어 동기화 불필요 확정 (en.js 검증)
- 99차 방향: 98차 패턴 유지 + 99차 신규 (find_section_by_hint / em dash unicode escape / codepoint 디버깅 / 라인 기반 정확 교체 + line_hint)

# 100차 첫 작업 (확정)
**G안 다국어 동기화 재시도** - 99차 audit v2 결함 분석 후 정확 방식 재설계
- 99차에서 audit v2 (키 이름 + 섹션 매칭) 시도했으나 EXISTS: 0/280 결과 (전부 X)
- 단순 powershell grep으로 en.js에 키 다수 존재 확인 (L2009/L3494/L3748/L4039/L4944 등)
- 즉 audit v2의 section 추적 로직 결함 (depth 처리 오류 추정)
- 100차 1순위: audit v3 작성 → 다른 언어 파일에 99차 20키의 정확한 존재 여부 + 값 검증
- 한국어 노출 위험 검사 우선 (다른 언어 파일에 한국어 값 잘못 들어간 경우 확인 필수)

# 100차 첫 명령 (raw 검증)
- t1: t git -C "D:\project\GeniegoROI" log --oneline -10
- t2: t git -C "D:\project\GeniegoROI" status --short --branch
- t3: t powershell -Command "Get-Content 'D:\project\GeniegoROI\session99_phase4_audit_v2.txt' -Encoding UTF8 | Select-Object -First 80"

기대값: HEAD=8755a41 (또는 100차 인계 commit), working tree clean (untracked만), ↑0↓0 (push 완료) 또는 ↑1↓0 (100차 인계 commit만)

# 100차 작업 영역 후보 (99차 작업 결과 반영)

**완료된 영역 (99차)**: common, dashboard(L10127), dataProduct.budgetTracker, g.budgetTracker, attrData.ascoreTitle+markovRemoval, acctPerf, reportBuilder → 실질 미번역 핵심 키 0
**완료된 영역 (98차 이전)**: reviews, marketing, banner, wms, commerce, actionPresets, aiRec, pages, nav, dash, sidebar, helpPanel, cmpVal area1/area2, influencer, crm, pricing 등
**99차 audit 발견 (작업 제외)**: nav(46)/dash(32)/catalogSync(21)/rollup(12)/marketingIntel(10)/super(8)/journey(5) 등 = 대부분 업계용어/브랜드명/플랜명 영문 유지 표준
**99차 처리 보류**: common.underConstruction (L4600, "CampaignEnterpriseTabs" 의심값 - 사용자 직접 확인 필요)

**잔여 후보 (100차 첫 작업 - G안 동기화 재시도 후 결정)**:

**1순위 - G안 다국어 동기화** (99차 미완 인계, 100차 전담 추천):
- 99차 audit v2 결함 분석 (section 추적 로직 재설계)
- 다른 언어 파일에 99차 20키 정확 존재 여부 검증
- 한국어 노출 위험 검사 (다른 언어에 한국어 잘못 적용된 경우)
- 누락 키 있을 시 영어 원본 추가 sync .py 작성

**2순위 - 잔여 부분 영역** (99차 audit 발견):
- graphScore (4키 - Summary Score/Influencer/count/SKU)
- workspace (4키 - Starter/Growth/Pro/Enterprise = 브랜드 정책 결정 필요)
- super (8키 - OAuth/Meta Ads/Google Ads/Cafe24/Shopify = 대부분 영문 유지)
- marketingIntel (10키 - CPC/ROI/low/high/CTA = 대부분 영문 유지)
- common.underConstruction 버그값 처리 (사용자 결정 필요)

**기타 작업 후보**:
- **CRLF 환경 정리** (98~99차 CRLF 경고 누적 - git config core.autocrlf 표준화)
- **D안:** ESLint 환경 복구 (90차 손상)
- **E안:** OWASP CSV Injection 가드 적용 (90차 신규)
- **F안:** Connectors.jsx UI 작업 (88차 보류 Phase 1, 5일 추정)

# 100차 진행 순서 (검수자 추천)

**1순위 (100차 첫 작업, 확정)**: G안 다국어 동기화 재시도
- session100_phase4_audit_v3.py 작성 (99차 v2 결함 보완)
- 99차 audit v2 결함 원인 분석 우선 (section 추적 로직 디버깅)
- ko.js의 99차 20키 (section, key) 조합 다른 14개 언어 파일 정확 매칭
- 한국어 노출 위험 (HANGUL ⚠) 우선 확인
- 누락 시 영어 원본 sync .py 작성

**2순위**: 100차 1순위 결과 기반 작업 (sync or 100차 종결)
- 동기화 필요 시: 영어 원본 추가 sync → commit
- 동기화 불필요 확정: 99차 확정 보고 + 그래스 영역 작업으로 전환

**3순위**: graphScore + super + marketingIntel 등 잔여 audit + 작업

**4순위**: 차수 종결 + push + NEXT_SESSION 인계

**향후 차수 (101차 이후 추천)**:
- 잔여 미탐색 섹션 작업 (workspace 브랜드 정책 결정 후)
- CRLF 환경 정리
- D안 ESLint / E안 CSV Injection (보안/품질)
- F안 Connectors.jsx (5일 추정, 가장 큰 작업)

# 99차 신규 교훈 (100차 적용 필수)

1. **find_section_by_hint 패턴** - 동일 이름 섹션 중복 시 라인 hint 범위 명시로 정확 매칭. 96차 라인 기반 + 98차 섹션 자동 탐지 결합. dashboard(L888/L10127), `g`(L940/L4335), attrData(L9541/L12457), acctPerf(L773/L3868/L17701), reportBuilder(L13865/L20117) 등 다수 발견. **100차 audit v3 작성 시 hint 패턴 재사용 권장**
2. **em dash + 이모지 unicode escape (99차 신규)** - `\U0001F517` (🔗) + `\u2014` (—) 형태로 매핑 표기 = .py 파일 인코딩 사고 차단. 98차 #3 사고 (markovRemoval r1 NO WRITE)의 근본 해결책. **다른 언어 파일 sync 시 동일 패턴 필수**
3. **FAILED 시 codepoint 단위 디버깅 출력 (99차 신규)** - 미스매치 시 expected/actual 양쪽 모두 `[f"U+{ord(c):04X}" for c in val]` 표기. 즉시 hex 차이 식별 가능
4. **검수자 .py 경로 인계 문서 추측 위험 (99차 첫 사고)** - 99차 초기 `D:\project\GeniegoROI\ko.js` 잘못 사용. 실제 `D:\project\GeniegoROI\frontend\src\i18n\locales\ko.js`. **사전 raw `t powershell test -f` 또는 검수자 .py에 os.path.exists() + sys.exit(1) 패턴 표준화 (99차 신규)**
5. **이모지 직접 식별 위험 (99차 신규)** - VSCode/터미널 폰트에 따라 🔗(U+1F517)와 ⚙️(U+2699) 등 시각적 혼동. **반드시 codepoint hex로 검증 필요**
6. **다국어 audit v2 결함 인계 (100차 처리)** - 99차 phase4_audit_v2.py가 section 추적 로직 결함으로 EXISTS: 0/280 잘못 출력. en.js에는 키 정상 존재 (powershell Select-String 확인). 100차 v3 작성 시 단순 키 검색 + 가장 가까운 section 헤더 추적 방식 권장
7. **사용자 결정 영문 유지 키 재거론 차단 패턴 (99차 신규)** - CC가 사용자 결정 완료된 영문 유지 키 (pipeRawEvent/ltvTitle 등)를 반복 거론하는 경향. 차수 내 동일 키 1회 결정 후 재거론 = 즉시 차단
8. **CC 자율 .py 파일명 추측 누적 (99차)** - python session99_common_translate.py / session99_underConstruction_fix.py / session99_phase5_extract.py / session99_en_verify.py 등 존재하지 않는 .py 파일명 다수 자율 생성. t 프리픽스 무력화로 차단
9. **사용자 직접 캡처 패턴 효과 확인 (97차 표준 + 99차 확장)** - audit 결과 파일 다중 이미지 캡처로 CC raw 압축/cp949 사고 우회. 99차에서 7회 활용 (audit 결과/translate v2 검증/em dash 검증/Phase 4 audit 등). **100차 핵심 검증 단계마다 사용자 직접 캡처 권장**
10. **dashboard 인접 라인 회귀 검증 패턴 (99차 신규)** - VSCode 캡처에서 작업 키 외 인접 라인 raw도 함께 보임 = 의도하지 않은 회귀 발생 즉시 식별. 99차 dashboard 검증 시 heroDesc/totalRevToday 등 변동 없음 확인. **번역 작업 검증 시 인접 5~10라인 raw도 함께 보는 습관 정착**
11. **번역 정책 표준 (99차 추가)**:
    - 업계 표준 영문 유지 (97차/98차 + 추가): SKU/ROAS/ROI/CPC/CPM/CTR/CPA/CAC/LTV/P&L (회계)/Z-Score/B3
    - 데이터엔지니어링 영문 유지: Raw Event (99차 결정) / Live Sync (98차 결정)
    - 브랜드명 영문 유지: Channelper, OAuth, Meta Ads, Google Ads, Cafe24, Shopify (99차 confirmed)
    - 자체 지표명 + 한국어 부분 번역: "A-Score (어트리뷰션 신뢰도)" (99차 패턴)
    - 음차 표준: 콕핏(Cockpit), 워터폴(Waterfall), 마르코프(Markov)
    - 회계 표준: 순이익(Net Profit), 순 정산금(Net Payout), 배정 예산/집행 예산(Budget Allocated/Spent), 전기 대비(vs prev)
    - 일반 명사 한국어 번역: "전체 시스템 정상"(All Systems Go), "통합 운영 콕핏"(Unified Ops Cockpit), "출시 예정"(Coming Soon)

# 검수자 운영 원칙 (70~99차 정착, 불변)
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
- v2 패턴 표준 - 영어값 자동 추출 + 한국어 skip + FAILED 시 NO WRITE (94차 신규)
- placeholder 식별 - 키 해시/값 자동 대문자화 패턴 = 작업 제외 (94차 신규)
- CC 자율 .py 파일명 추측 + 명령 변형 + Write/Edit 시도 = 다수 차단 패턴 (94차 신규)
- 콘솔 cp949 우회 - translate .py는 RESULT_PATH 결과 파일 저장 기본 (95차 신규)
- 유니코드 특수문자 매핑 - middle dot/em dash/이모지 정규식 \uXXXX 표기 (95차 신규)
- r1→r2→r3 반복 보강 패턴 - 매핑 부족 시 FAILED + 누락 키 매핑 추가 + r+1 실행 (95차 신규)
- 사용자 raw 복붙 사고 후 - 검수자 분석 .py로 우회 권장 (95차 신규)
- candidates_audit.py 사전 검증 - 93차 fullscan 데이터 신뢰도 한계 우회 (96차 신규)
- section 정규식 표준 - 따옴표 선택적 + 중괄호 균형 추적 (96차 신규)
- placeholder 식별 유형 확장 - 동적 키 생성/이모지 단독값/실제 값 미확정 (96차 신규)
- 라인 기반 정확 교체 - 같은 키 중복 등장 영역 처리 (96차 신규)
- VSCode 사용자 직접 캡처 (다중 이미지) - CC raw 압축 우회의 빠르고 안전한 패턴 (97차 신규)
- 검수자 bash sed 활용 - r2/r3 작성 시 기존 .py에서 1~3개 매핑 수정으로 변경분 최소화 (97차 신규)
- CC 자율 sed 실행 차단 - 검수자 미동의 시 즉시 No (97차 신규)
- placeholder 매핑 = en_value == ko_value 패턴 - 실제 교체 없이 검증만 통과 (97차 신규)
- 섹션 자동 탐지 - find_section_ranges 함수로 중괄호 균형 추적, 라인 범위 수동 지정 불필요 (98차 신규)
- r1 NO WRITE 후 raw 검증 필수 - 부분 적용/전체 미적용 구분, r2 작성 시 정확 라인 확인 (98차 신규)
- 유니코드 미스매치 사전 raw 확인 - em dash/middle dot/이모지 등 특수문자 ko.js 직접 캡처 (98차 신규)
- CC Edit 도구 자율 시도 = 3번 No 차단 (98차 신규)
- typo 발견 → 검수자 sed .py 일괄 수정 패턴 (98차 신규)
- **find_section_by_hint - 동일 이름 섹션 중복 시 라인 hint 범위 매칭 (99차 신규)**
- **em dash + 이모지 unicode escape - .py 인코딩 사고 차단 (99차 신규)**
- **FAILED 시 codepoint 디버깅 출력 - U+XXXX 단위 차이 즉시 식별 (99차 신규)**
- **검수자 .py 경로 os.path.exists() + sys.exit(1) 표준화 (99차 신규)**
- **이모지 직접 식별 위험 - codepoint hex 검증 필수 (99차 신규)**
- **dashboard 인접 라인 회귀 검증 - 캡처 시 작업 키 외 인접 5~10라인도 확인 (99차 신규)**
- **사용자 결정 영문 유지 키 재거론 차단 - CC 반복 거론 차단 (99차 신규)**

# 100차 운영 추가 요청 (사용자 명시, 99차 유지)
- **매 명령마다 차수 표기 필수** (예: "100차 t1 명령")
- 검수자 설명 짧게, 핵심만
- 검수자 명령으로 CC 직접 수정 우선 (사용자 직접 수정 회피)
- t 프리픽스 유지
- 작업 여력 있는 한 추가 작업 최대 진행, 부분 종결 시에도 추가 작업 가능
- **엔터프라이즈급 작업 원칙 (정확성/안전성 최우선, 검증 단계 생략 금지)**
- **CC 자율 명령 생성 시 즉시 차단 (99차 패턴 누적)**
- **검수자 .py 파일 작성 → 사용자 outputs 다운로드 → D:\project\GeniegoROI\ 루트 저장 → t 명령 실행 패턴**
- **CC 자율 명령 차단은 t 프리픽스 덮어쓰기로 무력화, 에너지 낭비 회피 (99차 사용자 명시)**

# 99차 누적 작업 상세
| Commit | 영역 | 키 수 | 비고 |
|--------|------|------|------|
| 2d07d6c | common+dashboard | 10 | r1 (1회). common 6키 (noData/refresh/comingSoon×4) + dashboard 4키 (hero/allSystemsGo/netPayout/vsPrev at L10127 hint). 통합 commit. underConstruction L4600 "CampaignEnterpriseTabs" 의심값 보류 (사용자 직접 확인 필요 인계) |
| f2513c9 | phase2 (dataProduct+g+attrData) | 4 | r1 (1회). budgetTracker×2 (L797/L4358) + ascoreTitle (L9644 "A-Score (어트리뷰션 신뢰도)") + markovRemoval (L9679 "🔗 마르코프 체인 — 제거 효과" em dash + 이모지 unicode escape 패턴 표준화). pipeRawEvent (Raw Event 영문 유지), ltvTitle (Channelper 브랜드 영문 유지), grossRevenue/adSpend/netROAS×3 등 8키 영문 유지 결정 |
| 8755a41 | phase3 (acctPerf+reportBuilder) | 6 | r1 (1회). budgetAllocated/budgetSpent/noData (L17766~17768 acctPerf) + sectionPnl/kpiNetProfit/pnlNetProfit (L20141/L20153/L20175 reportBuilder, "P&L 워터폴"/"순이익"/"= 순이익"). 6키 영문 유지 (colRoas/colCtr/kpiRoas/colRoi/colSku 등 업계용어) |
| **합계** | **3 영역 묶음** | **20키** | **3 commits, push 완료 (907e0a5..8755a41)** |

# 99차 신규 .py 파일 목록 (D:\project\GeniegoROI\ 루트)

**Audit (사전 검증)**:
- session99_fullscan_audit.py (126개 섹션 자동 탐지 + 미번역 카운트 우선순위 표)
- session99_audit_raw_extract.py (audit 결과 raw 추출 - CC raw 압축 우회)
- session99_phase2_extract.py (3영역 multi audit + find_section_by_hint 첫 사용)
- session99_dashboard_extract_v2.py (L10127 hint 기반 dashboard 정확 추출 - 동일 이름 중복 처리 첫 사례)
- session99_em_dash_verify.py (L797/L4358/L9644/L9679 unicode 사전 검증 - markovRemoval U+1F517 + U+2014 확정)
- session99_phase3_extract.py (2영역 acctPerf + reportBuilder audit)
- session99_phase4_audit.py (라인 hint 방식, EXISTS: 0/280 실패)
- session99_phase4_audit_v2.py (키+섹션 방식, EXISTS: 0/280 또 실패 - section 추적 로직 결함, 100차 v3 인계)

**Translate v2 (영역별 번역)**:
- session99_common_dashboard_translate_v2.py (10키 SUCCESS ★ - 99차 첫 commit)
- session99_phase2_translate_v2.py (4키 SUCCESS ★ - em dash + 이모지 unicode escape 패턴 정착)
- session99_phase3_translate_v2.py (6키 SUCCESS ★)

**기타**:
- session99_common_dashboard_extract.py (find_section_ranges 첫 호출 - dashboard L888 잘못 매칭 → v2로 보강)
- session99_next_session_backup.py (NEXT_SESSION.md.bak99_pre_archive 백업)

# 99차 신규 결과 파일 (참고용)
- session99_fullscan_audit.txt (126개 섹션 + 285개 미번역 추정)
- session99_audit_raw_extract.txt (361 lines, 핵심 영역 강조 추출)
- session99_phase2_extract.txt (3영역 multi audit, 15키 발견 → 4키 실작업)
- session99_dashboard_extract_v2.txt (L10127 hint 매칭 정확)
- session99_em_dash_verify.txt (217개 em dash + L9679 U+1F517 + U+2014 확정)
- session99_phase3_extract.txt (12키 발견 → 6키 실작업)
- session99_common_dashboard_v2_result.txt (10키 WRITTEN)
- session99_phase2_v2_result.txt (4키 WRITTEN)
- session99_phase3_v2_result.txt (6키 WRITTEN)
- session99_phase4_audit.txt (라인 hint 0/280)
- session99_phase4_audit_v2.txt (키+섹션 0/280, 결함 인계)
- session99_next_session_backup.txt (NEXT_SESSION.md.bak99_pre_archive 9098자 검증)
- ko.js 백업: ko.js.bak_session99_v2_20260516_082816 (1차)
              ko.js.bak_session99_phase2_v2_<TS> (2차)
              ko.js.bak_session99_phase3_v2_<TS> (3차)

자세한 99차 인계 사항은 위 표 및 결과 파일들을 raw로 확인 부탁드립니다 (D:\project\GeniegoROI\session99_*.txt, master HEAD 8755a41 이후 100차 인계 commit에 포함).

# 99차 누적 통계 (이전 차수 대비)
- 91차 364키 / 92차 356키 / 93차 173키 / 94차 253키 / 95차 148키 / 96차 120키 / 97차 339키 / 98차 56키 + 1typo / **99차 20키**
- 99차는 98차보다 더 작은 작업량 (20키 vs 56키)이지만, 99차 첫 작업 fullscan_audit (126개 섹션 자동 탐지)로 ko.js 전체 영역 가시화 + 잔여 미번역 위치 정밀 파악. 99차는 정밀 작업 + 신규 패턴 정착에 집중
- 99차 신규 패턴 5종 (find_section_by_hint / em dash unicode escape / codepoint 디버깅 / 경로 사전 검증 / 이모지 hex 검증)이 100차+ 안정성에 큰 기여 예상
- 다음 차수 (100차)는 **G안 다국어 동기화 재시도 (audit v3) 권장** + 잔여 영역 추가 작업

100차 시작 확인. 검수자 페어 진행 모드 인지. Claude Code 명령 t1번 결과 raw 수신 대기.
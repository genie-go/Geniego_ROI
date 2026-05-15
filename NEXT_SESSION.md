GeniegoROI 프로젝트 97차 세션 시작합니다. 외부 검수자 역할 부탁드립니다.

# 97차 핵심
- 96차 종결: 4 commits + push 미완료 (42a2df6, 22a4525, 2707c64, d7ca3be) + 94차/95차 누적 7 commits + 96차 인계 1 = 총 12 commits push 대기
- master HEAD: d7ca3be (또는 97차 인계 commit)
- 96차 결과: ko.js 한국어 번역 120키 (influencer 57 + crm 27 + reviews 28 + pricing 8)
- 96차 방향: 변경안 A (placeholder 제외 사전 검증) 정착, sidebar 작업 불필요 발견, 후보 영역 일괄 감사 패턴 도입

# 97차 첫 명령 (raw 검증)
- t1: t git -C "D:\project\GeniegoROI" log --oneline -10
- t2: t git -C "D:\project\GeniegoROI" status --short --branch
- t3: t powershell -Command "Get-Content 'D:\project\GeniegoROI\session96_candidates_audit.txt' -Encoding UTF8 | Select-Object -First 60"

기대값: HEAD=d7ca3be (또는 97차 인계 commit), working tree clean (untracked만), ↑12↓0 (push 대기 12 commits)

# 97차 작업 영역 후보 (96차 candidates audit 기반, 신뢰 검증 완료)

**대규모 (단일 차수 단독 진행 권장):**
- **A안:** pages 396키 (L19096~ 인근, 96차 audit 결과 미번역 396, 10.0%)
- **B안:** nav 408키 (L4914~L9045, 93차 fullscan, 10.4%) - **사전 audit 필요**
- **C안:** dash 197키 (L2326~L3990, 93차 fullscan, 12.0%) - **사전 audit 필요**

**소규모 (1차수 다수 가능):**
- banner 13, marketing 15, pnl 14, commerce 10, wms 8, actionPresets 8, aiRec 8 등 (93차 fullscan_result 참조)
- **단, 93차 fullscan 데이터는 96차에서 sidebar 작업 불필요 발견 사례 있음 → audit 후 진행 권장**

**기타 작업:**
- **D안:** ESLint 환경 복구 (90차 손상)
- **E안:** OWASP CSV Injection 가드 적용 (90차 신규)
- **F안:** Connectors.jsx UI 작업 (88차 보류 Phase 1, 5일 추정)
- **G안:** 13개 언어 → ko.js 신규 한국어 키 동기화 (91차 패턴)
- **H안:** 12 commits push (이번 차수 push 미수행)

# 96차 신규 교훈 (97차 적용 필수)
1. **93차 fullscan 데이터 신뢰도 한계** - sidebar 33키 12.5% 미번역 → 실제는 sidebarXxx 16키 0개 미번역 (이미 번역 완료). 작업 전 candidates_audit.py로 사전 검증 필수
2. **placeholder 식별 패턴 확장** - 94차 auto 해시 키 외에 reviews의 k_3~k_20 (동적 키 생성 `k_${n}`), policyNote1~3 (실제 값 미확정), u_112 (이모지 단독값) 등 다양한 placeholder 유형 존재
3. **소수 매핑 미일치 발생 시 r2 보강 즉시 가능** - influencer 28개 누락 → r2 보강 1회 / crm/pricing은 r1 1회 성공 (정확한 raw 사전 확인 효과)
4. **candidates_audit.py 패턴 정착** - 5개 후보 영역 일괄 검증으로 작업 우선순위 결정. 93차 fullscan 비율과 실제 미번역 수 큰 차이 발견
5. **section 정규식 패턴 표준** - `(?:"|')?{section_name}(?:"|')?\s*:\s*\{{` (따옴표 선택적 + 중괄호 균형). 95차 v2 정규식 한계 (따옴표 없는 형식만) 보완
6. **라인 기반 정확 교체 패턴** - 96차 translate v2 r2 부터 `lines = content.split('\n')` + 라인 인덱스 기반 단일 교체. 같은 키가 여러 영역에 중복 등장해도 정확히 처리
7. **commit message 표준화** - "i18n(ko): translate {section} section to Korean (96차) - N keys (M placeholders excluded)" 형식
8. **CC 자율 raw 명령 후속 입력창 텍스트 패턴** (88차/89차/95차 재현) - 매 git/python 명령마다 CC가 다음 명령 자율 추측. t 프리픽스 덮어쓰기로 차단 성공
9. **사전 raw 확인 후 매핑 작성 시간 절약** - 96차 influencer는 raw 확인 후에도 28개 누락 발생, 사전 raw 확인이 무조건 r1 성공 보장은 아님 (영문값 미묘한 차이: "AI" vs "Ai", "Days" vs "days" 등)
10. **plan 명사 번역 vs 영문 유지 결정** - pricing 8키 중 ROI/LTV/CAC/SKU/#1 등 업계 표준 용어는 영문 유지, planStarter/planPro/planEnterprise 등 플랜명만 번역 (사용자 합의)

# 검수자 운영 원칙 (70~96차 정착, 불변)
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
- **candidates_audit.py 사전 검증 - 93차 fullscan 데이터 신뢰도 한계 우회 (96차 신규)**
- **section 정규식 표준 - 따옴표 선택적 + 중괄호 균형 추적 (96차 신규)**
- **placeholder 식별 유형 확장 - 동적 키 생성/이모지 단독값/실제 값 미확정 (96차 신규)**
- **라인 기반 정확 교체 - 같은 키 중복 등장 영역 처리 (96차 신규)**

# 97차 운영 추가 요청 (사용자 명시, 96차 유지)
- **매 명령마다 차수 표기 필수** (예: "97차 t1 명령")
- 검수자 설명 짧게, 핵심만
- 검수자 명령으로 CC 직접 수정 우선 (사용자 직접 수정 회피)
- t 프리픽스 유지
- 작업 여력 있는 한 추가 작업 최대 진행, 부분 종결 시에도 추가 작업 가능
- **엔터프라이즈급 작업 원칙 (정확성/안전성 최우선, 검증 단계 생략 금지)**

# 96차 누적 작업 상세
| Commit | 영역 | 키 수 | 비고 |
|--------|------|------|------|
| 42a2df6 | influencer | 57 | r1→r2 (2회 반복, AI/Ai 대소문자/days left 소문자/Done vs Paid 등 영문값 미묘 차이 28개 보강) |
| 22a4525 | crm | 27 | r1 (1회 성공, raw 사전 확인 효과) |
| 2707c64 | reviews | 28 | r1→r2→r3 (3회 반복, Unknown 대문자 + u_112 placeholder 제외 추가). 15 placeholders excluded (k_3~k_20 13개 + policyNote1~3 2개 + u_112) |
| d7ca3be | pricing | 8 | r1 (1회 성공, ROI/LTV/CAC/SKU/#1 등 업계 표준 영문 유지 5개 + Starter/Pro/Enterprise 플랜명 3개) |
| **합계** | **4 영역** | **120키** | **4 commits, push 미수행** |

# 96차 신규 .py 파일 목록 (D:\project\GeniegoROI\ 루트)
- session96_sidebar_extract.py (sidebar 영역 자동 식별 추출 - 2개 영역 14+14라인 모두 한국어 완료)
- session96_sidebarXxx_extract.py (sidebar prefix 평면 키 16개 모두 한국어 완료 확인 - sidebar 작업 불필요)
- session96_candidates_audit.py (5개 후보 영역 일괄 사전 검증 - 작업 우선순위 결정)
- session96_influencer_extract.py (influencer 영역 자동 식별 추출 + 분석 - 4개 영역 발견)
- session96_influencer_untranslated_list.py (influencer 미번역 키 단순 리스트)
- session96_influencer_translate_v2.py (r1 - 영어값 추정 매핑, FAILED 28개 누락)
- session96_influencer_translate_v2_r2.py (r2 - 정확한 raw 기반 매핑 재작성, 57키 성공 ★)
- session96_crm_extract.py (crm 영역 추출 + 미번역 리스트 통합)
- session96_crm_translate_v2.py (r1 - 27키 성공 ★)
- session96_reviews_extract.py (reviews 영역 추출 + 미번역 리스트 통합)
- session96_reviews_translate_v2.py (r1 - placeholder 제외 30개 매핑, FAILED - Unknown 대문자/u_112 누락)
- session96_reviews_translate_v2_r2.py (r2 - Unknown 보강 + 🎯 추가, FAILED - u_112 매핑 미일치)
- session96_reviews_translate_v2_r3.py (r3 - u_112 placeholder 제외 추가, 28키 성공 ★)
- session96_pricing_extract.py (pricing 영역 추출 + 미번역 리스트 통합)
- session96_pricing_translate_v2.py (r1 - 8키 성공 ★)

# 96차 신규 결과 파일 (참고용)
- session96_sidebar_raw.txt (sidebar 2개 영역 raw)
- session96_sidebarXxx_raw.txt (sidebar prefix 평면 키 리스트)
- session96_candidates_audit.txt (5개 후보 영역 일괄 검증 결과)
- session96_influencer_raw.txt (influencer 전체 raw - 4개 영역)
- session96_influencer_analysis.txt (influencer 키-값 분석 결과)
- session96_influencer_untranslated_list.txt (influencer 미번역 57개 단순 리스트)
- session96_influencer_v2_result.txt (r1 FAILED 28개 누락)
- session96_influencer_v2_r2_result.txt (r2 57키 성공)
- session96_crm_raw.txt (crm 단일 영역 raw)
- session96_crm_untranslated_list.txt (crm 미번역 27개)
- session96_crm_v2_result.txt (r1 27키 성공)
- session96_reviews_raw.txt (reviews 2개 영역 raw)
- session96_reviews_untranslated_list.txt (reviews 미번역 43개)
- session96_reviews_v2_result.txt (r1 FAILED - Unknown/u_112)
- session96_reviews_v2_r2_result.txt (r2 FAILED - u_112)
- session96_reviews_v2_r3_result.txt (r3 28키 성공, 15 excluded)
- session96_pricing_raw.txt (pricing 2개 영역 raw)
- session96_pricing_untranslated_list.txt (pricing 미번역 8개)
- session96_pricing_v2_result.txt (r1 8키 성공)

자세한 96차 인계 사항은 위 표 및 session96_candidates_audit.txt를 raw로 확인 부탁드립니다 (D:\project\GeniegoROI\session96_candidates_audit.txt, master HEAD d7ca3be 이후 97차 인계 commit에 포함).

# 96차 누적 통계 (이전 차수 대비)
- 91차 364키 / 92차 356키 / 93차 173키 / 94차 253키 / 95차 148키 / **96차 120키**
- 96차는 작업 영역 변경 (sidebar 불필요 → influencer/crm/reviews/pricing 4개 분산) 영향으로 키 수 다소 적음
- 단, candidates_audit.py 도입으로 다음 차수부터 작업 효율 대폭 향상 예상

97차 시작 확인. 검수자 페어 진행 모드 인지. Claude Code 명령 t1번 결과 raw 수신 대기.
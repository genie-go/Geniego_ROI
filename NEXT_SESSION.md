GeniegoROI 프로젝트 98차 세션 시작합니다. 외부 검수자 역할 부탁드립니다.

# 98차 핵심
- 97차 종결: 3 commits 완료 (a9d4255 pages 307키 + 0470ae5 nav 16키 + e141d9d dash 16키) + 누적 13 commits = **총 16 commits push 대기**
- master HEAD: e141d9d (또는 98차 인계 commit)
- 97차 결과: ko.js 한국어 번역 339키 (pages 307 + nav 16 + dash 16)
- 97차 방향: 96차 candidates_audit 패턴 정착 - pages 396 audit 검증 후 작업, nav/dash 사전 audit 진행 (93차 fullscan 데이터 신뢰도 한계 재확인 - nav 408 예상 → 실제 16, dash 197 예상 → 실제 16)

# 98차 첫 명령 (raw 검증)
- t1: t git -C "D:\project\GeniegoROI" log --oneline -10
- t2: t git -C "D:\project\GeniegoROI" status --short --branch
- t3: t powershell -Command "Get-Content 'D:\project\GeniegoROI\session96_candidates_audit.txt' -Encoding UTF8 | Select-Object -First 60"

기대값: HEAD=e141d9d (또는 98차 인계 commit), working tree clean (untracked만), ↑16↓0 (push 대기 16 commits)

# 98차 작업 영역 후보 (97차 작업 결과 반영, 신뢰 검증 완료)

**완료된 영역 (97차)**: pages, nav, dash → 실질 미번역 0

**잔여 후보 (97차 시점 미확인, 사전 audit 필수)**:

**소규모 (1차수 다수 가능, 검수자 추천)**:
- banner 13, marketing 15, pnl 14, commerce 10, wms 8, actionPresets 8, aiRec 8 등 (93차 fullscan_result 참조)
- **단, 93차 fullscan 데이터는 96차 sidebar / 97차 nav·dash 사례에서 신뢰도 한계 발견 → audit 후 진행 권장**

**기타 작업**:
- **D안:** ESLint 환경 복구 (90차 손상)
- **E안:** OWASP CSV Injection 가드 적용 (90차 신규)
- **F안:** Connectors.jsx UI 작업 (88차 보류 Phase 1, 5일 추정)
- **G안:** 13개 언어 → ko.js 신규 한국어 키 동기화 (91차 패턴)
- **H안:** 16 commits push (97차 push 미수행)

# 97차 신규 교훈 (98차 적용 필수)

1. **93차 fullscan 데이터 신뢰도 한계 누적 확인** - sidebar(96차) / nav(97차 408→16) / dash(97차 197→실제 한국어 번역 16, placeholder 다수). 작업 전 candidates_audit.py로 사전 검증 필수
2. **placeholder 식별 - 자동 해시 키 6자리 영숫자** - dash 섹션 sskd6g/ti6jzc/x87ynu 등 약 170개 placeholder. 96차 DYNAMIC_KEY_RE (k_/u_/h_\d+) 패턴 미감지. 매핑 작성 시 en_value == ko_value (대소문자만 차이) 검증 통과 후 실제 교체 없음 처리
3. **숫자/알파벳 혼동 주의** - dash r1 작성 시 pq41lt(숫자 1+알파벳 l) ↔ pq4llt, a14086(전부 숫자) ↔ a14o86(o) 혼동 사례. 사용자가 캡처 raw 직접 제공 시 안전, CC 분석 신뢰도 낮음
4. **r2 보강 패턴 - 검수자 sed 활용** - pages r2 (3개 수정), nav r2 (3개 제거), dash r2 (2개 수정) 모두 검수자 bash sed로 변경 → 사용자 다운로드 → 실행 패턴 정착
5. **CC sed 자율 실행 시 차단 필수** - dash r2 진행 중 CC가 자율 sed로 r2.py 수정 (결과는 검수자와 동일했으나 미동의 자율 명령). 차단 후 사용자 저장본으로 재실행
6. **번역 정책 표준 (97차)**:
   - 업계 표준 영문 유지: SKU/ROI/CPC/CVR/CTR/CTA/ROAS/ACOS/WMS/ERP/SCM/API/SaaS/CRM/RFM/LTV/BI/RBAC/3PL/A/B/Z-Score/SLA/ESG/P&L/AI/DM/UGC/VIP/B2B/CPA/CPM/IP/ID 등
   - 플랜명 영문 유지: Free/Growth/Pro/Pro+/Enterprise/PRO
   - 고유명사 영문 유지: WhatsApp/TikTok/Naver/Kakao/Google/Amazon/Shopify/Coupang/Cafe24/Geniego/Meta/LINE/Instagram/Facebook 등
   - 통화/환율 영문 유지: KRW/USD/JPY/EUR/Global
   - 한국어 번역: UI 라벨 / 정책 동의 / 플랜 기능 설명 / Operations Cockpit 타이틀 / 분석 라벨
7. **pages 영역 영문값 정확성** - r1 작성 시 "Auto Reports." (복수, ko.js 실제) vs "Auto Report." 오작성, r2에서 잘못 단수로 수정해서 r3 필요. 96차 raw 사전 확인의 정확성 중요
8. **dash 자동 해시 placeholder 매핑 시 분리 라인** - 매핑 항목 219개 중 ~170개는 placeholder. 매핑 표 내에서 한국어 번역 행 / 영문 유지 행 / placeholder 행을 명확히 주석으로 구분
9. **VSCode 사용자 직접 캡처 = 빠르고 안전** - 97차 dash untranslated 219줄 캡처 (6장 이미지) 으로 검수자 매핑 작성 가능, CC raw 압축 우회

# 검수자 운영 원칙 (70~97차 정착, 불변)
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
- **VSCode 사용자 직접 캡처 (다중 이미지) - CC raw 압축 우회의 빠르고 안전한 패턴 (97차 신규)**
- **검수자 bash sed 활용 - r2/r3 작성 시 기존 .py에서 1~3개 매핑 수정으로 변경분 최소화 (97차 신규)**
- **CC 자율 sed 실행 차단 - 검수자 미동의 시 즉시 No (97차 신규)**
- **placeholder 매핑 = en_value == ko_value 패턴 - 실제 교체 없이 검증만 통과 (97차 신규)**

# 98차 운영 추가 요청 (사용자 명시, 97차 유지)
- **매 명령마다 차수 표기 필수** (예: "98차 t1 명령")
- 검수자 설명 짧게, 핵심만
- 검수자 명령으로 CC 직접 수정 우선 (사용자 직접 수정 회피)
- t 프리픽스 유지
- 작업 여력 있는 한 추가 작업 최대 진행, 부분 종결 시에도 추가 작업 가능
- **엔터프라이즈급 작업 원칙 (정확성/안전성 최우선, 검증 단계 생략 금지)**

# 97차 누적 작업 상세
| Commit | 영역 | 키 수 | 비고 |
|--------|------|------|------|
| a9d4255 | pages | 307 | r1→r2→r3 (3회 반복). r1 3건 FAILED (free_s2i1→s2i2, ent_desc 영문값, ctaHint 이모지) → r2 3건 수정 (단 ent_desc 잘못 수정) → r3 ent_desc 복구 (Auto Reports. 복수형). 48 industry terms kept (SKU/ROI/CPC 등) |
| 0470ae5 | nav | 16 | r1→r2 (2회 반복). 미번역 61개 중 16개 한국어 번역 (nav 고유 영역 L4934~/L9008~), 45개 영문 유지 + tabSchemas 3개 제거 (이미 한국어 처리됨, r2 보강). 42 industry terms kept |
| e141d9d | dash | 16 | r1→r2 (2회 반복). 미번역 219개 중 16개 한국어 번역 (couponIssued/statusSelling/viewProductList/costPriceMargin 등), 203개 영문 유지 + 자동 해시 placeholder (sskd6g/ti6jzc 등). r1 FAILED 2건 (pq41lt/a14086 숫자-알파벳 혼동) → r2 수정 |
| **합계** | **3 영역** | **339키** | **3 commits, push 미수행** |

# 97차 신규 .py 파일 목록 (D:\project\GeniegoROI\ 루트)
- session97_pages_extract.py (pages 영역 추출 + 미번역 리스트)
- session97_pages_translate_v2.py (r1 - 영문값 일부 부정확, 3 FAILED)
- session97_pages_translate_v2_r2.py (r2 - 3건 수정, ent_desc 잘못 수정)
- session97_pages_translate_v2_r3.py (r3 - ent_desc 복구, 307키 성공 ★)
- session97_nav_extract.py (nav 영역 추출 - 동일 구조 재사용)
- session97_nav_translate_v2.py (r1 - tabSchemas 3건 FAILED, 이미 한국어)
- session97_nav_translate_v2_r2.py (r2 - tabSchemas 3개 제거, 16키 성공 ★)
- session97_dash_extract.py (dash 영역 추출)
- session97_dash_translate_v2.py (r1 - 2건 FAILED, 숫자-알파벳 혼동)
- session97_dash_translate_v2_r2.py (r2 - pq41lt/a14086 수정, 16키 성공 ★)

# 97차 신규 결과 파일 (참고용)
- session97_pages_raw.txt (pages 전체 영역 raw)
- session97_pages_analysis.txt (pages 키-값 분석)
- session97_pages_untranslated_list.txt (pages 미번역 355개)
- session97_pages_v2_result.txt (r1 FAILED 3개)
- session97_pages_v2_r2_result.txt (r2 FAILED 1개 - ent_desc)
- session97_pages_v2_r3_result.txt (r3 307키 성공)
- session97_nav_raw.txt (nav raw)
- session97_nav_analysis.txt (nav 분석)
- session97_nav_untranslated_list.txt (nav 미번역 61개)
- session97_nav_v2_result.txt (r1 FAILED 3개)
- session97_nav_v2_r2_result.txt (r2 16키 성공)
- session97_dash_raw.txt (dash raw)
- session97_dash_analysis.txt (dash 분석)
- session97_dash_untranslated_list.txt (dash 미번역 219개)
- session97_dash_v2_result.txt (r1 FAILED 2개)
- session97_dash_v2_r2_result.txt (r2 16키 성공)

자세한 97차 인계 사항은 위 표 및 session96_candidates_audit.txt를 raw로 확인 부탁드립니다 (D:\project\GeniegoROI\session96_candidates_audit.txt, master HEAD e141d9d 이후 98차 인계 commit에 포함).

# 97차 누적 통계 (이전 차수 대비)
- 91차 364키 / 92차 356키 / 93차 173키 / 94차 253키 / 95차 148키 / 96차 120키 / **97차 339키**
- 97차는 96차 candidates_audit 도입 효과로 pages 단일 영역 307키 + nav/dash 16+16 추가하여 339키 달성 (96차 120키 대비 +183%)
- 단, dash 219개 매핑 중 실제 번역은 16개 (placeholder 자동 해시 키 다수)
- 다음 차수 (98차)는 banner/marketing/pnl/commerce 등 소규모 영역 일괄 작업 권장 (각 10~15키 추정, audit 후 결정)

98차 시작 확인. 검수자 페어 진행 모드 인지. Claude Code 명령 t1번 결과 raw 수신 대기.
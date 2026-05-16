GeniegoROI 프로젝트 101차 세션 시작합니다. 외부 검수자 역할 부탁드립니다.

# 101차 핵심
- 100차 종결: 1 commit 완료 (b38580d markovRemoval 7 langs sync + double quote 통일)
- master HEAD: b38580d (또는 101차 인계 commit)
- **push 완료** (100차 종결 시점, f556b05..b38580d origin/master 반영)
- 100차 결과: markovRemoval 7건 sync 완료 + G안 audit 결함 규명 + grep 정확 검증 (106건 진짜 누락 확정)

# 101차 첫 작업 (확정)
**G안 다국어 동기화 계속 - reportBuilder section 부모 path 재탐색**
- 100차 발견: sectionPnl/kpiNetProfit/pnlNetProfit는 단순 reportBuilder section 안 아님
- 100차 reportBuilder section open 발견: en.js L15077 (indent=2) + L21210 (indent=12) 등 다중
- 100차 sectionPnl 위치: en.js L14347 sp=4 → reportBuilder 외부의 다른 section
- 101차 1순위: en.js sectionPnl 정확한 부모 section path 추적 → 5개 누락 언어 동일 path 매칭 → 15건 sync

# 101차 첫 명령 (raw 검증)
- t1: t git -C "D:\project\GeniegoROI" log --oneline -10
- t2: t git -C "D:\project\GeniegoROI" status --short --branch
- t3: t powershell -Command "Get-Content 'D:\project\GeniegoROI\session100_reportbuilder_analysis.txt' -Encoding UTF8 | Select-Object -First 60"

기대값: HEAD=b38580d (또는 101차 인계 commit), working tree clean (untracked만), ↑0↓0 (push 완료)

# 100차 누적 작업 상세

| Commit | 영역 | 작업 | 비고 |
|--------|------|------|------|
| b38580d | i18n 7lang | markovRemoval sync + double quote 통일 | 7 files, 7 insertions(+), 0 deletions. de/id/ja/th/vi/zh-TW/zh 7개 언어. en.js 원본 '🔗 Markov Chain — Removal Effect' 동일. ascoreTitle 형제 anchor. node --check 7/7 PASS. style fix (single→double quote) 포함 |

# 100차 신규 .py 파일 목록 (D:\project\GeniegoROI\ 루트)

**Audit / 분석**:
- session100_phase4_audit_v3.py (v3 작성, cp949 콘솔 충돌로 결과 미저장)
- session100_phase4_audit_v3_1.py (v3.1 - 콘솔 print() 제거, RESULT_PATH 저장)
- session100_en_ko_dashboard_raw.py (en.js L4880~4925 + ko.js L10115~10160 raw 캡처)
- session100_en_structure_audit.py (v1 - f-string SyntaxError)
- session100_en_structure_audit_v2.py (v2 - f-string 회피, lone_comma 2건 발견 but 통계 4 불일치)
- session100_en_structure_audit_v3.py (v3 - strip 기반 전수 탐지, 4건 발견)
- session100_en_lone_comma_fix.py (4건 일괄 수정 → node --check FAIL → 자동 복원 X, 결과 .txt 저장)
- session100_en_restore.py (백업 복원 + node --check PASS 확인 - 원본 정상)
- session100_grep_verify.py (단순 grep 정확 검증, 106건 누락 확정)
- session100_sync_preanalysis.py (sync task 22건 사전 분석)
- session100_markov_sync_precheck.py (markovRemoval 7건 사전 검증)
- session100_markov_sync.py (markovRemoval 7건 실제 sync)
- session100_markov_style_fix.py (single→double quote 스타일 통일)
- session100_reportbuilder_analysis.py (reportBuilder section 분석 - 101차 인계)

# 100차 신규 결과 파일 (참고용)
- session100_phase4_audit_v3.txt (audit v3.1 결과 - 187건 missing 보고, but 파서 결함 잔존)
- session100_en_ko_dashboard_raw.txt (en.js dashboard 영역 raw + ko.js raw)
- session100_en_structure_audit.txt (v3 결과 - 4건 lone_comma)
- session100_en_lone_comma_fix_result.txt (4건 수정 + node check FAIL 사후 분석)
- session100_en_restore_result.txt (복원 완료 + node check PASS)
- session100_grep_verify_result.txt (단순 grep - 106건 진짜 누락 확정)
- session100_sync_preanalysis.txt (sync task 22건)
- session100_markov_sync_precheck.txt (7건 사전 검증)
- session100_markov_sync_result.txt (7건 sync 완료)
- session100_markov_style_fix_result.txt (스타일 통일 완료)
- session100_reportbuilder_analysis.txt (reportBuilder 분석 - 101차 인계 핵심)
- en.js 백업: en.js.bak_session100_lone_comma_<TS> (수정 실패 백업)
              en.js.incident_lone_comma_failed (사고 파일 보존)
- 7 locale 백업: <lang>.js.bak_session100_markov_<TS> (markov sync 백업)
                  <lang>.js.bak_session100_style_<TS> (style fix 백업)

# 100차 핵심 발견 (101차 적용 필수)

1. **audit 파서 결함 확정** - section path 추적 로직 (v2/v3/v3.1 모두) 결함. 단순 grep이 더 정확. **101차 audit 작성 시 정규식 패턴이 아닌 단순 키 검색 + 사후 section path 확정 방식 권장**
2. **en.js lone_comma 결함이 아니라 정상 객체 분리자** - L4013/L4892/L21856/L22494 4곳 모두 정상 JS 구문 (node --check PASS 검증). **101차에서 단독 콤마 발견 시 즉시 결함으로 단정 금지**
3. **단순 grep 표준 검증** - 99차 audit v2/100차 audit v3.1 모두 잘못된 결과 (0/280 vs 187/252) 출력. 단순 키 검색이 가장 신뢰도 높음. **101차 모든 다국어 sync 작업 전 grep 우선 검증**
4. **node --check 검증 표준** - 모든 .js 파일 수정 후 node --check 필수. 4곳 lone_comma 수정 시 syntax error 즉시 감지 → 자동 복원 패턴 정착
5. **반복 sync 키 부모 section 가정 위험** - sectionPnl/kpiNetProfit/pnlNetProfit를 reportBuilder section으로 가정한 100차 v3.1 결함. 실제로는 다른 section. **101차 작업 전 en.js에서 키의 정확한 부모 section path 추적 필수**
6. **double quote 일관성** - en.js는 double quote 사용. 모든 sync 작업은 동일 형식 (markov sync v1은 single quote 사용 후 v2에서 통일). **101차 sync .py 작성 시 처음부터 double quote 사용**
7. **백업 + 자동 복원 패턴** - bak_<task>_<TS> 표준 + 사후 검증 실패 시 자동 복원 (markov sync 적용 성공). **101차 모든 수정 작업에 적용 필수**
8. **CC 자율 .py 추측 누적 차단** - session100_reportbuilder_sync.py 등 존재하지 않는 .py 자율 생성. **101차에서도 t 프리픽스 덮어쓰기 패턴 유지**
9. **VSCode 사용자 직접 캡처 패턴 효과** - CC raw 압축 우회. 100차 다수 검증 단계에서 활용. **101차 핵심 검증 단계마다 사용자 직접 캡처 권장**

# 101차 진행 순서 (검수자 추천)

**1순위 (101차 첫 작업, 확정)**: reportBuilder + sectionPnl 부모 section path 재탐색
- session101_section_pathfinder.py 작성
- en.js에서 sectionPnl 정확한 부모 section path 추적 (L14347 sp=4의 부모 = ? sp=2 sp=0)
- 5개 누락 언어 (de/id/th/vi/zh-TW) 동일 section path 존재 확인
- 존재 시: anchor 결정 → sync .py 작성 → 15건 sync
- 미존재 시: section 자체 추가 필요 → 사용자 결정

**2순위**: 101차 1순위 결과 기반 작업
- sync 가능 시: 15건 sync + node --check 5파일 + commit
- sync 불가 시: comingSoon* 4키 / budgetAllocated/budgetSpent 작업 (en.js 원본 부재 = 사용자 결정 필요)

**3순위**: 잔여 영역 작업 (101차 1~2순위 완료 후)
- ascoreTitle MULTIPLE 3건 분석 (사전분석 STEP 1 보류 사항)
- graphScore 4키 / super 8키 / marketingIntel 10키 (잔여 미작업)

**4순위**: 101차 종결 + push + NEXT_SESSION 인계

**향후 차수 (102차 이후 추천)**:
- comingSoon* / budgetAllocated/budgetSpent 영어 카피라이팅 결정 후 sync
- workspace 브랜드 정책 결정 (Starter/Growth/Pro/Enterprise)
- CRLF 환경 정리
- D안 ESLint / E안 CSV Injection (보안/품질)
- F안 Connectors.jsx (5일 추정)

# 검수자 운영 원칙 (70~100차 정착, 불변)
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
- find_section_by_hint - 동일 이름 섹션 중복 시 라인 hint 범위 매칭 (99차 신규)
- em dash + 이모지 unicode escape - .py 인코딩 사고 차단 (99차 신규)
- FAILED 시 codepoint 디버깅 출력 - U+XXXX 단위 차이 즉시 식별 (99차 신규)
- 검수자 .py 경로 os.path.exists() + sys.exit(1) 표준화 (99차 신규)
- 이모지 직접 식별 위험 - codepoint hex 검증 필수 (99차 신규)
- dashboard 인접 라인 회귀 검증 - 캡처 시 작업 키 외 인접 5~10라인도 확인 (99차 신규)
- 사용자 결정 영문 유지 키 재거론 차단 - CC 반복 거론 차단 (99차 신규)
- **단순 grep 우선 - section path 파서 결함 회피 (100차 신규)**
- **node --check 표준 검증 - .js 수정 후 필수 (100차 신규)**
- **백업 + 자동 복원 패턴 - 사후 검증 실패 시 즉시 백업 복원 (100차 신규)**
- **double quote 일관성 - en.js 따옴표 스타일 사전 확인 후 sync (100차 신규)**
- **lone_comma 결함 단정 금지 - JS 정상 객체 분리자 가능 (100차 신규)**
- **반복 sync 키 부모 section 가정 위험 - en.js에서 정확한 path 추적 후 작업 (100차 신규)**

# 101차 운영 추가 요청 (사용자 명시, 100차 유지)
- **매 명령마다 차수 표기 필수** (예: "101차 t1 명령")
- 검수자 설명 짧게, 핵심만
- 검수자 명령으로 CC 직접 수정 우선 (사용자 직접 수정 회피)
- t 프리픽스 유지
- 작업 여력 있는 한 추가 작업 최대 진행, 부분 종결 시에도 추가 작업 가능
- **엔터프라이즈급 작업 원칙 (정확성/안전성 최우선, 검증 단계 생략 금지)**
- **CC 자율 명령 생성 시 즉시 차단 (100차 패턴 누적)**
- **검수자 .py 파일 작성 → 사용자 outputs 다운로드 → D:\project\GeniegoROI\ 루트 저장 → t 명령 실행 패턴**
- **CC 자율 명령 차단은 t 프리픽스 덮어쓰기로 무력화, 에너지 낭비 회피 (99차 사용자 명시)**

# 100차 누적 통계 (이전 차수 대비)
- 91차 364키 / 92차 356키 / 93차 173키 / 94차 253키 / 95차 148키 / 96차 120키 / 97차 339키 / 98차 56키 + 1typo / 99차 20키 / **100차 7키 sync (14언어 중 7언어 markovRemoval) + 1 commit**
- 100차는 ko.js 추가 작업 0건이지만, **G안 다국어 동기화 작업 첫 성공 commit** (b38580d) - 신규 영역 개척
- 100차 핵심 성과: audit 파서 결함 규명 + 단순 grep 정확 검증 표준 정착 + node --check 검증 패턴 정착 + 백업/자동 복원 패턴 정착
- 다음 차수 (101차): reportBuilder + sectionPnl 부모 section 정확 path 추적 후 15건 추가 sync 시도

자세한 100차 인계 사항은 위 표 및 결과 파일들을 raw로 확인 부탁드립니다 (D:\project\GeniegoROI\session100_*.txt, master HEAD b38580d 이후 101차 인계 commit에 포함).

101차 시작 확인. 검수자 페어 진행 모드 인지. Claude Code 명령 t1번 결과 raw 수신 대기.

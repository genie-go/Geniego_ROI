# GeniegoROI PM 작업 인계서 — 2026-05-18 세션 종료 / 다음 세션 시작점

## 0. 이 문서의 위치와 원칙
- 이 문서 = **PM 작업 전용 인계서**. i18n 작업 인계서(NEXT_SESSION.md)와 **별개**. 둘 다 유지.
- PM 작업 = PM 분석 보고서(PM_ANALYSIS_REPORT.md / PM_PAGE_ANALYSIS.md, 2026-05-01 작성, cp949 깨짐이나 판독가능) 기반 버그수정·기능완성.
- **핵심 운영규칙 (i18n 인계서와 동일 계승)**:
  1. **raw 우선 절대원칙**: PM 문서 표기 ≠ 실제 코드. 모든 항목은 수정 전 raw 실측으로 현 상태 재판정. (이번 세션 N-15 패턴 3회 입증 — 아래 5절)
  2. 페어 모드: 검수자가 명령/도구 산출 → 사용자가 CC에 `t` 접두 한 줄 relay → "경로 우회 방지" Yes(단순 한 줄·읽기전용/단일치환). 임베디드식·복합 파이프면 Esc·분할.
  3. .py 진단/수정 도구는 검수자가 산출물로 작성 → 사용자가 `D:\project\GeniegoROI` 루트 1회 저장 → CC가 단일 라인 실행. 컨테이너 초기화로 .py는 매 세션 재저장. t_*.txt raw 이력은 루트 보존.
  4. 파괴 편집 도구: 백업(.bak_*) + 다중 동시 AND 재검증 + self_test(합성검증) + 실패 시 ROLLBACK 구조 필수 (i18n autodel 구조 계승).
  5. JSX 검증: `node --check` 불가. package.json scripts = `build: vite build` 단 하나(lint 없음). vite build가 유일 문법검증이나 런타임 ReferenceError·Hook 위반은 못 잡음 → **도구의 정적 재검증이 1차 안전망, build가 2차**.
  6. 의사결정 분기 시 검수자 추천 1개 + 근거 명시. 사용자 "검수자 추천대로"/"1" = 즉시 진행. 부분종결은 인계서 작성 직전 1회.

## 1. 이번 세션(2026-05-18) 완료 사항

### PM Phase 1 — 종결 (commit a6cc2d8, vite build green 21.5s)
- **항목1 OrderHub `lang` 버그 (PM: 긴급)**: raw 실측 → **이미 수정됨**. `LiveIngestBar`(OrderHub.jsx L136) 본문 L137 `const { t, lang } = useI18n();` 존재. PM 표기 156 → 실제 152(파일 916→1059줄로 증가). no-op.
- **항목2 CatalogSync LANG_LOCALE_MAP (PM: "956-961 중복 제거")**: PM 진단 **오류**. raw 실측 결과 선언은 L959 1곳뿐(중복 아님), 그게 `handleImportExcel`(L906) catch 블록 지역변수라 5개 사용처(L31 sanitize / L776 CatalogTab / L1420 SchedulePanel / L1501·L1603 SyncRunTab)에서 `LANG_LOCALE_MAP` **미정의**. 추가로 그 사용처들에서 `lang`도 미정의(소속 함수에 useI18n 없음). 진짜 원인 = 중복이 아니라 "지역스코프 갇힌 선언 + 타 위치 미정의 참조 + lang 미정의".
  - **수정 (7편집, CatalogSync.jsx)**: E1 L5 import 직후 모듈최상위 `LANG_LOCALE_MAP` 승격 / E2 L958~963 catch 내 지역선언 제거 / E3 `useCatalogSecurity`(L18) 훅에 `const { lang } = useI18n();` 추가(커스텀훅 최상위라 Hook규칙 OK) / E4 L735 `const { t }`→`const { t, lang }` (CatalogTab) / E5 SchedulePanel(L1404)에 `const { lang } = useI18n();` 추가 / E6 L1476 `const { t }`→`const { t, lang }` (SyncRunTab) / E7 L39 sanitize useCallback 의존성 `[addAlert]`→`[addAlert, lang]`.
  - 도구: `session_pmfix_apply_catalogsync.py` (다중AND: a_moduletop_decl/b_catch_removed/c_lang_visible_4/d_dep_lang/e_balance_same/f_linedelta_ok, self_test, ROLLBACK). dry PASS → apply PASS. backup `CatalogSync.jsx.bak_pmfix_langlocale_20260518_180812`.
- **부수 해소 OrderHub apiClient build blocker**: build 실패 원인이 CatalogSync 아님 raw로 규명 — `OrderHub.jsx:9 import apiClient from '../services/apiClient'` (default import)인데 apiClient.js는 export default 0, named 11개(getJson/postJson 등). OrderHub 사용=`apiClient.postJson` 1개(L112/115, named L35 존재). 수정: L9 `import apiClient from`→`import * as apiClient from` (namespace import, 사용부 무변경). 도구 `session_pmfix_apply_orderhub.py` (단일치환 a~f AND, self_test, ROLLBACK). backup `OrderHub.jsx.bak_pmfix_apiclientimport_20260518_181650`.
- **commit a6cc2d8**: `fix(PM Phase1): hoist LANG_LOCALE_MAP ... namespace-import apiClient ...` — 2 files changed, 14 insertions(+), 10 deletions(-). vite build `✓ built in 21.53s` (1108 modules; Circular chunk/large chunk 경고는 무해 백로그, PowerShell RemoteException은 stderr-경고 아티팩트 아닌 실패).

### PM Phase 2 — Export 항목 완료 확인 (수정 없음, raw 판정만)
- PM "OrderHub CSV/Excel Export 미구현, CatalogSync 참고해 구현"은 **오기록**. raw 실측 결과 OrderHub Export **이미 완전 구현·배선**:
  - `downloadCSV` 유틸 L12~24, `handleExportCSV` L392, `handleExportExcel` L411(`await import('xlsx')`→json_to_sheet→writeFile L419~429), `buildExportRow` L370, **OWASP CSV Injection 가드 L342(`=+-@`)**, UI 버튼 L473/L495 배선(aria/title/exporting/empty 가드), i18n 키(orderHub.excelExport/csvExport/exporting) 완비.
  - **OrderHub Export가 CatalogSync보다 우수**(CatalogSync handleExportCSV L860은 CSV Injection 가드 없음). PM 지시대로 이식했으면 보안 퇴행이었음. → 수정 안 함이 정답.

## 2. 다음 세션 시작점 (1순위 = 여기서 시작)

### PM Phase 2 API 연동 — 진짜 미완 (이번 세션 raw로 확정, PM 표기 정확한 첫 사례)
raw 실측 결과 (도구 `session_pm2_api_diag.py`):
- **GlobalDataContext.jsx(frontend/src/context/GlobalDataContext.jsx, 1744줄)는 orders/claimHistory/settlement를 Mock으로만 채움**:
  - `INIT_ORDERS = loadDemoState('orders', DEMO_ORDERS)` L103, `INIT_SETTLEMENT` L109, `claimHistory = useState([])` L202.
  - `/api/orders` `/api/claims` `/api/settlements` 호출 **hits=0** (GDC·OrderHub 양쪽).
  - GDC 유일 실 API = `/api/channel-sync/inventory` L286/349 (orders 무관).
  - `_isDemo` 분기(L33: roidemo/demo 호스트 or VITE_DEMO_MODE), `loadDemoState`(L53), `_saveDemoIfMounted` localStorage 영속(L262/265).
- OrderHub apiClient 사용 = CRM 2건뿐(L112/115 `/api/crm/customers`).
- **apiClient.js 범용 `getJson(path)` L7 존재** → /api/orders 호출에 신규 엔드포인트 함수 추가 불요, 호출부만 작성하면 됨.

### ★ 이 작업의 선결 조건 (코드 밖 정보 — 없으면 안전 구현 불가)
raw로 끝까지 규명한 결론: API 연동은 실재 작업이나 다음 정보 없이는 추측 구현 금지(런타임 붕괴·미검증 커밋 위험, 운영규칙 1·5):
1. **백엔드 계약**: `/api/orders` `/api/claims` `/api/settlements` 엔드포인트 실제 존재 여부 + 응답 스키마. OrderHub는 `order.buyer`·`order.channel`·`order.total`·`claimHistory[].type`·`settlement[].period`·`settlement[].channel` 등 구체 필드 의존(raw 확인). 응답이 배열직접/`{data:[]}`/`{orders:[]}` 중 무엇인지 불명.
2. **데모/실서비스 분기 정책**: `_isDemo`면 Mock 유지, 非demo면 API fetch. 데모 모드 깨면 안 됨 → 단순 치환 아니라 분기 + 로딩/에러/낙관적 업데이트 설계.
3. **검증 환경**: 백엔드 미가동 시 vite build만으론 동작 보증 불가. 백엔드 또는 모킹 환경 필요.
4. apiClient.js `base` = `VITE_API_BASE || "http://localhost:8000"`. 인증 필요 시 `getJsonAuth`(L54)/`requestJsonAuth`(L132) 중 무엇인지도 백엔드 정책 의존.

### 다음 세션 진행 방법 (분기)
- **백엔드 명세 제공되면** → 그 계약 기반 연동 구현: GDC에 `_isDemo ? loadDemoState : await getJson('/api/orders')` 분기 + 로딩/에러 상태 + setOrders/setClaimHistory/setSettlement 배선. 백업·다중AND·ROLLBACK 도구 → build → (가능시 모킹 검증) → commit.
- **명세 없이 진행 불가면** → PM에 백엔드 API 명세 요청. 그때까지 Phase 2 API 연동 보류.

## 3. PM 보고서 신뢰도 (N-15 패턴 — 중요)
PM_ANALYSIS_REPORT.md / PM_PAGE_ANALYSIS.md(2026-05-01)는 작성 후 코드가 다수 변경되어 **표기가 실제와 3회 어긋남**:
- Phase1 OrderHub `lang` 버그: 이미 수정됨 (PM "긴급" → no-op)
- Phase1 CatalogSync: "중복 제거" 오진 → 실제는 미정의 5경로
- Phase2 Export: "미구현" 오기록 → 이미 완성(+OrderHub가 더 우수)
→ **PM 문서의 모든 항목은 착수 전 raw 실측 필수.** PM 표기를 그대로 구현하면 (a) 멀쩡한 코드 덮어쓰기 (b) 보안 퇴행 (c) 없는 버그 수정 위험. **PM 보고서 전면 raw 재검토 + PM 재협의 권고.**

## 4. PM 보고서상 남은 작업 (raw 미검증 — 착수 시 전부 raw 실측 선행)
PM 우선순위 순. **각 항목 PM 표기 신뢰 금지, raw 재판정부터.**
- Phase 2 잔여: API 연동(위 2절, 선결조건 필요) → 주문상태 변경 API → 클레임 처리 워크플로
- Phase 3: 실시간 알림(WebSocket) / 대시보드 차트 / 성능 최적화
- PM 문서2 전체(108페이지): 광고 플랫폼 커넥터 UI(Connectors.jsx 70%) / 송장 API(WmsManager) / AI 인사이트 엔진(AIInsights) / 광고성과 분석 페이지(AdvertisingPerformance 60%) — 전부 PM 추정치이며 raw 미검증, N-15 고려.

## 5. 자산·git 상태
- **수정 적용 백업**: `CatalogSync.jsx.bak_pmfix_langlocale_20260518_180812`, `OrderHub.jsx.bak_pmfix_apiclientimport_20260518_181650` (루트 보존, ?? 미추적 정상).
- **이번 세션 .py 도구** (검수자 산출 → 사용자 루트 저장, 컨테이너 초기화로 다음 세션 재저장 필요):
  - 진단(읽기전용): session_pmbug_diag / _scope / _langscope / _reactstruct / _editpoints / _apiclient_diag / _apiexports / pm2_export_diag / pm2_api_diag
  - 수정(파괴편집, 백업·AND·ROLLBACK): session_pmfix_apply_catalogsync / _apply_orderhub
- **raw 이력 txt**: t_pmbug / t_pmscope / t_pmlangscope / t_pmreact / t_pmedit / t_pmfix_dry / t_pmfix_apply / t_apiclient / t_apiexports / t_ohfix_dry / t_ohfix_apply / t_pmfix_commit / t_pm2export / t_pm2api (루트 보존).
- **git**: HEAD = a6cc2d8 (PM Phase1 fix, 2 files, build green). 이전 i18n HEAD 7ac7944 위에 누적. origin 대비 push 보류 중(i18n 117~119 + PM, 묶음 push 미실행 — 검수자 방침 계속). 추적변경 = 수정된 2파일은 커밋 완료. 신규 .py/.txt/.bak = ?? 미추적 정상(i18n 방침과 동일, 커밋 안 함).
- **i18n 인계서 NEXT_SESSION.md는 무관·불변**. i18n 120차는 그 문서 5절(0순위 push 확인 → 1순위 zh dash 동명블록)대로 별도 진행.

## 6. 핵심 교훈 (다음 세션 필독)
- **P-1**: PM 문서(2026-05-01) 표기 3회 어긋남. 모든 PM 항목 raw 실측 선행 필수. "PM이 시켰으니" 그대로 구현 금지 — 멀쩡/우수 코드 덮어쓰기·보안 퇴행 위험.
- **P-2**: build 실패 ≠ 우리 수정 탓. raw로 진짜 원인 파일·라인 규명(이번: CatalogSync 정상, OrderHub:9가 blocker였음). 섣부른 ROLLBACK 금지.
- **P-3**: JSX는 node --check 불가, vite build만(런타임·Hook 미검출). 도구 정적 재검증이 1차 안전망. build green도 런타임 보증 아님 — 특히 API 연동은 백엔드 없이 build PASS여도 동작 미보증.
- **P-4**: Hook 규칙 — useI18n 등은 컴포넌트/커스텀훅 최상위만 합법. useCallback/일반함수/.map 콜백 내 호출 금지. 사용처 React 구조(컴포넌트/훅/콜백/JSX식) raw 확인 후 해법 분기.
- **P-5**: API 연동은 i18n/버그수정과 다른 작업 — 백엔드 계약·데모분기 정책이라는 코드 밖 정보 의존. raw만으로 정답 확정 안 됨. 추측 구현은 미검증 커밋 = 원칙 위반.
- **P-6**: 부분종결 = 인계서 작성 직전 1회(이 문서). 안전 즉시처리(Phase1 버그·blocker) 소진·커밋 후 코드 밖 의존성으로 블록 → 정당한 종결 지점.

## 7. 다음 세션 첫 동작
1. 이 문서 + NEXT_SESSION.md(i18n) 둘 다 읽기.
2. PM 작업 이어가려면: 2절 "Phase 2 API 연동" 선결조건(백엔드 명세) 확보 여부 확인. 있으면 계약 기반 구현, 없으면 PM에 명세 요청.
3. .py 도구는 컨테이너 초기화됐으니 필요분 재저장(검수자가 재산출).
4. PM 표기 신뢰 금지 — 무엇을 하든 raw 실측부터(P-1).
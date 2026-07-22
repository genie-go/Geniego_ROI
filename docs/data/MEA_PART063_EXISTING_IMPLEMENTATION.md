# MEA Part 063 — GT① EXISTING IMPLEMENTATION (실재 구현 전수조사)

> 289차 후속(2026-07-22) · **코드 변경 0 · NOT_CERTIFIED · 배포 없음**
> 조사 범위: `backend/src`·`backend/bin`·`backend/data`·`tools`·`frontend/src`
> 제외: `*.json`(단일라인 덤프)·`**/i18n/**`(로케일 본문)·`**/locales_backup/**`·`**/_archived/**`
> 방법: **단어경계 `\b`(rg -w) + 광의 히트 파일 단위 전수 분류**. 본 문서의 file:line은 **전량 실측**이며 가설 인용 없음.

---

## 0. ★★핵심 판정 요약 — "표면은 완비, 실체는 전무"

**PARTIAL-surface-only.** 062(=개념 자체가 없음)와도 다르고, 058~061(=엔진은 있는데 Registry가 없음)과도 다른 **제3의 형태**다.

> **ESG는 "부실"한 것이 아니라, "판매 가능한 표면(메뉴·탭·유료 게이트·15개국 라벨·가이드·온보딩·챗봇 지식)이 전부 갖춰져 있는데 그 뒤에 데이터·산출 엔진·백엔드가 하나도 없다".**

- **프론트 표면 = 8종 실재**(§1)
- **백엔드 = 전량 0**(§2·부재증명)
- **ESGTab 자체 = API 호출·state·useEffect 전무한 정적 껍데기**, 모든 데이터 셀이 `t('performance.noData')` 하드코딩(§1.1)

---

## 1. 실재 자산 (정직 인정 · 평가절하 금지)

### 1.1 ★`ESGTab` — 렌더는 되지만 데이터 경로가 없다

`frontend/src/pages/PerformanceHub.jsx`

| 위치 | 내용 |
|---|---|
| `:1031` | 주석 `/* ═══ ESG Reporting Tab — Zero Mock ═══ */` |
| `:1032` | `const ESGTab = memo(function ESGTab() {` — **인자 없음(props 0)** |
| `:1034` | 주석 `// Real data comes from API — no mock data` |
| `:1038` / `:1039` | 제목 `t('performance.esgTitle')` / 부제 `t('performance.esgSub')` |
| `:1044~1046` | **E/S/G 3영역 카드** — `esgEnvironment`/`esgSocial`/`esgGovernance`, 색 `#22c55e`/`#4f8ef7`/`#a855f7` |
| **`:1050`** | ★3영역 카드 본문 = **`t('performance.noData')` 고정** |
| `:1057~1060` | **지표 4종 카드** — `esgCarbon`(탄소 배출량)·`esgEnergy`(에너지 사용)·`esgPackaging`(포장재 사용량)·`esgRecycleRate`(재활용률) |
| **`:1064`** | ★지표 4종 값 = **`t('performance.noData')` 고정** |
| `:1214` | 탭 정의 `{ id: "esg", label: t('performance.tabEsg'), desc: t('performance.descEsg') }` |
| `:1298` | 렌더 배선 `{tab === "esg" && <ESGTab />}` |

★**실측 확증**: `:1031~1070` 구간에 **`useState`·`useEffect`·`fetch`·`apiClient`·`axios`·props 인자가 단 하나도 없다**(grep 실측). 즉 **데이터가 채워질 코드 경로가 존재하지 않는다.**

> ★**정직 표기 자산으로 인정**: 이 탭은 **가짜 숫자를 지어내지 않는다.** 값이 없음을 `noData`로 표시한다. 288차 "가짜 녹색 systemic"(하드실패를 `ok=>true`로 위장)과는 **성격이 정반대**이며, 이 정직함은 **후퇴 금지 자산**이다. 문제는 정직함 자체가 아니라 **§1.3~1.5의 약속과 불일치**한다는 점이다.

### 1.2 메뉴·플랜 게이트 실배선

| 파일:라인 | 내용 |
|---|---|
| `frontend/src/layout/sidebarMenuLabels.js:332` | `{ id: 'esg', label: 'ESG' }` — `/performance` 서브탭으로 **정식 등록** |
| **`frontend/src/auth/tabPlanPolicy.js:15`** | **`'performance::esg': 'pro'`** — ★**Pro 플랜 이상 유료 게이트** |
| `frontend/src/auth/tabPlanPolicy.js:11` | 주석 "…코호트·**ESG는 상위 분석**(핵심 성과/정산/가이드는 전 플랜)" |

★`tabPlanPolicy.js:1~6` 헤더에 따르면 이 파일은 **"페이지 내부 탭의 구독플랜별 노출 정책 중앙 SSOT"**이며 **화이트리스트 방식**(미등록 탭=노출)이다. 즉 ESG 탭은 **의도적으로 등록된 상위 티어 기능**이다.

### 1.3 사용자에게 한 약속 (가이드)

`frontend/src/pages/perfGuideI18n.js`

| 위치 | 내용 |
|---|---|
| `:3` | 키 스킴 주석 `guideTab{Perf,Settle,Creator,Sku,Cohort,Esg,Guide}Desc` |
| **`:25`** | ko — **`['ESG 리포트','환경·사회·지배구조 지표를 추적·리포트합니다.']`** |
| `:27` | ko 기능 열거에 `'환경·사회·지배구조(ESG) 지표'` 포함 |
| **`:42`** | en — **`['ESG Report','Track and report environmental, social and governance metrics.']`** |
| `:34` | en 개요 — "…cohorts and **ESG** in one place" |
| `:110` | de — `['ESG-Report','Umwelt-, Sozial- und Governance-Kennzahlen verfolgen und berichten.']` |
| `:127` | th — `['รายงาน ESG', …]` |
| `:61`/`:78`/`:95` | ja/zh/zh-TW 동등 문구 |
| `PerformanceHub.jsx:1087` | 가이드 탭 참조표에 `{ icon: '🌿', tab: t('performance.tabEsg'), desc: g('guideTabEsgDesc') }` |

★**"추적·리포트합니다"는 현재형 단정**이며, §2 부재증명상 **추적도 리포트도 실재하지 않는다.**

### 1.4 온보딩 안내

`frontend/src/pages/Onboarding.jsx:31` — 재무 롤 소개:
`'P&L, 채널별 수익성, 정산 대사, ESG, 자동 보고서를 학습합니다.'`

### 1.5 챗봇 지식 등재

| 파일:라인 | 내용 |
|---|---|
| `backend/data/chatbot_feature_map.md:77` | `- 성과 허브(/performance) — Performance·Settlement·Creator Settlement·SKU Profitability·Cohort·**ESG**` |
| `tools/chatbot_feature_curated.md:77` | 동일 |

★270차 챗봇 지식 자동화 파이프라인([[reference_chatbot_knowledge_pipeline]])에 의해 **챗봇이 ESG 기능 보유를 사용자에게 답변할 수 있다.**

### 1.6 i18n 15개국 라벨 (실재)

| 파일 | 위치 | 내용 |
|---|---|---|
| `frontend/src/i18n/locales/ko.js` | `:6711` | `"tabEsg": "🌿 ESG 보고"` |
| ″ | `:6713` | `"descEsg": "환경·사회·거버넌스"` |
| ″ | **`:6905~6921`** | `esgTitle`(:6905) `esgSub`(:6907 "환경·사회·거버넌스 지표를 **모니터링합니다**") `esgCarbon`(:6915 "탄소 배출량") `esgPackaging`(:6919 "포장재 사용량") `esgRecycleRate`(:6921 "재활용률") |
| ″ | `:23346`/`:23357`/`:23486` | 별도 네임스페이스 중복 정의 `tabEsg`/`descEsg`/`esgTitle` |
| `frontend/src/i18n/locales/en.js` | `:8142` | `"esgTitle": "ESG Metrics"` |
| `frontend/src/i18n/locales/ja.js` | `:10994~11002` | `esgTitle`/`esgSub`/`esgEnvironment`/`esgSocial`/`esgGovernance`/`esgCarbon`(炭素排出)/`esgEnergy`(エネルギー使用)/`esgPackaging`/`esgRecycleRate` **9키 완비** |

★**15개국 라벨이 완비**되어 있다 — 표면 완성도가 높다는 증거이자, 실체 부재와의 낙차를 키우는 요인.

### 1.7 ★환경 축으로 "파생 가능성"만 있는 인접 자산 (★환경 데이터 아님)

아래는 **비용·운영 축**의 실재 자산이며, **배출계수(CARBON_FACTOR) 없이는 환경 축 값을 산출할 수 없다.** 현재 배출계수는 **부재**(§2).

| 자산 | file:line | 실제 성격 | 왜 탄소가 아닌가 |
|---|---|---|---|
| 배송 추적 | `backend/src/Handlers/Logistics.php:91~103` (`shipment_tracking`: `carrier`·`tracking_no`·`status`·UNIQUE `uq_ship`) | 택배사·송장번호·배송상태 | **거리·중량·운송수단(항공/육상/해상)이 없다.** Scope 3 물류 배출 산정 3대 입력 중 0개 보유 |
| 배송비 | `backend/src/Handlers/Pnl.php:210` `$shippingCost = $shipFee;` · `:219` 영업이익 차감 · `:148` `kr_fee_rule`(`shipping_standard`·`free_ship_threshold`) | **금액(₩)** | 요금은 **정률·무료배송 기준액**에서 파생(`:134`) — **물리량과 무관** |
| 국제배송 유류할증료 | `frontend/src/pages/poI18n.js:301`·`:2776` (`shipIntlNote`) | **비용 안내 문구** | fuel **surcharge=요금**이지 **연료 소비량 아님** |
| 반품 상태 | `backend/src/Handlers/ReturnsPortal.php:199` `$allowed = ['pending','inspecting','approved','rejected','refunded','restocked']` | 반품 처리 상태 6종 | ★**`disposed`·`recycled`·`donated`가 화이트리스트에 없다** |
| 재입고(자원 회수) | `ReturnsPortal.php:208`·`:211` `Wms::reflectChannelRestock(...)` (227차 P0로 물리재고 복원 실배선) | 재고 복원 | 회수 **건수**는 산출 가능하나 **재활용률의 분모/분자 정의가 없다** |
| 폐기 집계 | `backend/src/Handlers/OrderHub.php:729` `'disposed' => (int)($byStatus['disposed'] ?? 0)` | 폐기 **건수** 집계 | ★단 `ReturnsPortal:199` 화이트리스트에 `disposed` 전이가 없어 **생산자 경로 확인 필요**(본 Part 판정 밖·후속 조사 대상) |
| 창고 처분 유형 | `backend/src/Handlers/Wms.php:1096` `in_array($type, ['Outbound','ReturnsOutbound','**Disposal**'], true)` · `:1116` | **재고 출고 유형**으로서의 폐기 | 수량은 있으나 **폐기물 중량·처리방식(매립/소각/재활용)이 없다** |
| UI 처분 문구 | `frontend/src/pages/rpI18n.js:264` `"Assign location or process disposal/recycle/donate"` · `:210` `"restockRecycle": "Recycle"` | **가이드 문구/버튼 라벨** | ★백엔드 상태 화이트리스트(`ReturnsPortal:199`)에 대응 값이 **없다** → **재활용률 산출 불가** |

### 1.8 재사용해야 할 상위 Part 확정 자산 (★재판정 금지)

| 자산 | file:line | 상속 Part |
|---|---|---|
| `SecurityAudit`(`security_audit_log` `prev_hash`/`hash_chain`) | `backend/src/SecurityAudit.php:44~52` · **`verify()`:55~68** | **056·062** — 저장소 **유일** tamper-evident |
| `SystemMetrics` 관측 정본(목데이터 금지 원칙) | `backend/src/Handlers/SystemMetrics.php:15~19`·probes `:127~353` | **057** |
| `Compliance` SIEM 포워딩(RFC 5424) | `backend/src/Handlers/Compliance.php:238`·`:243` | **057** |
| `Reports` 스케줄 리포트 엔진 | `backend/src/Handlers/Reports.php:62`(`ensureTables`)·`:104`(`computeNextRun`)·`:116`(`generateKpiSummary`)·`:150`(`summaryHtml`)·`:178~235`(CRUD/preview)·`:256~262`(`compileMetricFormula`)·`:273`/`:284`(사용자정의 메트릭)·`:475`(`runNow`)·`:488`(`history`)·`:502`(`runSchedule`) / 라우트 `backend/src/routes.php:407~420` | ★**§10 ESG Reporting의 재사용 대상 1순위** |

★**`Reports`는 본 Part 최대의 재사용 자산이다.** 스케줄링(`computeNextRun`:104)·이력(`history`:488)·HTML 렌더(`summaryHtml`:150)·**사용자정의 메트릭 수식 컴파일**(`compileMetricFormula`:256~262·`metricDefSave`:284)이 이미 실재하므로, **ESG 전용 리포팅 엔진 신설은 헌법 V4(중복 엔진 금지) 위반**이다.

---

## 2. ABSENT — 부재증명 (rg -w, 실측 0)

### 2.1 형식 용어 전량 0

**ESG 코어**: `esg_metric` · `esg_report` · `esg_score` · `esg_policy` · `esg_audit` · `esg_project` · `esg_incident` · `esg_disclosure` · `esg_analytics` · `esg_compliance`
**탄소**: `carbon`(실코드) · `carbon_emission` · `carbon_factor` · `carbon_credit` · `carbon_footprint` · `carbon_offset` · `emission` · `ghg` · `greenhouse` · `co2` · `footprint` · `decarbon` · `net_zero` · `netzero`
**Scope**: `scope1` · `scope2` · `scope3` · `scope_1` · `scope_2` · `scope_3`
**에너지**: `energy`(실코드) · `energy_usage` · `energy_consumption` · `kwh` · `kilowatt` · `electricity` · `power_usage` · `renewable`
**지속가능성**: `sustainability`(실코드) · `sustainable` · `climate` · `green_logistics` · `environmental`(가이드 문구 외 0)
**규제/공시 프레임워크**: `csrd` · `tcfd` · `sasb` · `gri_standard` · `cdp_report` · `regulatory` · `regulatory_report`
**사회(S)**: `diversity` · `labor` · `ethics` · `social_impact`
**기타**: `target_achievement` · `executive_dashboard` · `scheduled_report` · `audit_trail` · `immutable_audit`

### 2.2 ★백엔드 전량 부재 (최중요)

`backend/src`·`backend/bin`·`backend/data`에서 `esg|carbon|emission|sustainab|renewable|footprint` 검색 결과 **실 코드 히트 0**:

- 히트 2건 전량 오탐 — ① `backend/data/chatbot_feature_map.md:77`(문서·§1.5) ② `backend/src/Handlers/MmmReportI18n.php:18` = **스페인어 `riesgo`(위험)**의 부분문자열(실측: `rg -o "[a-z]{0,8}esg[a-z]{0,8}"` → `riesgo` 1건)

**결론**: **ESG 핸들러 0 · ESG 테이블 0 · ESG 라우트 0 · ESG 마이그레이션 0.** `routes.php` 전량 검색에서 ESG/탄소/에너지 엔드포인트 **부재**.

### 2.3 명세 §별 부재 판정

| 명세 절 | 판정 |
|---|---|
| §3 구축 대상 10종 | **전량 ABSENT**(ESG Platform·Carbon Intelligence Engine·Sustainability Analytics·ESG Reporting Service·Energy Monitoring·Carbon Accounting Engine·ESG Governance Manager·Sustainability Dashboard·ESG Audit Service·Sustainability Advisor) |
| §5 Canonical Entity 15종 | **15종 전량 ABSENT**(★스키마 0·라벨만 존재하는 4종은 엔티티가 아니라 **UI 문자열**) |
| §6 Domain 10종 + **Enterprise ESG Registry** | **전량 ABSENT** — ★**Registry 부재 6연속**(058~063) |
| §7 Lifecycle 10단계 | **전량 ABSENT**(Data Collection~Archive 어느 단계도 코드 0) |
| §8 Carbon Intelligence 8종 | **전량 ABSENT** — ★Scope 1/2/3 **계산 체계 자체가 없다** |
| §9 Sustainability Analytics 8종 | **전량 ABSENT**(`benchmark` 38히트=광고 벤치마크·§3) |
| §10 ESG Reporting 8종 | **ABSENT** — 단 **`Reports` 엔진이 재사용 가능**(§1.8) |
| §11 Energy Intelligence 8종 | **전량 ABSENT** — ★**061 확정(Device/센서 부재)의 직접 종속**: 검침 데이터원이 없다 |
| §12 ESG Governance 8종 | **전량 ABSENT** |
| §13 Data Security 6종 | ESG 스코프로는 **ABSENT**(범용 테넌트 격리·RBAC·`SecurityAudit`는 실재하나 ESG 자산이 없어 적용 대상이 없음) |
| §14 Runtime 7종 | **전량 ABSENT** |
| §15 API 8종 | **전량 ABSENT** |
| §16 Event 8종 | **전량 ABSENT** |
| §17 AI 8종 | **전량 ABSENT** |
| §18 성능 SLA 6종 | **측정 대상 부재로 판정 불가**(★"미달"이 아니라 **"측정 기반 부재"**) |

---

## 3. ★역방향 오흡수 금지 — 동음이의 오탐 전량 배제 (실측)

| 토큰 | 히트 | 실제 정체 | 판정 |
|---|---|---|---|
| **`esg`** | 1 (backend) | **`riesgo`** — 스페인어 "위험" (`MmmReportI18n.php:18`) | ★**완전 오탐** |
| **`water`** | 5 | **water-filling 예산배분 알고리즘** — 한계ROAS(dR/ds) 균등화 (`AutoRecommend.php:589`·`:757`, `AutoMarketing.jsx:439`·`:1659`·`:1662`) | ★**완전 오탐 · 물 사용량 아님** |
| **`governance`** | 6 | **데이터 거버넌스** (`RoleViewBar.jsx:20` → `/data-trust` "데이터 신뢰·감사·품질") · 사이드바 푸터 (`Sidebar.jsx:702` "Revenue + Risk + Governance") · 나머지는 §1.3 ESG 가이드 문구 | ★**ESG의 G 아님**(데이터 거버넌스 ≠ 기업 지배구조) |
| **`benchmark`** | 38 | **광고 성과 벤치마크** (`MarketingDataHub.php` 18 · `AutoRecommend.php` 16 · `Rollup.php` 1 · `ClaudeAI.php` 1 · `AutoCampaign.php` 1 · `productPerf.js` 1) | ★**§9 Benchmark Analysis 아님** |
| **`disclosure`** | 9 | **`DataProduct.jsx:132` "Branded Disclosure"** = `branded / paid_collab × 100 %` — **UGC 브랜디드 표기율** | ★**Carbon Disclosure 아님** |
| **`offset`** | 114 | **SQL `LIMIT/OFFSET` 페이지네이션** | ★**Carbon Offset 아님** |
| **`facility`** | 2 | **`Compliance.php:238`·`:243` — RFC 5424 syslog PRI `facility`(local0=16)** | ★**사업장 시설 아님** |
| **`fuel`** | 2 | **`poI18n.js:301`·`:2776` 국제배송 유류할증료(fuel surcharge)=요금 안내** | ★**연료 소비량 아님** |
| **`packaging`** | 1 | `WmsManager.jsx:522` 반품 사유 예시 텍스트 `'Packaging damage'` | ★**포장재 사용량 아님** |
| **`recycle`/`recycling`** | 3 | `rpI18n.js:210` 버튼 라벨 · `:264`/`:812` 가이드 문구 | ★**UI 문자열 · 백엔드 상태값 부재** |
| **`waste`** | 1 | `guideContent.js:69` 마케팅 가이드 산문 | ★**폐기물 아님** |
| **`carbon`/`sustainability`/`energy`/`environmental`** | 각 5/5/3/5 (원시) | **전량 `tools/migrations/_archived/_tmp_check_*.mjs`**(15개국 로케일 단일라인 덤프) 또는 `perfGuideI18n.js` 가이드 문구 | ★**실 코드 0** |

★**신규 grep 트랩 기록**: `tools/migrations/_archived/_tmp_check_{de,en,ja,id,ko,th,vi,zh,zh-TW}.mjs` 는 **로케일 전문을 단일 라인에 담은 아카이브 덤프**로, 모든 ESG 관련 토큰에 오탐을 발생시키고 **출력 6.9MB 폭발**을 유발한다. `*.json`·`i18n/**`과 **동일하게 상시 제외**해야 한다.

---

## 4. ★부수 발견 — 실결함 후보 1건 (본 Part 판정 밖 · 수정 아님 · 후속 등재)

### FIND-063-1 · `performance::esg` = **Pro 유료 게이트인데 영구 빈 화면**

- **사실 1**: `tabPlanPolicy.js:15` — `'performance::esg': 'pro'` (Pro 이상에만 노출되는 상위 티어 탭)
- **사실 2**: `PerformanceHub.jsx:1050`·`:1064` — 모든 데이터 셀이 `t('performance.noData')` **고정 문자열**
- **사실 3**: `PerformanceHub.jsx:1031~1070` — API 호출·state·effect **전무**(실측)
- **사실 4**: 백엔드 ESG 엔드포인트 **0**(§2.2)
- **사실 5**: `perfGuideI18n.js:25`·`:42` — 가이드는 **"환경·사회·지배구조 지표를 추적·리포트합니다"**(현재형 단정), `Onboarding.jsx:31`·`chatbot_feature_map.md:77`도 기능 보유를 안내

→ **귀결**: Pro 이상 유료 고객이 **가이드·온보딩·챗봇의 안내를 보고 진입하면 항상 빈 화면**을 본다. 데이터가 채워질 코드 경로가 **구조적으로 존재하지 않으므로** 시간이 지나도 해소되지 않는다.

★**성격 규정**: 이는 **"가짜 데이터"가 아니다**(288차 가짜 녹색 systemic과 구별 — `noData`는 정직하다). **"약속과 실체의 불일치"**이며 283차 교훈 **"코드 존재 ≠ 구현 완료"**의 극단 사례다.

★**본 세션 범위 밖**(코드 변경 0). 처방 선택지는 ADR D-6에 기술.

### FIND-063-2 · `disposed`(폐기) 상태 = **생산자 부재 고아 상태값 — 영원히 0**

`disposed` 전수 검색 결과(실측 4건) **전부 소비자이며 생산자가 하나도 없다**:

| file:line | 역할 | 종류 |
|---|---|---|
| `backend/src/Handlers/OrderHub.php:729` | `'disposed' => (int)($byStatus['disposed'] ?? 0)` | **소비**(집계) |
| `frontend/src/pages/ReturnsPortal.jsx:23` | `STATUS_COLORS` 에 `disposed:'#94a…'` | **소비**(색상) |
| `frontend/src/pages/ReturnsPortal.jsx:34` | `avgDays` 상수맵 `disposed:5.0` | **소비**(표시) |
| `frontend/src/pages/ReturnsPortal.jsx:292` | `_RSTATUS=[…,'disposed',…]` | **소비**(배열 상수) |

★**생산자 부재 확증**: 상태 전이 화이트리스트 `ReturnsPortal.php:199`
`$allowed = ['pending','inspecting','approved','rejected','refunded','restocked']` — **`disposed` 없음**.
→ **어떤 반품도 `disposed` 상태가 될 수 없고**, `OrderHub.php:729` 집계는 **영구히 0**을 반환한다.

★**063 관점의 의미**: **폐기(Disposal)는 ESG 폐기물 관리의 1차 지표**인데, 그 **상태 전이 자체가 존재하지 않는다**. §1.7의 "재활용률 산출 불가"와 **같은 뿌리**다 — 처분 경로(폐기/재활용/기부)가 **UI 문구로만 존재**하고 도메인 모델에 없다.

★**본 세션 범위 밖**(코드 변경 0 · 수정 아님). 후속 실결함으로 등재.

---

## 5. 인용 무결성

본 문서의 file:line은 전량 본 세션 rg/sed 실측이며, **가설·추정 인용 0**. 062 인계서의 조사 후보(`Pnl`·`Logistics`·`SupplyChain`·`DataPlatform`·`ReportBuilder`)는 **가설로만 사용**했고, 실제 인용은 **재검증된 것만** 채택했다.
★특히 **`ReportBuilder`라는 핸들러는 존재하지 않는다**(실측: `backend/src/Handlers/`에 `Reports.php`) — 가설의 명칭 오류를 정정한다.

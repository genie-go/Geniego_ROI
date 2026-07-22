# ADR — MEA Part 063 · Enterprise Sustainability, ESG & Carbon Intelligence

> 289차 후속(2026-07-22) · **설계 결정 문서 · 코드 변경 0 · NOT_CERTIFIED · 배포 없음**
> 근거는 전량 [`MEA_PART063_EXISTING_IMPLEMENTATION.md`](../data/MEA_PART063_EXISTING_IMPLEMENTATION.md)(GT①)·[`MEA_PART063_DUPLICATE_AUDIT.md`](../data/MEA_PART063_DUPLICATE_AUDIT.md)(GT②) 실측 인용. **가설 인용 0.**
> 상속: 051~062 **재판정 금지**. 상충·중복 시 **스코프 분리해 둘 다 참으로**(060 D-2·061 D-1).

---

## D-1 (★★최대 결정) — 본 Part의 성격은 "부실"이 아니라 **"판매 표면만 존재하는 공동(空洞)"**

### 결정
GeniegoROI의 ESG는 **미완성 구현이 아니라, 구현이 시작된 적 없는 표면**이다. 이를 문서 전반의 판정 기준으로 고정한다.

### 근거 (전량 실측)
- **표면은 완비**: 사이드바 메뉴 등재(`sidebarMenuLabels.js:332`) · 탭 정의/렌더 배선(`PerformanceHub.jsx:1214`·`:1298`) · **Pro 유료 게이트**(`tabPlanPolicy.js:15`) · **15개국 i18n 라벨**(`ko.js:6905~6921`·`en.js:8142`·`ja.js:10994~11002`) · 가이드 7개국 문구(`perfGuideI18n.js:25`·`:42`·`:110`·`:127` 등) · 온보딩(`Onboarding.jsx:31`) · **챗봇 지식 등재**(`backend/data/chatbot_feature_map.md:77`)
- **실체는 전무**: `ESGTab`(`PerformanceHub.jsx:1032~1070`)에 **API·state·effect·props 전무**, 모든 데이터 셀이 **`t('performance.noData')` 고정**(`:1050`·`:1064`) · **백엔드 ESG 핸들러/테이블/라우트 0**(GT① §2.2)

### ★판정 어휘 (4종 규율 적용)
- ESG 지표값 미표시 = **"미달"이 아니라 "측정 기반 부재"** — 측정할 데이터원이 없다
- 탄소 산출 = **"미구현"이 아니라 "선행 데이터(배출계수·활동량) 부재"**
- Energy Intelligence = **"미구현"이 아니라 "인프라 선행 종속"**(→ D-3)
- ESG 리포팅 = **"부실"이 아니라 "선행 개념(Canonical Entity·Registry) 부재"**

### ★058~062와의 차이 (성격 분류 확정)
| 유형 | Part | 처방 |
|---|---|---|
| 엔진 있음 / Registry 없음 | 058 Decision · 059 Twin · 060 Automation · 061 Device | 기존 위 **얇은 통합 계층** |
| 엔진 자체 없음 | 062 Blockchain | **전면 순신설 + 인프라 선행 종속** |
| **표면만 있음 / 데이터·엔진 없음** | **063 ESG** | ★**데이터원 확보가 1순위** — UI는 이미 있으므로 **UI부터 만들면 안 된다** |

★**이 차이가 실행 순서를 결정한다**(→ D-7).

---

## D-2 — **비용 축과 환경 축은 다르다**: `Pnl`/`Logistics`를 탄소 데이터로 오흡수 금지

### 결정
`Pnl`의 배송비·원가, `Logistics`의 배송 추적을 **CARBON_EMISSION의 데이터원으로 직접 사용하는 것을 금지**한다. **CARBON_FACTOR(배출계수)와 물리 활동량(거리·중량·운송수단)이 선행**하며, 현재 **둘 다 부재**다.

### 근거
- `Pnl.php:210` `$shippingCost = $shipFee;` · `:219` 영업이익 차감 — **금액(₩)**
- `Pnl.php:134`·`:148` 배송비는 `kr_fee_rule`의 **정률·무료배송 기준액**에서 파생 → **물리량과 무관**
- `Logistics.php:91~103` `shipment_tracking`= `carrier`·`tracking_no`·`status` — **거리·중량·운송수단 0개 보유**(Scope 3 물류 배출 3대 입력 중 0)
- `poI18n.js:301`·`:2776` `fuel surcharge` = **요금**이지 연료 소비량 아님(GT① §3)

### 귀결
> **같은 배송 이벤트에서 비용과 배출이 함께 파생될 수는 있으나, 배출계수 없이 금액으로 배출량을 산출하는 것은 날조다.**
`shippingCost × 임의계수 = 탄소배출량` 형태의 구현은 **[[feedback_real_value_autoderive]] 위반**(임의 숫자 금지)이며 **명시적으로 금지**한다.

---

## D-3 — Energy Intelligence(§11)는 **061 Device/센서 부재의 직접 종속**

### 결정
§11 Energy Monitoring·Peak Detection·Renewable Energy Tracking·Facility Analysis는 **"미구현"이 아니라 "인프라 선행 종속"**으로 판정하고, **061 해소 이전 착수 금지**로 고정한다.

### 근거
- ENERGY_USAGE의 데이터원은 **전력 계량기·설비 센서**다. 061 확정 판정상 **Device 도메인 부재**.
- 실재 센서류는 `WmsCctv`(`wms_cameras` `WmsCctv.php:124~151`·061 확정)뿐이며 **영상 장치이지 계량 장치가 아니다**.
- `facility` 히트 2건은 전량 **syslog PRI facility**(`Compliance.php:238`·`:243`) — **사업장 시설 아님**(GT① §3).
- `energy`·`kwh`·`kilowatt`·`electricity`·`renewable` **실 코드 0**.

### ★귀결
**Scope 2(구매 전력 간접배출)는 계량 데이터가 선행**하므로 **Scope 1/2/3 중 Scope 2가 가장 늦게 가능**하다. Scope 3(가치사슬)의 일부 항목이 **오히려 먼저 가능**하다(단 D-2 제약 하에서 배출계수 확보 후).

---

## D-4 — **ESG 리포팅 엔진 신설 금지**: `Reports`를 확장한다 (헌법 V4)

### 결정
§10 ESG Reporting(Regulatory Reporting·Sustainability Report·Audit Report·**Scheduled Reporting**·Multi-format Export)을 위해 **전용 리포팅 엔진을 신설하지 않는다.** 기존 `Reports`를 확장한다.

### 근거 (재사용 가능 자산이 이미 완비)
`backend/src/Handlers/Reports.php` — `ensureTables`:62 · **`computeNextRun`:104**(스케줄 주기 계산) · `generateKpiSummary`:116 · `summaryHtml`:150 · CRUD `:178`~`:235` · **`compileMetricFormula`:256~262**(사용자정의 수식 컴파일) · `metricDefList`:273 / `metricDefSave`:284 · `runNow`:475 · **`history`:488** · `runSchedule`:502
라우트 `backend/src/routes.php:407~420`(스케줄 CRUD·run·preview·history·query·saved·metrics)

### ★귀결
**ESG_METRIC은 `Reports`의 사용자정의 메트릭(`metricDefSave`:284) 위에 얹을 수 있는지를 먼저 검토**해야 한다. 별도 메트릭 정의 체계를 만드는 것은 **중복 인텔리전스**다.
★단 **ESG 규제 공시(CSRD/TCFD/GRI 등)는 서식·검증 요건이 범용 KPI 리포트와 다르므로**, 스케줄링·이력·렌더는 재사용하되 **공시 서식 계층은 별도**로 둔다(스코프 분리 — 060 D-2 규율).

---

## D-5 — ESG 감사·무결성은 `SecurityAudit` 하나만 사용 (감사 체인 이원화 금지)

### 결정
§12 Audit Trail · §13 Immutable Audit Log · §16 `ESGAudited`는 **`SecurityAudit` 단일 체인**으로 처리한다. ESG 전용 감사 로그 테이블 신설 **금지**.

### 근거
- `backend/src/SecurityAudit.php:44~52`(`security_audit_log` `prev_hash`/`hash_chain`) + **`verify()`:55~68** = **저장소 유일 tamper-evident**(056·062 확정)
- 056 D-3 ~ 062 D-2에서 **"체인 정본은 하나"**를 이미 확정 — **재판정 금지**

### ★★재오염 절대 금지
**`menu_audit_log.hash_chain`은 tamper-evident가 아니다**([[reference_menu_audit_log_not_tamper_evident]] · 289차 116편 정정). 본 Part는 §13에 "Immutable Audit Log"가 명시되어 **재오염 위험이 있다** — 절대 금지.

### ★정직 한계 명시 (062 D-1 승계)
`SecurityAudit`은 **단일 노드·append-only 코드 규율 의존**이며 **DB 관리자의 UPDATE를 탐지할 뿐 막지 못한다**. ESG 규제 공시가 **제3자 검증 수준의 불변성**을 요구할 경우 이는 **충족되지 않는다**. 이 한계를 **공시 설계 시 전제로 명시**해야 하며, "불변 원장 보유"로 **과대주장 금지**.

---

## D-6 — FIND-063-1(Pro 게이트 빈 화면) 처방: **3선택지 · 결정은 사용자 승인 사항**

### 결정
GT① §4 FIND-063-1(Pro 유료 탭이 영구 빈 화면 + 가이드·온보딩·챗봇의 현재형 약속)은 **실결함으로 등재**하되, **처방 선택은 본 세션에서 하지 않는다**(코드 변경 0). 선택지만 확정한다.

| 안 | 내용 | 장점 | 단점 |
|---|---|---|---|
| **①** | **플랜 게이트 해제 + "준비 중" 명시** — `tabPlanPolicy.js:15` 제거, 가이드/온보딩/챗봇 문구를 **미래형/예정**으로 정정 | 최소 변경 · **유료 오인 즉시 해소** · 무후퇴 | ESG 기능 부재가 표면화 |
| **②** | **탭 비노출(숨김)** — 메뉴·탭·챗봇 지식에서 제거 | 약속-실체 불일치 완전 제거 | ★**후퇴로 보일 수 있음**([[feedback_no_regression_value_unification]] 충돌 검토 필요) |
| **③** | **실 구현 착수** — D-7 순서대로 데이터원부터 | 근본 해결 | 대규모 · 선행 종속(D-3) |

★**권장 = ①**(즉시 실행 가능·무후퇴·정직). 단 **가이드/온보딩/챗봇 3개소 문구 동시 정정**이 필수다 — 하나만 고치면 **불일치가 남는다**([[feedback_no_regression_value_unification]] 값 단일소스 규율).
★★**모든 안은 사용자 승인 후 별도 세션**에서 집행한다.

---

## D-7 — 구현 착수 순서 고정: **UI가 아니라 데이터원부터** (★D-1의 직접 귀결)

### 결정
ESG 구현 착수 시 **아래 순서를 강제**한다. **UI는 이미 존재하므로 UI부터 만들면 실체 없는 표면을 한 겹 더 쌓는 것**이다.

1. **CARBON_FACTOR(배출계수) 레지스트리 확보** — 국제 표준 계수의 **출처·버전·유효기간** 기록([[feedback_real_value_autoderive]]·데이터 헌법 Source 기록 의무). ★계수 없이는 **어떤 배출량도 산출 불가**
2. **활동량(Activity Data) 데이터원 정의** — Scope 3 물류부터 검토(D-2 제약 하). 거리·중량·운송수단이 **현재 부재**하므로 **수집 가능성 실사 우선**
3. **ESG_METRIC 스키마 — `Reports` 사용자정의 메트릭(`Reports.php:284`) 재사용 가능성 검토**(D-4)
4. **Enterprise ESG Registry**(§6 근간) — ★**Registry 부재 6연속**(058~063)이므로 **개별 Registry 난립 금지**, 상위 통합 방안 검토
5. **산출·집계** → 6. **`Reports` 확장 공시**(D-4) → 7. **`SecurityAudit` 감사**(D-5) → 8. **UI 배선**(기존 `ESGTab` 확장, 신규 페이지 금지)
9. **AI(§17)는 최후** — V3 신뢰검증 READY 데이터에만 적용, **근거·신뢰도 표시 필수**(→ D-8 성격의 제약은 GOVERNANCE 문서 참조)

### ★무결성 제약
- **`noData` 정직 표기를 후퇴시키지 말 것** — 데이터가 없으면 **계속 `noData`**여야 한다. 추정치·업계평균·목표치를 **실측값처럼 표시 금지**(288차 "가짜 녹색" 재발 방지)
- **Scope 1/2/3은 산출 근거(계수·활동량·수식)를 함께 저장**해야 한다(명세 §7 "모든 ESG 데이터는 변경 이력과 **산출 근거**를 관리한다")
- **테넌트 격리 절대** — ESG 성과는 **경영 기밀**이며 교차 노출은 062 D-7(재무 기밀)과 동급
- **AI는 승인 없이 ESG 보고서 자동 제출·ESG 정책 변경 금지**(명세 §17 · 헌법 V5) — ★**규제 공시는 법적 책임이 따르므로 062 D-8(온체인 롤백 불가)과 유사하게 사전 승인이 사실상 유일한 방어선**이다. 제출된 허위 공시는 **철회해도 법적 노출이 남는다**.

---

## 부록 A — 본 Part에서 확정한 오흡수 금지 목록 (요약 · 상세는 GT① §3)

`riesgo`(스페인어 위험) ≠ ESG · **water-filling 예산배분** ≠ 물 사용량 · **데이터 거버넌스**(`/data-trust`) ≠ ESG의 G · **광고 벤치마크** ≠ ESG Benchmark · **"Branded Disclosure"(UGC 표기율)** ≠ Carbon Disclosure · **SQL OFFSET** ≠ Carbon Offset · **syslog facility** ≠ 사업장 시설 · **fuel surcharge(요금)** ≠ 연료 소비량 · **`SupplyChain` risk/delayRate**(058/060 확정) ≠ ESG 리스크 · **`Rollup`/P&L 집계** ≠ Carbon Accounting · **`Compliance` SIEM**(057 확정) ≠ ESG Compliance · **`DataPlatform` reliability_score**(055/056 확정) ≠ ESG 데이터 신뢰 · **CSS `#22c55e` green** ≠ Green Logistics · **OAuth/data `scope`** ≠ Scope 1/2/3

## 부록 B — grep 규율 갱신 (신규 트랩)

`tools/migrations/_archived/_tmp_check_*.mjs`(15개국 로케일 **단일라인 덤프** 9종)를 **상시 제외 목록에 추가**한다. 미제외 시 ESG 토큰 전량 오탐 + **출력 6.9MB 폭발**.
→ 표준 제외: `--glob '!*.json' --glob '!**/i18n/**' --glob '!**/locales_backup/**' --glob '!**/_archived/**'`

# MEA Part 063 — INDEX (Enterprise Sustainability, ESG & Carbon Intelligence)

> 289차 후속(2026-07-22) · **설계 명세 · 코드 변경 0 · NOT_CERTIFIED · 배포 없음**

---

## 1. 문서 세트 (7편)

| # | 문서 | 역할 |
|---|---|---|
| ⓐ | [`docs/spec/MEA_PART063_SUSTAINABILITY_ESG_CARBON_INTELLIGENCE_ARCHITECTURE_SPEC.md`](../spec/MEA_PART063_SUSTAINABILITY_ESG_CARBON_INTELLIGENCE_ARCHITECTURE_SPEC.md) | 원문 §1~§19 **verbatim** + 거버넌스 헤더 |
| ⓑ | [`MEA_PART063_EXISTING_IMPLEMENTATION.md`](MEA_PART063_EXISTING_IMPLEMENTATION.md) | **GT①** 실재 전수조사 + 부재증명 + 오흡수 배제 + **부수 발견 2건** |
| ⓒ | [`MEA_PART063_DUPLICATE_AUDIT.md`](MEA_PART063_DUPLICATE_AUDIT.md) | **GT②** 중복 신설 위험(HIGH 3·MEDIUM 3·SEPARATE 5·NO-CONFLICT 4) |
| ⓓ | [`../architecture/ADR_MEA_PART063_SUSTAINABILITY_ESG_CARBON.md`](../architecture/ADR_MEA_PART063_SUSTAINABILITY_ESG_CARBON.md) | **ADR D-1~D-7** + 오흡수 목록 + grep 규율 갱신 |
| ⓔ | [`MEA_PART063_CANONICAL_ENTITIES.md`](MEA_PART063_CANONICAL_ENTITIES.md) | §5 15엔티티 + §6~§11 도메인 판정 |
| ⓕ | [`MEA_PART063_GOVERNANCE_MECHANISMS.md`](MEA_PART063_GOVERNANCE_MECHANISMS.md) | §12~§19 거버넌스·보안·AI·완료기준 |
| ⓖ | 본 문서 | INDEX |

---

## 2. ★★핵심 판정 한 줄

> **PARTIAL-surface-only — "판매 가능한 표면(메뉴·Pro 유료 게이트·15개국 라벨·가이드·온보딩·챗봇 지식)은 완비되어 있고, 그 뒤의 데이터·산출 엔진·백엔드는 전무하다."**

- **§5 Canonical Entity 15종 = 전량 ABSENT**
- **백엔드 ESG 핸들러·테이블·라우트 = 0**
- **`ESGTab`(`PerformanceHub.jsx:1032~1070`) = API·state·effect·props 전무**, 모든 셀 `t('performance.noData')` 고정(`:1050`·`:1064`)

### MEA 시리즈 내 위치 (성격 3분류)
| 유형 | Part |
|---|---|
| 엔진 있음 / Registry 없음 | 058 · 059 · 060 · 061 |
| 엔진 자체 없음 | 062 |
| **표면만 있음 / 데이터·엔진 없음** | **063** ★유일 |

---

## 3. ADR 결정 7종 요약

| ID | 결정 |
|---|---|
| **D-1** ★★ | 성격은 "부실"이 아니라 **"판매 표면만 존재하는 공동(空洞)"** — 판정 어휘 4종 적용 |
| **D-2** ★ | **비용 축 ≠ 환경 축** — `Pnl` 배송비·`Logistics` 추적을 탄소 데이터로 오흡수 금지. **배출계수 없이 금액으로 배출량 산출 = 날조** |
| **D-3** | §11 Energy Intelligence는 **061 Device/계량기 부재의 직접 종속** → **Scope 2가 가장 늦게 가능** |
| **D-4** | **ESG 리포팅 엔진 신설 금지 — `Reports` 확장**(헌법 V4). 단 **규제 공시 서식은 "결여 보강"으로 신설 정당** |
| **D-5** | ESG 감사는 **`SecurityAudit` 단일 체인**. ★★`menu_audit_log` 재오염 금지 · **"불변 원장" 과대주장 금지** |
| **D-6** | FIND-063-1 처방 3선택지(**권장=① 게이트 해제+문구 정정**) — **결정·집행은 사용자 승인 후 별도 세션** |
| **D-7** ★ | 착수 순서 강제: **배출계수 → 활동량 → 메트릭 → Registry → 산출 → 리포팅 → 감사 → UI → AI(최후)**. **UI부터 만들면 안 된다** |

---

## 4. 부수 발견 실결함 2건 (★수정 아님 · 후속 등재)

| ID | 내용 | 상태 |
|---|---|---|
| **FIND-063-1** | `tabPlanPolicy.js:15` **`'performance::esg': 'pro'`** — Pro 유료 게이트인데 **영구 빈 화면**. 가이드(`perfGuideI18n.js:25`·`:42`)·온보딩(`Onboarding.jsx:31`)·챗봇(`chatbot_feature_map.md:77`)은 **"추적·리포트합니다" 현재형 단정**. **283차 "코드 존재≠구현 완료" 극단 사례** | 등재 · 처방 D-6 |
| **FIND-063-2** | **`disposed`(폐기) = 생산자 부재 고아 상태값**. 소비 4곳(`OrderHub.php:729` 집계 · `ReturnsPortal.jsx:23`·`:34`·`:292`)뿐이고, 전이 화이트리스트 `ReturnsPortal.php:199`에 **`disposed` 없음 → 영원히 0**. ★ESG 폐기물 관리 1차 지표의 **상태 전이 자체가 부재** | 등재 |

★**둘 다 본 세션 범위 밖**(코드 변경 0). 수정은 **사용자 승인 후 별도 세션**.

---

## 5. ★재구현 금지 — 재사용 강제 자산

| 자산 | file:line | 용도 |
|---|---|---|
| **`Reports`** | `Reports.php:62`·`:104`·`:116`·`:150`·`:178~235`·**`:256~262`**·`:273`·**`:284`**·`:475`·**`:488`**·`:502` / 라우트 `routes.php:407~420` | ★**§10 ESG Reporting 1순위 재사용** |
| **`SecurityAudit`** | `SecurityAudit.php:44~52` · **`verify()`:55~68** | §12 Audit Trail · §13 Immutable Audit(★한계 명시) |
| **`SystemMetrics`** | `SystemMetrics.php:15~19`(목데이터 금지 원칙)·`:127~353`·`:372` | §18 가용성 · Executive Dashboard |
| **`ESGTab`** | `PerformanceHub.jsx:1032~1070`·`:1214`·`:1298`·`sidebarMenuLabels.js:332` | ★**UI는 확장 · 신규 페이지/메뉴 신설 금지** |
| `Crypto`(049) · 테넌트 격리 · EPIC 06-A RBAC | 상위 Part GT | §13 Data Security |

---

## 6. ★오흡수 금지 (동음이의 · 전량 실측 배제)

**`riesgo`**(스페인어 "위험"·`MmmReportI18n.php:18`) ≠ ESG · **water-filling 예산배분**(`AutoRecommend.php:589`·`:757`) ≠ 물 사용량 · **데이터 거버넌스**(`RoleViewBar.jsx:20`) ≠ ESG의 G · **광고 벤치마크** 38(`MarketingDataHub`·`AutoRecommend`) ≠ ESG Benchmark · **"Branded Disclosure"**(`DataProduct.jsx:132` UGC 표기율) ≠ Carbon Disclosure · **SQL OFFSET** 114 ≠ Carbon Offset · **syslog PRI facility**(`Compliance.php:238`·`:243`) ≠ 사업장 시설 · **fuel surcharge**(`poI18n.js:301`) ≠ 연료 소비량 · **`Wms` Disposal**(`Wms.php:1096`) = 재고 출고유형 ≠ 폐기물 지표 · **`SupplyChain` risk/delayRate** ≠ 기후 리스크 · **`Rollup`/P&L** ≠ Carbon Accounting · **`Compliance` SIEM** ≠ ESG Compliance · **CSS `#22c55e`** ≠ Green Logistics · **OAuth/`data_scope`** ≠ Scope 1/2/3

---

## 7. ★grep 규율 갱신 (신규 트랩)

`tools/migrations/_archived/_tmp_check_{de,en,ja,id,ko,th,vi,zh,zh-TW}.mjs` = **15개국 로케일 단일라인 덤프** → ESG 토큰 **전량 오탐** + **출력 6.9MB 폭발**.

**표준 제외(이후 상시 적용)**:
```
--glob '!*.json' --glob '!**/i18n/**' --glob '!**/locales_backup/**' --glob '!**/_archived/**'
```
★**`scope`는 무경계 검색 금지** — OAuth 스코프·`data_scope`(EPIC 06-A Part3-4)와 충돌. **`scope1`/`scope_1` 형태로만** 검색.

---

## 8. ★★Registry 부재 6연속 (상위 승격 필요)

**058 Decision · 059 Twin · 060 Automation · 061 Device · 062 Blockchain · 063 ESG** — 6개 Part 연속 Registry 부재.
개별 신설 시 **Registry 6개 난립**. **공통 Registry 추상화 검토는 개별 Part 결정 범위를 넘으므로 상위 아키텍처 결정으로 승격**해야 한다(GT② DUP-6).

---

## 9. 다음 Part

**MEA Part 064 — Enterprise Quantum Computing Readiness & Advanced Computing Architecture**(063 SPEC 지정).

★**063 선례 필독**: 062 인계서의 조사 후보 가설(`Pnl`·`Logistics`·`SupplyChain`·`DataPlatform`·**`ReportBuilder`**)은 **명칭부터 틀렸다**(실재는 `Reports.php`, `ReportBuilder`는 **존재하지 않음**). 또한 "ESG 부재 예상" 가설과 달리 **UI·메뉴·유료 게이트·15개국 라벨이 실재**했다.
→ ★**가설을 근거로 인용하지 말 것. 전량 grep 재실증.**

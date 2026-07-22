# MEA Part 063 — CANONICAL ENTITIES (§5 15엔티티 · §6~§11 도메인 판정)

> 289차 후속(2026-07-22) · **코드 변경 0 · NOT_CERTIFIED · 배포 없음**
> 판정 근거 전량 [`GT①`](MEA_PART063_EXISTING_IMPLEMENTATION.md) 실측. **가설 인용 0.**
> ★판정 어휘 4종 규율: "미달"vs**"측정 기반 부재"** · "미구현"vs**"인프라 선행 종속"** · "중복"vs**"결여 보강"** · "부실"vs**"선행 개념 부재"**

---

## 1. §5 Canonical Entity 15종 판정표

| # | 엔티티 | 판정 | 근거 / 사유 |
|---|---|---|---|
| 1 | **ESG_METRIC** | **ABSENT** | `esg_metric` grep **0**. ★UI 라벨 4종(`esgCarbon`/`esgEnergy`/`esgPackaging`/`esgRecycleRate` `PerformanceHub.jsx:1057~1060`)은 **문자열이지 엔티티가 아니다**. 스키마·저장·산출 전무. ★재사용 후보=`Reports` 사용자정의 메트릭(`Reports.php:284`·GT② DUP-4) |
| 2 | **ESG_REPORT** | **ABSENT** | `esg_report` grep **0**. ★엔진은 `Reports`가 대체 가능(GT② DUP-1)하나 **ESG 리포트 엔티티는 부재** |
| 3 | **CARBON_EMISSION** | **ABSENT** | `carbon_emission`·`emission`·`ghg`·`co2` grep **0**. ★**"미구현"이 아니라 "선행 데이터(배출계수·활동량) 부재"** |
| 4 | **CARBON_FACTOR** | **ABSENT** | `carbon_factor` grep **0**. ★★**본 Part 최우선 선행 엔티티** — 이것 없이는 3·8·9·17 전부 산출 불가(ADR D-7 단계 1) |
| 5 | **CARBON_CREDIT** | **ABSENT** | `carbon_credit`·`carbon_offset` grep **0**. ★`offset` 114히트=**SQL LIMIT/OFFSET**(오탐) |
| 6 | **ENERGY_USAGE** | **ABSENT** | `energy_usage`·`kwh`·`electricity`·`renewable` grep **0**. ★**"미구현"이 아니라 "인프라 선행 종속"** — **061 Device/계량기 부재**(ADR D-3) |
| 7 | **SUSTAINABILITY_TARGET** | **ABSENT** | `sustainability`(실코드)·`target_achievement` grep **0** |
| 8 | **ESG_POLICY** | **ABSENT** | `esg_policy` grep **0** |
| 9 | **ESG_AUDIT** | **ABSENT** | `esg_audit`·`audit_trail`·`immutable_audit` grep **0**. ★단 **`SecurityAudit`이 감사 기반을 제공**(`SecurityAudit.php:44~52`·`verify`:55~68) — **엔티티는 부재, 기반은 실재**(ADR D-5) |
| 10 | **ESG_INCIDENT** | **ABSENT** | `esg_incident` grep **0** |
| 11 | **ESG_SCORE** | **ABSENT** | `esg_score` grep **0**. ★UI E/S/G 3영역 카드(`PerformanceHub.jsx:1044~1046`)는 **색상 있는 빈 카드**(본문 `:1050` `noData` 고정) |
| 12 | **ESG_PROJECT** | **ABSENT** | `esg_project` grep **0** |
| 13 | **ESG_DISCLOSURE** | **ABSENT** | `esg_disclosure`·`csrd`·`tcfd`·`sasb`·`gri_standard`·`cdp_report` grep **0**. ★`disclosure` 9히트=**`DataProduct.jsx:132` "Branded Disclosure"(UGC 브랜디드 표기율)** — **완전 오탐** |
| 14 | **ESG_ANALYTICS** | **ABSENT** | `esg_analytics` grep **0**. ★`benchmark` 38히트=**광고 벤치마크**(`MarketingDataHub`/`AutoRecommend`) — 오탐 |
| 15 | **ESG_COMPLIANCE** | **ABSENT** | `esg_compliance`·`regulatory` grep **0**. ★`Compliance.php`=**SIEM 포워딩**(057 확정) — **완전 별개 도메인**(GT② §3) |

### ★판정 총계
**15종 전량 ABSENT.** 실재하는 것은 **엔티티가 아니라 UI 문자열 라벨 9종**(`esgTitle`/`esgSub`/`esgEnvironment`/`esgSocial`/`esgGovernance`/`esgCarbon`/`esgEnergy`/`esgPackaging`/`esgRecycleRate` — `ja.js:10994~11002`에 15개국 완비)이며, **저장소·산출·API가 전무**하다.

> ★**과대주장 금지 확인**: "ESG 지표 4종 보유"라고 말할 수 없다. **라벨 4개를 보유**하고 있을 뿐이며 **값은 항상 `noData`**다(`PerformanceHub.jsx:1064`).

---

## 2. §6 Sustainability Domain 10종

| 도메인 | 판정 | 사유 |
|---|---|---|
| Environmental Management | **ABSENT** | 환경 데이터원 0 |
| Carbon Management | **ABSENT** | 배출계수·활동량 부재(선행 개념 부재) |
| Energy Management | **ABSENT** | ★**061 종속**(계량 인프라 선행) |
| ESG Compliance | **ABSENT** | ★`Compliance`(SIEM·057) 오흡수 금지 |
| Sustainability Reporting | **ABSENT** | ★엔진은 `Reports` 재사용(D-4), 도메인은 부재 |
| Climate Risk | **ABSENT** | ★`SupplyChain` risk/delayRate(058/060) 오흡수 금지 |
| **Green Logistics** | **ABSENT** | ★`Logistics.php:91~103`은 **carrier·tracking_no·status만** — 거리/중량/운송수단 0. **배송 추적 ≠ 친환경 물류** |
| Sustainable Commerce | **ABSENT** | — |
| ESG Analytics | **ABSENT** | — |
| Enterprise Sustainability | **ABSENT** | — |
| **Enterprise ESG Registry**(§6 근간) | **ABSENT** | ★★**Registry 부재 6연속**(058~063) — 개별 신설 시 난립 위험(GT② DUP-6) |

---

## 3. §7 ESG Lifecycle 10단계

**10단계 전량 ABSENT.** Data Collection(1) 단계의 **데이터원조차 없으므로** 이후 9단계는 **판정 대상이 성립하지 않는다**.

★명세 §7 말미 **"모든 ESG 데이터는 변경 이력과 산출 근거를 관리한다"** — 이는 **구현 시 강제 제약으로 승계**한다(ADR D-7 무결성 제약). 배출량은 **계수·활동량·수식·출처를 함께 저장**해야 검증 가능하다.

---

## 4. §8 Carbon Intelligence 8종

| 기능 | 판정 |
|---|---|
| Carbon Emission Collection | **ABSENT** — 수집 대상 정의 부재 |
| **Scope 1 Calculation**(직접배출) | **ABSENT** — 연료·사업장 데이터 0(`fuel` 2히트=**유류할증료 요금**·오탐) |
| **Scope 2 Calculation**(구매전력) | **ABSENT** — ★**계량 데이터 선행 종속**(061). D-3상 **가장 늦게 가능** |
| **Scope 3 Calculation**(가치사슬) | **ABSENT** — ★배송 이벤트는 실재하나(`Logistics`·`Pnl`) **배출계수+물리량 없이 산출 불가**(ADR D-2) |
| Carbon Footprint Analysis | **ABSENT** |
| Carbon Forecast | **ABSENT** — ★`Mmm::frontier` 시뮬 패턴은 **스코프 상이**(GT② §3) |
| Carbon Reduction Planning | **ABSENT** |
| Carbon Analytics | **ABSENT** |

★**`scope1/2/3`·`scope_1/2/3` grep 전량 0** — ★단 **`scope`(무경계) 검색은 OAuth 스코프·`data_scope`(EPIC 06-A Part3-4)와 충돌**하므로 **반드시 `scope1`/`scope_1` 형태로만 검색**해야 한다(오흡수 금지).

---

## 5. §9 Sustainability Analytics 8종 · §10 ESG Reporting 8종 · §11 Energy Intelligence 8종

| 절 | 판정 | 비고 |
|---|---|---|
| **§9** 8종(KPI/Trend/Benchmark/Target/Carbon/Energy/Forecast/Executive Dashboard) | **전량 ABSENT** | ★`benchmark` 38=광고 벤치마크(오탐) · Executive Dashboard=`SystemMetrics`/`PerformanceHub` **중복 신설 금지**(DUP-3) |
| **§10** 8종 | **ABSENT (엔진 재사용 가능)** | ★`Reports` 전면 재사용(D-4·DUP-1). **규제 공시 서식만 "결여 보강"으로 신설 정당** |
| **§11** 8종 | **ABSENT — 인프라 선행 종속** | ★**061 Device 부재의 직접 종속**(D-3). `facility` 2히트=**syslog PRI facility**(`Compliance.php:238`·`:243`)·오탐 |

---

## 6. ★환경 축으로 "파생 가능성"이 있는 인접 자산 (재확인 · 데이터 아님)

ADR D-2 제약 하에서만 검토 대상:

| 자산 | file:line | 부족한 것 |
|---|---|---|
| `shipment_tracking` | `Logistics.php:91~103` | **거리·중량·운송수단** |
| 배송비 | `Pnl.php:210`·`:219`·`:134`·`:148` | **물리량**(금액은 정률 파생) |
| 반품 재입고 | `ReturnsPortal.php:199`·`:208`·`:211` | **재활용률의 분모/분자 정의** |
| 창고 폐기 출고 | `Wms.php:1096`(`'Disposal'`)·`:1116` | **폐기물 중량·처리방식** |
| ★폐기 상태 | `OrderHub.php:729`(소비) / `ReturnsPortal.php:199`(생산자 **부재**) | ★**전이 경로 자체가 없어 영원히 0**(GT① FIND-063-2) |

> ★**결론**: 인접 자산은 **전부 비용·운영 축**이며, **환경 축 값을 산출하려면 예외 없이 CARBON_FACTOR가 선행**한다. 계수 없이 금액·건수로 배출량을 만드는 것은 **날조**다([[feedback_real_value_autoderive]]).

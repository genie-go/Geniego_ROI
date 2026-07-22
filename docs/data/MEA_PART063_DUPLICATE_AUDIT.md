# MEA Part 063 — GT② DUPLICATE AUDIT (중복 신설 위험 전수 감사)

> 289차 후속(2026-07-22) · **코드 변경 0 · NOT_CERTIFIED · 배포 없음**
> 목적: 명세 §3 구축 대상 10종 착수 시 **기존 자산과 중복될 지점**을 사전 식별. 헌법 V4(**단일 Intelligence Layer · 중복 엔진 절대 금지**) · [[feedback_no_duplicate_features]] 적용.
> ★판정 규율: **"중복"과 "결여 보강"을 구분**한다. 기능이 겹치면 중복, 스코프가 다르면 **둘 다 참**(060 D-2·061 D-1).

---

## 0. 요약

| 구분 | 건수 | 내용 |
|---|---|---|
| **★DUPLICATE-HIGH**(신설 시 명백한 중복) | **3** | 리포팅 엔진 · 감사 로그 · 대시보드/관측 |
| **DUPLICATE-MEDIUM**(설계 따라 중복) | **3** | 메트릭 정의 · 스케줄러 · Registry |
| **SEPARATE**(스코프 상이 · 둘 다 참) | **5** | 데이터 신뢰 · SIEM Compliance · 공급망 리스크 · 시뮬레이션 · 이상탐지 |
| **NO-CONFLICT**(대응 자산 자체 부재) | **4** | 배출계수 · 활동량 · 에너지 계량 · ESG 스코어링 |

---

## 1. ★DUPLICATE-HIGH — 신설 금지 (기존 확장 강제)

### DUP-1 · "ESG Reporting Service"(§3-4) vs **`Reports`**

| 명세 요구(§10) | 기존 실재 | file:line |
|---|---|---|
| Scheduled Reporting | `computeNextRun` 주기 계산 · `runSchedule` | `Reports.php:104` · `:502` |
| Audit Report / Executive Report | `generateKpiSummary` · `summaryHtml` | `Reports.php:116` · `:150` |
| 리포트 CRUD | listSchedules/create/update/delete | `Reports.php:178`·`:189`·`:206`·`:225` |
| 이력 | `history` | `Reports.php:488` |
| 즉시 실행 | `runNow` | `Reports.php:475` |
| 미리보기 | `preview` | `Reports.php:235` |
| 라우트 | 스케줄·run·preview·history·query·saved·metrics | `routes.php:407~420` |

★**판정: DUPLICATE-HIGH.** ESG 전용 리포팅 서비스 신설은 **명백한 중복**(ADR D-4).
★**단 예외 = 결여 보강**: **규제 공시 서식**(CSRD/TCFD/GRI/SASB/CDP)은 `Reports`에 **대응 개념이 없다**(부재증명: `csrd`·`tcfd`·`sasb`·`gri_standard`·`cdp_report`·`regulatory_report` 전량 grep 0). → **서식 계층은 "중복"이 아니라 "결여 보강"**이며 신설 정당.

### DUP-2 · "ESG Audit Service"(§3-9) vs **`SecurityAudit`**

| 명세 요구 | 기존 실재 | file:line |
|---|---|---|
| §12 Audit Trail · §13 Immutable Audit Log · §16 `ESGAudited` | `security_audit_log`(`prev_hash`·`hash_chain`) + **`verify()`** | `SecurityAudit.php:44~52` · **`:55~68`** |

★**판정: DUPLICATE-HIGH.** ESG 전용 감사 체인 신설은 **056 D-3 ~ 062 D-2에서 이미 확정된 "체인 정본은 하나" 규율 위반**(ADR D-5).
★★**`menu_audit_log.hash_chain`을 tamper-evident로 재오염하지 말 것**([[reference_menu_audit_log_not_tamper_evident]]).

### DUP-3 · "Sustainability Dashboard"(§3-8) / §9 Executive Dashboard vs **`SystemMetrics` + `PerformanceHub`**

| 명세 요구 | 기존 실재 | file:line |
|---|---|---|
| 실시간 관측·프로브 | `SystemMetrics` **목데이터 금지 원칙** · probes · cronHealth | `SystemMetrics.php:15~19` · `:127~353` · `:372` |
| 성과 대시보드 셸 + ESG 탭 | `PerformanceHub` ESGTab | `PerformanceHub.jsx:1032~1070` · 탭 `:1214` · 렌더 `:1298` |
| 메뉴 | `/performance` 서브탭 `esg` | `sidebarMenuLabels.js:332` |

★**판정: DUPLICATE-HIGH.** **ESG 전용 신규 페이지·신규 사이드바 메뉴 신설 금지**([[feedback_minimize_new_menus]]). **기존 `ESGTab` 확장**이 정답(ADR D-7 단계 8).

---

## 2. DUPLICATE-MEDIUM — 설계에 따라 중복 (사전 검토 의무)

### DUP-4 · ESG_METRIC 정의 체계 vs **`Reports` 사용자정의 메트릭**

`Reports.php:256~262` `compileMetricFormula`(식별자 치환 기반 수식 컴파일) · `:273` `metricDefList` · `:284` `metricDefSave` · `:303` `ensureMetricDefTable` · 라우트 `routes.php:419~420`

★**판정: 별도 메트릭 정의 테이블을 신설하기 전에 이 위에 얹을 수 있는지 반드시 검토**(ADR D-7 단계 3). 검토 없이 신설 시 **중복 인텔리전스**(데이터 헌법).
★**단** ESG_METRIC은 **산출 근거(계수·활동량·수식·출처)를 함께 보존**해야 하므로(명세 §7), 기존 메트릭 정의가 이를 담지 못하면 **"중복"이 아니라 "결여 보강"**이다.

### DUP-5 · ESG 리포트 스케줄러 vs **`Reports` 스케줄러**

`Reports.php:104` `computeNextRun` · `:502` `runSchedule`. ★**별도 cron/워커 신설 금지** — 기존 스케줄 실행 경로에 편입.

### DUP-6 · "Enterprise ESG Registry"(§6) vs **Registry 부재 6연속**

★**058 Decision · 059 Twin · 060 Automation · 061 Device · 062 Blockchain · 063 ESG** — **여섯 Part 연속 Registry 부재.**
★**판정**: 개별 Part마다 독립 Registry를 신설하면 **6개의 Registry가 난립**한다. **공통 Registry 추상화 검토가 선행**되어야 하며, 이는 **개별 Part의 결정 범위를 넘는다**(→ 상위 아키텍처 결정 사항으로 승격 필요).

---

## 3. SEPARATE — 스코프 상이 · 오흡수 금지 (★둘 다 참)

| 기존 자산 | file:line | ESG 요구 | 왜 다른가 |
|---|---|---|---|
| **`DataPlatform` 데이터 신뢰**(V3·055/056 확정) | 055/056 GT 참조 | §4 Data Driven ESG | **데이터 품질 신뢰도** ≠ **ESG 성과 지표**. 신뢰검증은 ESG 데이터에도 **적용**되지만 **대체하지 않는다** |
| **`Compliance` SIEM 포워딩**(057 확정) | `Compliance.php:238`·`:243` (RFC 5424 syslog) | §6 ESG Compliance · §12 Compliance Policy | **보안 이벤트 포워딩** ≠ **ESG 규제 준수**. 완전 별개 도메인 |
| **`SupplyChain` 리스크·지연율**(058/060 확정) | 058/060 GT 참조 | §6 Climate Risk · §17 ESG Risk Prediction | **납기·공급 리스크** ≠ **기후 리스크**. 축이 다름 |
| **`Mmm::frontier` / `PriceOpt` 시뮬**(058/059 확정) | 058/059 GT 참조 | §8 Carbon Forecast · §11 Energy Forecast | **마케팅 예산/가격 최적화** ≠ **배출량 예측**. ★단 **정직 미산출 패턴**(`optimized:false`+사유)은 **모범으로 계승**(→ GOVERNANCE) |
| **`AnomalyDetection`**(046) / `Risk`(056) | 상위 Part GT 참조 | §11 Peak Detection · §16 `EnergyThresholdExceeded` | 알고리즘은 유사하나 **입력 데이터원이 부재**(D-3) → 현재는 **적용 대상 없음** |

---

## 4. NO-CONFLICT — 대응 자산 자체가 없음 (순신설 정당)

부재증명 완료(GT① §2) — **중복 위험 0**:

| 요구 | 부재증명 |
|---|---|
| **CARBON_FACTOR(배출계수) 레지스트리** | `carbon_factor`·`ghg`·`co2`·`emission` grep **0** |
| **활동량(Activity Data) 수집** | 거리·중량·운송수단 필드 부재(`Logistics.php:91~103` 실측) |
| **에너지 계량(ENERGY_USAGE)** | `energy_usage`·`kwh`·`kilowatt`·`electricity`·`renewable` grep **0** · ★**061 Device 부재 종속** |
| **ESG_SCORE 스코어링** | `esg_score` grep **0** |

★이 4종은 **"중복"이 아니라 "선행 개념 부재"**이며, **ADR D-7의 착수 1~2단계**에 해당한다.

---

## 5. ★중복 감사 결론

> **ESG 구현의 절반 이상은 "새로 만드는 것"이 아니라 "기존 `Reports`·`SecurityAudit`·`SystemMetrics`·`ESGTab`에 얹는 것"이다.**
> 진짜 순신설 대상은 **배출계수·활동량·에너지 계량·ESG 스코어링** 4종이며, 이는 **전부 데이터원 문제**다 — ADR D-1의 "표면은 있고 데이터가 없다"와 정확히 일치한다.

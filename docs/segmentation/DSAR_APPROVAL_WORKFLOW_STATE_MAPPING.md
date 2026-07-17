# DSAR — Workflow State Mapping (§63)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §63 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| **상태머신** | 🔴 **없다** | `NOT_APPLICABLE` |
| 상태 쓰기 | `UPDATE ... SET status=` **155건 / 44파일**(Wms 10 · ChannelSync 10 · EmailMarketing 10 · JourneyBuilder 10 · Catalog 9 · LiveCommerce 9 …) | — |
| **전이 규칙 선언** | 🔴 **0** — 전부 **호출 지점 인라인** | `NOT_APPLICABLE` |
| 전이 가드 | **4곳뿐** — `FeedTemplate::transition`(:248-285) · `Mapping::apply`(:309) · `Catalog::approveQueue`(:2341) · `AdminGrowth::launch`(:1155) | `VALIDATED_LEGACY`(가드 패턴만) |
| 상태 컬럼 타입 | `status VARCHAR(20) DEFAULT 'pending'`(AdminGrowth.php:146) — **자유 문자열 · 열거 미선언** | `NOT_APPLICABLE` |
| Versioned Mapping Registry | grep 0 | `NOT_APPLICABLE` |
| Workflow Instance State | 부재 — 정의·인스턴스 개념 전무 | `NOT_APPLICABLE` |
| Approval Case State | 부재 — Case 개념 전무 | `NOT_APPLICABLE` |

**★축 주의 — 🔴 매핑할 정본 상태집합 자체가 선언돼 있지 않다.** 이것이 §63의 핵심 사실이다. 레포는 상태를 **쓰기만** 한다: `UPDATE ... SET status=` 가 155건/44파일에 흩어져 있으나 **"어떤 상태에서 어떤 상태로 갈 수 있는가"를 선언한 곳이 0**이다. 전이 규칙은 전부 호출 지점에 인라인돼 있다. **§63은 3열 매핑표를 요구하는데 3열 중 어느 하나도 열거로 존재하지 않는다** — Workflow Instance State(개념 전무) · Approval Case State(개념 전무) · Approval Request State(문자열 자유값 산재).

**★축 주의 2 — 전이 가드 4곳을 "상태머신 있음"으로 계산 금지.** 4곳(`FeedTemplate::transition` :248-285 · `Mapping::apply` :309 · `Catalog::approveQueue` :2341 · `AdminGrowth::launch` :1155)은 **실 가드**이나 상태머신이 아니다. 실측 근거: `FeedTemplate::transition(…, string $from, string $to)` 은 **from/to 를 호출자가 인자로 넘긴다** — `submitDraft` 가 `'draft','submitted'`(:267), `approveDraft` 가 `'submitted','approved'`(:273). **전이 쌍이 메서드 시그니처 바깥, 즉 호출 지점에 박혀 있다.** 가드는 "넘겨받은 from 과 현재 status 가 같은가"만 검사할 뿐(:258 `!== $from → 409`), 어떤 전이가 합법인지는 알지 못한다. **가드 ≠ 선언.**

**★축 주의 3 — 155건 대 4건의 비대칭이 진짜 리스크다.** 상태 쓰기 155건 중 **151건이 가드 없이** 상태를 바꾼다. §63이 요구하는 것은 매핑표 한 장이 아니라 **그 매핑을 강제할 위치의 확보**다. 매핑표를 선언해도 151개 인라인 쓰기가 그것을 우회하면 매핑은 문서로만 존재한다.

## 1. 원문 전사 + 판정 — **원문 13행**

원문: "최소 다음 Mapping을 정의하라."

| # | Workflow Instance State | Approval Case State | Approval Request State | 현행 대조 | 판정 |
|---|---|---|---|---|---|
| 1 | CREATED·INITIALIZING | CREATED | CASE_CREATION_PENDING | 3열 전부 부재 · 인접 = `status DEFAULT 'pending'`(AdminGrowth.php:146)이 **생성 즉시 pending** — CREATED 단계 없음 | `NOT_APPLICABLE` |
| 2 | RUNNING | IN_PROGRESS | IN_REVIEW | 부재 · 인접 = `'pending'`(Mapping.php:210 INSERT 리터럴) — **IN_REVIEW/APPROVAL_PENDING 미분화** | `NOT_APPLICABLE` |
| 3 | WAITING_FOR_HUMAN | WAITING_FOR_DECISION | APPROVAL_PENDING | 부재 · 인접 = `'pending'` 단일값이 #2와 #3을 **동시에 의미** | `NOT_APPLICABLE` |
| 4 | WAITING_FOR_EVENT | IN_PROGRESS | IN_REVIEW | 부재 — 🔴 이벤트 구독 기전 grep 0 · 인접 = `journey_enrollments.wait_until`(JourneyBuilder.php:80-82 · **마케팅 도메인**) | `KEEP_SEPARATE_WITH_REASON` |
| 5 | PAUSED | PAUSED | APPROVAL_PENDING 또는 IN_REVIEW | 부재(승인) · 인접 = `ad_spend_ledger` `'charging'`/`'reconciling'`(BillingMethod.php:451,:554) — **진행중 고착 상태**(도메인 상이) | `NOT_APPLICABLE` |
| 6 | COMPLETED-APPROVED | APPROVED | APPROVED | 부분 존재 — `'approved'`(Mapping·AdminGrowth:1155·Catalog:2341·FeedTemplate:273) · **3열 구분 없이 단일 문자열** | `LEGACY_ADAPTER`(어휘만 정합) |
| 7 | COMPLETED-CONDITIONAL | CONDITIONALLY_APPROVED | CONDITIONALLY_APPROVED | 🔴 **부재** — 조건부 승인 개념 전무(grep 0) | `NOT_APPLICABLE` |
| 8 | COMPLETED-REJECTED | REJECTED | REJECTED | 부분 존재 — `'rejected'`(AdminGrowth::approvalDecide :1330) · 🔴 단 `Alerting::executeAction` 은 **rejected 도 실집행**(:612 죽은 읽기 → :631/:634) | `LEGACY_ADAPTER`(어휘만 · 집행 게이트 결함) |
| 9 | COMPLETED-CHANGES | CHANGES_REQUIRED | CHANGES_REQUIRED | 🔴 **부재** — 변경요청 개념 전무(grep 0) · 현행은 승인/거부 **2치**뿐 | `NOT_APPLICABLE` |
| 10 | CANCELLED | CANCELLED | CANCELLED | 부재(승인 축) · 인접 = 주문 취소 축(OrderHub · 286차 취소제외 술어 · **도메인 상이**) | `KEEP_SEPARATE_WITH_REASON` |
| 11 | FAILED | FAILED | FAILED | 부재(승인 축) · 인접 = `status='failed'` 잔류 관행(DLQ 미분리 · AdAdapters:1223) | `LEGACY_ADAPTER` |
| 12 | BLOCKED | BLOCKED | BLOCKED | 부재 · 인접 실자산 = `AdAdapters::executionEnabled`(:34-40 · 9곳 실배선) | `VALIDATED_LEGACY`(차단 프리미티브) |
| 13 | SUPERSEDED | SUPERSEDED | SUPERSEDED | 부재(승인) · 인접 = `FeedTemplate::publishDraft` 이전 published → **archived**(:276-287) = **대체 개념의 유일 선례**(도메인 상이) | `LEGACY_ADAPTER`(패턴 선례) |

**실측 개수: 13 / 13 전사.** 커버리지 = 부재 8 · 어댑터 4(어휘/패턴만) · 확장 1.
**★현행 상태 어휘 실측: `pending`·`approved`·`rejected`·`failed` 4종이 전부.** 원문 13행이 요구하는 상태는 3열 × 13행이며, 현행은 **1열(문자열 하나)로 뭉개진 4값**이다. #6·#8·#11이 "부분 존재"인 것은 **어휘가 겹칠 뿐 3열 구분이 없기 때문**이며, 이를 커버로 계산하면 역산이다.

## 2. 규칙

- 🔴 **§63의 결론: 상태머신이 없다.** `UPDATE ... SET status=` **155건/44파일** vs **전이 규칙 선언 0**(전부 호출지점 인라인) · 전이 가드 **4곳뿐**. **매핑할 정본 상태집합 자체가 선언돼 있지 않으므로, §63은 "기존 매핑을 정리"하는 작업이 아니라 "정본을 최초로 선언"하는 작업이다.**
- 🔴 **Mapping은 하드코딩된 단일 Enum 변환이 아니라 Versioned Mapping Registry 또는 명시적 Contract로 관리하라**(원문 명시). 현행 `status VARCHAR(20)` 자유 문자열(AdminGrowth.php:146) 관행을 그대로 답습하면 오타가 곧 무검출이다.
- 🔴 **전이 가드 4곳을 "상태머신 있음"의 근거로 삼지 마라.** `FeedTemplate::transition` 은 from/to 를 **호출자에게서 인자로 받는다**(:249 시그니처 · :267/:273 호출부) — 합법 전이 집합을 알지 못한다. **가드 ≠ 선언.**
- 🔴 **매핑표 선언만으로 완료 선언 금지.** 상태 쓰기 155건 중 **151건이 가드를 거치지 않는다**. 매핑을 강제할 위치(단일 전이 함수)를 확보하지 않으면 매핑은 문서로만 존재한다. → 승인 축 상태 쓰기는 **전이 함수 1곳을 경유**하도록 하고, 기존 151개 인라인 쓰기는 **비-승인 도메인이므로 건드리지 마라**(무후퇴 원칙 · 286차 rank 맵 붕괴 재현 금지).
- 🔴 **#7 CONDITIONAL · #9 CHANGES_REQUIRED 가 최대 결번.** 현행 승인은 **approved/rejected 2치**뿐이다. 조건부 승인·변경요청은 grep 0 = 개념 자체가 없다. 이 둘의 도입은 §61/§62 대사 상태(#4 `INSTANCE_CASE_STATUS_MISMATCH`)의 선결 조건이다.
- 🔴 **#8 REJECTED 는 어휘만 있고 게이트가 없다.** `Alerting::executeAction`(:612)이 status를 SELECT하고 **판독하지 않아** `rejected` 도 `AdAdapters::pause`(:631)/`updateBudget`(:634)을 실집행한다. **상태 매핑을 선언해도 이 경로가 남아 있으면 REJECTED 는 의미가 없다.** 현재 VACUOUS(생산자 0)이나 배선 시 즉시 활성 — **참조 구현 금지**(미수정·별도 세션).
- **#13 SUPERSEDED 의 유일 선례는 `FeedTemplate::publishDraft`**(:276-287 · 이전 published → archived). 승인 축에 도입 시 이 패턴을 인용하되 **피드 도메인 코드 재사용은 금지**(도메인 상이).
- **#12 BLOCKED 은 `AdAdapters::executionEnabled` 재사용 강제**(신규 차단 기전 금지). ⚠️ `pause()` 면제 = **279차 D-P1 의도된 설계** — 재플래그 금지.
- **SQLite 폴백 호환 제약 유지**(`Db.php` · 285차·286차 실측 대조 시). 상태 컬럼·레지스트리 설계에 MySQL 전용 타입(ENUM·CHECK 등) 도입은 제약 위반 — **VARCHAR + 애플리케이션 계약**으로 강제하라.
- 🔴 13행 **"있다고 가정"하고 배선 금지**.

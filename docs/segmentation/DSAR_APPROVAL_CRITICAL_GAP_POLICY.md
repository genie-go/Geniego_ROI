# DSAR — Critical Gap 정책 (§45)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> 기존 구현 실측: [DSAR_APPROVAL_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_EXISTING_IMPLEMENTATION.md)

## §1. 우선순위 원칙 — Gap 크기가 아니라 **운영영향 × 오신뢰**

1-6 D-5 계승: **가장 큰 Gap 이 가장 급한 Gap 이 아니다.**

> **`REBATE_*` 전면 부재(코드 0줄)가 06-A 최대 Gap 이자 최하위 우선순위**다 — **없는 것은 오작동하지 않는다.**
> 반면 **`Alerting` 계열은 "승인이 있다"고 믿게 하면서 승인을 집행하지 않는다** — 크기는 작고 위험은 크다.

**★도달성(reachability)을 등급에 반영한다**(1-8 E-03 `VACUOUS` · 289차 G-02 선례):
코드 결함이 실재해도 **생산자/호출자가 0이면 현재 도달 불가**다. **`VACUOUS` 는 "괜찮다"가 아니라 "아직 안 터졌다"**이며,
**배선되는 순간 등급이 올라간다** — 그러므로 **노출 전에 고치는 것이 가장 싸다**(289차 G-01 실증: 운영 api_key 0 시점에 수정).

## §2. 스펙 §45 Critical Gap 후보 — 현행 실측 판정

| # | 스펙 §45 항목 | 현행 실측 | 등급 |
|---|---|---|---|
| 1 | Request Tenant ↔ Resource Tenant 불일치 | `admin_growth_approval` **tenant_id 없음** · `approvals` 전역 조회(AdminGrowth.php:1299-1310) | 🔴 **HIGH** |
| 2 | Request Legal Entity ↔ Financial Resource 불일치 | **Legal Entity 레지스트리 부재**(grep 0) → **판정 불가** | 🟠 `UNVERIFIED` |
| 3 | Approval 없이 Program Activation | `REBATE_*` 코드 0 → **대상 부재** | 🟢 `NOT_APPLICABLE` |
| 4 | Approval 없이 Funding Allocation 변경 | 동상 · `/v384/budget/requests/{id}/approve` = **팬텀 501**(routes.php:1868) | 🟢 `NOT_APPLICABLE`(단 팬텀 = 표시≠실제) |
| 5 | Approval 없이 Settlement·Payout 실행 | `orderhub_settlements.status='pending'` 등은 **파이프라인 상태값**(approve 핸들러 grep 0) — 승인 개념 자체가 없음 | 🟠 **설계 Gap**(오탐 아님·§4 주의) |
| 6 | **Requester == Approval Actor 인데 근거 없음** | `Mapping` **차단됨(403·289차)** · 🔴 `Alerting`·`AdminGrowth`·`Catalog` **차단 없음** | 🔴 **HIGH**(3도메인) |
| 7 | 승인자 Role·Scope 가 Decision 시점에 무효 | **Role Version/Assignment Scope 부재**(grep 0) → **결정 시점 고정 불가** | 🔴 **HIGH**(§4.6 미충족) |
| 8 | 승인 후 Critical Field 변경 | **감지 로직 부재**(grep 0) | 🟠 **설계 Gap** |
| 9 | 승인 Amount 초과 실행 | **Amount 개념 부재** — `action_json` **JSON blob**(Db.php:592-600)에 승인/실행 대조 구조 없음 | 🟠 **설계 Gap** |
| 10 | 승인 Currency ↔ 실행 Currency 불일치 | 동상. `fxToKrw`(Connectors.php:1749) 는 존재하나 **승인 도메인 미연결** | 🟠 **설계 Gap** |
| 11 | 승인되지 않은 Resource Version 실행 | **Version 개념 부재**(grep 0) | 🟠 **설계 Gap** |
| 12 | **Cancelled·Withdrawn·Expired Approval 사용** | 🔴 **`Alerting::executeAction`(:601-660) 이 `status` 미판독**(:612 죽은 읽기) → `pending`·`rejected` 도 `AdAdapters::pause`(:631)/`updateBudget`(:634) **실집행** | 🔴 **P1 · `VACUOUS`**(생산자 `INSERT INTO action_request` **grep 0**) |
| 13 | Single-use Approval 재사용 | **Consumption/잔여횟수 개념 부재**(grep 0) | 🟠 **설계 Gap** |
| 14 | 중복 Payout Approval Request | **Idempotency 부재**(승인측) · 유일 유사물 = `AdminGrowth.php:1292` ref pending 재사용 | 🟠 **설계 Gap** |
| 15 | Decision Evidence 누락 | `audit_log`(Db.php:540-546) — **tenant_id 없음 · 해시체인 없음** · Reason 저장 부재 | 🟠 **MEDIUM** |
| 16 | Approval Policy Version 누락 | **Policy Version 부재**(grep 0) · `PlanPolicy` = PHP const(버전 없음) | 🟠 **설계 Gap** |
| 17 | Cross-Tenant Case 병합 | **Case 개념 부재** → 병합 자체가 없음. 단 `admin_growth_approval` 전역 조회는 **사실상 cross-tenant 노출** | 🔴 **HIGH**(#1과 동일 근원) |
| 18 | 다른 Legal Entity Payout Case 무분별 병합 | Legal Entity 부재 → **판정 불가** | 🟠 `UNVERIFIED` |
| 19 | **Service Account 가 Human Financial Approval 수행** | **actor_type 구분 자체가 부재**(grep 0) — `Mapping::actorId` 도 `apikey:`/`user:` 접두로 **구분은 가능하나 강제는 없음** | 🟠 **설계 Gap** |
| 20 | **기존 Decision 덮어쓰기** | 🔴 **전 도메인** — `UPDATE ... SET status=?`(Alerting.php:653 · AdminGrowth.php:1313-1343 · Catalog.php:2341-2364) | 🔴 **HIGH**(§4.9 위배) |
| 21 | Approval Reconciliation Critical Drift | 🔴 **실존 2건**: `required_approvals:2` 리터럴(Alerting.php:562) vs 미집행 · **팬텀 승인 라우트 501**(routes.php:1868,1943…) | 🔴 **HIGH**(표시≠실제) |

## §3. 등급 요약

| 등급 | 건수 | 비고 |
|---|---|---|
| 🔴 HIGH/P1 | **6** (#1·#6·#7·#12·#17·#20·#21 중 근원 통합 시) | **전부 기존 시스템 결함** — Rebate 아님 |
| 🟠 설계 Gap / MEDIUM / UNVERIFIED | **13** | 스펙 요구 대비 부재(신설 대상) |
| 🟢 NOT_APPLICABLE | **2** | 대상 엔티티 부재 |

> ★**본 블록의 실제 산출도 선행 9블록과 동일하다 — Rebate 설계가 아니라 기존 시스템 결함 발견.**
> HIGH 6건은 **전부 이미 운영 중인 코드**의 문제이며 **Rebate 와 무관하게 존재**한다.

## §4. 오탐 주의 (FP 레지스트리 규칙)

- 🔴 **`orderhub_claims.status='pending'` · `orderhub_settlements.status='pending'` · `pg_settlement` 을 "승인 누락"으로 신고 금지** — **처리 파이프라인 상태값**이지 승인 상태가 아니다(approve 핸들러 grep 0). #5 는 "승인이 없다"가 아니라 **"승인 개념이 설계되지 않았다"**로 읽어야 한다.
- 🔴 **`TeamPermissions::ACTIONS` 의 `'approve'`(TeamPermissions.php:39)를 "권한 체계 있음"의 근거로 인용 금지** — **검사 호출부 grep 0 = 데이터만 있는 고아**(289차 ① `guard_headerless_getjson` 과 동일 클래스: **존재 ≠ 실효**).
- 🔴 **PM 코드 재증명 전 P0 단정 금지.** #12 는 289차에 `executeAction` 코드를 직접 읽어(`:612` SELECT · 이후 미판독) **재증명 완료**했고, 도달성(`INSERT` grep 0)까지 확인해 **P1 · `VACUOUS`** 로 확정했다.

## §5. 규칙

**본 블록 수정 0.** HIGH 6건은 **별도 승인 세션**(사용자 결정 · 289차) — 본 블록은 **비파괴 계약**이다.
**`VACUOUS` 를 해소로 읽지 말 것** — `Alerting::executeAction` 은 **생산자가 배선되는 순간 P1 활성**이 된다.
**`UNVERIFIED` 를 양호로 읽지 말 것**(1-6 D-4) — **모름은 양호가 아니다.**

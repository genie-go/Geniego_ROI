# DSAR — Approval Decision Condition (§25·조건 17 · 필드 12)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거**: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §25 — 원문 그대로 전사.
> **분모 정합**: 조건 — REQ 17 ↔ **원문 실측 17 일치**.
> 🔴 **분모 불일치**: 필드 — **REQ 집계 11 ↔ 원문 실측 12 — 원문이 정본.** REQ §7 의 `11` 은 정정 대상.

## 0. 현행 실측 (file:line)

| 항목 | 현행 | 분류 |
|---|---|---|
| **Conditional Approval** | **전면 부재**(`approval_decision_condition` grep 0) — 승인은 **무조건 승인 1종**뿐 | **NOT_APPLICABLE(부재→신설)** |
| 조건부 결정 종류 | `Alerting::decideAction:593` — `approve` 아니면 **전부 `rejected`**(3의 여지 없음) · `AdminGrowth::approvalDecide:1321` — `['approved','rejected']` **2종 화이트리스트** | **MIGRATION_REQUIRED** |
| 승인 시 조건 기록 | `Mapping::approve:285` — `approvals_json[] = {user, ts}` **2필드** · 조건 슬롯 없음 | **MIGRATION_REQUIRED** |
| 조건 **평가** 엔진 유사물 | `RuleEngine` `Handlers/RuleEngine.php:34,107,120` — `METRICS`/`OPS`/`ACTIONS`(alert·webhook·pause_channel·reorder) **화이트리스트 + 검증** | **CANONICAL 참조**(조건 평가 선례 · **승인 도메인 아님**) |
| 조건 미충족 시 집행 차단 | **부재** — 조건 자체가 없으므로 차단 대상도 없음 | **NOT_APPLICABLE** |
| 🔴 유사 위험 | `Alerting::executeAction:612` status **미판독** — **무조건 승인조차 검사 안 함**. 조건부 승인을 얹기 전 **선행 결함** · `INSERT INTO action_request` grep 0 → **VACUOUS** | **승인 우회**(도달 불가) |

**핵심**: §62 완료보고 **19 Condition 수**·§63 **17 Conditional Condition** 은 현행 집계 시 **전부 0** — 부재이지 미측정이 아니다.

## 1. 조건 17 · 필드 12

`APPROVAL_DECISION_CONDITION`

### 1-1. 지원 조건 — 원문 전사 (실측 17 · REQ 17 **일치**)

| # | 조건 | # | 조건 |
|---|---|---|---|
| 1 | `MAX_AMOUNT` | 10 | `REQUIRE_EVIDENCE` |
| 2 | `MIN_AMOUNT` | 11 | `REQUIRE_CONTRACT` |
| 3 | `ALLOWED_CURRENCY` | 12 | `REQUIRE_BUDGET` |
| 4 | `ALLOWED_SCOPE` | 13 | `REQUIRE_FUNDING` |
| 5 | `ALLOWED_ACTION` | 14 | `REQUIRE_NOTIFICATION` |
| 6 | `RESOURCE_VERSION_MATCH` | 15 | `REQUIRE_MONITORING` |
| 7 | `EXECUTE_BEFORE` | 16 | `REQUIRE_POST_REVIEW` |
| 8 | `EXECUTE_AFTER` | 17 | `CUSTOM` |
| 9 | `REQUIRE_SECOND_APPROVAL_REFERENCE` | | |

**현행 커버리지 = 17 중 0종.** §0 실측대로 Conditional Approval 자체가 부재.
원문 대조로 추가 확정: **#6 `RESOURCE_VERSION_MATCH`** 는 §31 Critical Field 정책과 동일 축이며 현행 `resource_version` **grep 0** 이므로 **평가 불가**,
**#9 `REQUIRE_SECOND_APPROVAL_REFERENCE`** 의 재료(`required_approvals` · `Mapping.php:288`)는 **존재하나 조건이 아니라 행 컬럼**이므로 산입 불가.

### 1-2. 필수 필드 — 원문 전사 (실측 12)

| # | 필드 | # | 필드 |
|---|---|---|---|
| 1 | `decision_condition_id` | 7 | `valid_from` |
| 2 | `approval_decision_id` | 8 | `valid_to` |
| 3 | condition type | 9 | consumed 여부 |
| 4 | operator | 10 | satisfied 여부 |
| 5 | expected value | 11 | failure effect |
| 6 | actual evaluation source | 12 | `evidence` |

> 🔴 **필드 원문 실측 12 ↔ REQ 집계 11 — 원문이 정본.** 숫자를 조용히 맞추지 않는다.
> 원문 **#9 consumed · #10 satisfied 분리**는 본 문서 §2 의 "조건 미평가 상태를 충족으로 기록 금지"(가짜녹색) 가 **원문 필드 축으로 뒷받침됨**을 보인다 — 미평가(satisfied 미정)와 소비(consumed)는 별개 축이다.

확정 가능한 구조적 요구(§61 "Conditional Condition·Obligation 지원" 에서 직접 도출):
- Condition 은 **Decision 행에 종속**(§22) — Decision 부재 시 **선행 구현 불가**. 순서: Decision → Condition.
- Condition 은 **집행 전 검증 가능(machine-evaluable)** 해야 한다 — 자유문자열 조건은 §61 게이트를 만족 못함.
- Condition 미충족 → **집행 차단**(fail-closed). 조건부 승인을 **무조건 승인으로 흡수 금지**.

## 2. 규칙

- **§25 원문 17종·필드 12 가 정본** — 전사 완료(위 §1). 항목명 변경·추가·삭제 금지.
- **`RuleEngine` 화이트리스트+검증 패턴 재사용**(`RuleEngine.php:120`) — 신규 조건 평가기 신설 금지(Golden Rule = Extend). 단 **RuleEngine 은 알림 도메인**이므로 **승인 조건을 거기에 밀어넣지 말 것**(중복 인텔리전스 금지 ≠ 도메인 혼입).
- **Conditional = Obligation 동반 필수**(§26) — 조건만 있고 이행 의무가 없으면 조건은 **장식**이다.
- **조건 미평가 상태를 "충족" 으로 기록 금지**(가짜녹색 · 287/288차 클래스).
- **선행 결함 우선**: `Alerting::executeAction:612` 가 status 조차 안 읽는 상태에서 Condition 게이트를 얹으면 **우회 경로가 그대로 남는다**. 단 VACUOUS 이므로 **생산자 배선 결정이 선행**(287차 죽은 스켈레톤 회피).
- 실 구현 = **별도 승인 세션**. 본 문서는 코드변경 0.

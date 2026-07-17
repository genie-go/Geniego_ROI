# DSAR — Approval Decision Condition (§25·조건 17 · 필드 11)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

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

## 1. 조건 17 · 필드 11

스펙 §25 의 **원문 항목명 저장소 미영속**(REQ 는 개수 `17`/`11` 만 고정 · 나열 부재) → **UNVERIFIED**.
**17종 조건명 창작 금지**(REQ §15 역산). 스펙 §25 원문 수령 시 채운다.

확정 가능한 구조적 요구(§61 "Conditional Condition·Obligation 지원" 에서 직접 도출):
- Condition 은 **Decision 행에 종속**(§22) — Decision 부재 시 **선행 구현 불가**. 순서: Decision → Condition.
- Condition 은 **집행 전 검증 가능(machine-evaluable)** 해야 한다 — 자유문자열 조건은 §61 게이트를 만족 못함.
- Condition 미충족 → **집행 차단**(fail-closed). 조건부 승인을 **무조건 승인으로 흡수 금지**.

## 2. 규칙

- **조건명 열거형 창작 후 정본화 금지** — 스펙 §25 원문 수령 후 채운다.
- **`RuleEngine` 화이트리스트+검증 패턴 재사용**(`RuleEngine.php:120`) — 신규 조건 평가기 신설 금지(Golden Rule = Extend). 단 **RuleEngine 은 알림 도메인**이므로 **승인 조건을 거기에 밀어넣지 말 것**(중복 인텔리전스 금지 ≠ 도메인 혼입).
- **Conditional = Obligation 동반 필수**(§26) — 조건만 있고 이행 의무가 없으면 조건은 **장식**이다.
- **조건 미평가 상태를 "충족" 으로 기록 금지**(가짜녹색 · 287/288차 클래스).
- **선행 결함 우선**: `Alerting::executeAction:612` 가 status 조차 안 읽는 상태에서 Condition 게이트를 얹으면 **우회 경로가 그대로 남는다**. 단 VACUOUS 이므로 **생산자 배선 결정이 선행**(287차 죽은 스켈레톤 회피).
- 실 구현 = **별도 승인 세션**. 본 문서는 코드변경 0.

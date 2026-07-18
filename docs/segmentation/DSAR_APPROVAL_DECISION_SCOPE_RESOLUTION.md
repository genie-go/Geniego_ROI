# DSAR — Approval Decision Scope Resolution (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§20 SCOPE_RESOLUTION** — Scope 축:
Tenant / Domain / Workflow / Chain / Stage / Level / Step / Resource Type / ID / Action Type / Organization / Legal Entity / Geography / Amount / Currency / Risk / Decision Round / Group Reference.

## 2. 기존 구현 대조

승인 명령의 **적용 범위(scope)를 계산·검증하는 계층이 존재하지 않는다.** 4핸들러는 Action Type(approve/reject enum) 정도만 화이트리스트로 검사하고, Workflow/Chain/Stage/Level/Step·Amount/Currency·Legal Entity/Org·Risk·Decision Round 같은 범위 축을 해석하지 않는다. Tenant 는 격리 목적으로만 존재한다.

| 계약 축 | 현행 실존 | 근거(허용목록) |
|---|---|---|
| Tenant | 존재(격리용) | Tenant Guard(index.php·49핸들러 WHERE tenant_id) · `Mapping::tenantId` |
| Action Type | 부분 존재(enum) | `AdminGrowth::approvalDecide` enum `:1321` · `Alerting::decideAction :594`(approve/reject) |
| Workflow / Chain / Stage / Level / Step | **부재** | §3.1 Approval ABSENT · §3.5 Sequential ABSENT |
| Resource Type / ID · Action Scope | **부재** | no hits |
| Organization / Legal Entity / Geography | **부재** | §3.6 Org/Legal Entity ABSENT |
| Amount / Currency / Risk | **부재** | no hits |
| Decision Round / Group Reference | **부재** | no hits |

Tenant 격리와 Action enum 은 존재하나, 그것은 §20 이 요구하는 **다축 Scope Resolution** 이 아니라 격리·입력검증 각각 1축의 부분물이다.

## 3. 판정

- **Verdict: ABSENT** — Scope Resolution 계층 전무. Tenant(격리)·Action Type(enum) 만 부분 존재. Workflow/Chain/Stage/Level/Step·Amount/Currency·Legal Entity/Org·Risk·Decision Round 는 0.
- **선행 의존**: §3.1 Approval(Workflow/Chain/Stage)·§3.5 Sequential(Step/Round)·§3.6 Identity(Org/Legal Entity) — 모두 ABSENT. Scope 가 해석할 상위 구조 부재.
- **cover: 0** (Scope Resolution 기준). Tenant·Action enum 은 인접 부분물.

## 4. 확장/구현 방향 (설계)

- Scope Resolution 을 **Target Resolution(§19) 직후 파이프라인 단계로 신설** — Canonical Target 이 결정되면 그 Domain/Workflow/Chain/Stage/Level/Step·Amount/Currency·Legal Entity/Org·Risk·Decision Round 를 계산해 이후 Guard(§24: AMOUNT_WITHIN_LIMIT·CURRENCY_ALLOWED·ACTION_ALLOWED·LEGAL_ENTITY_MATCH)에 공급.
- **Tenant 격리는 정본 재사용**(Tenant Guard·`Mapping::tenantId`) — Scope 의 Tenant 축은 신규 로직 없이 미들웨어 산출값을 채택.
- **선행 의존**: Workflow/Chain/Stage(§3.1)·Sequential Step/Round(§3.5)·Legal Entity/Org(§3.6) 신설이 선행 — 그 전에는 Scope 를 Tenant+Action 2축 이상으로 확장 불가(BLOCKED_PREREQUISITE).
- Amount/Currency Scope 는 §55 Monetary Precision·§24 AMOUNT_WITHIN_LIMIT 게이트와 함께 설계 — 승인 한도 초과를 fail-closed 로 차단하는 자리.
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_TARGET_RESOLUTION]] · [[DSAR_APPROVAL_DECISION_ELIGIBILITY]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].

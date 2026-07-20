# DSAR — Approval Dynamic Role Drift (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Dynamic Role Drift · 스펙 §24)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scoped Role(Part 3-4)·Dynamic Role Registry/Rule Engine(본 Part 본체) 실 구현 부재
- **불변**: Drift는 비파괴 신호원(자체 수정 금지) · UNKNOWN Permit 금지(ADR D-2) · 마케팅 drift(ML/광고/재고 도메인) 오흡수 금지(KEEP_SEPARATE·ADR D-4) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §24(Drift) = "Rule Drift · Context Drift · Projection Drift · Policy Drift" — 배포·확정된 Rule/Context/Projection/Policy 상태가 이후 변경과 불일치하는 조건을 정형 탐지한다. Drift는 스스로 상태를 수정하지 않으며(무후퇴), §25 Revalidation의 트리거 신호원으로만 작동한다(§31 Warning Contract "Rule Drift · Context Drift").

- **순신규 총평**: Rule Engine·Runtime Context(role 결정 미연결)·Dynamic Projection 자체가 ABSENT/근접-미연결(EXISTING_IMPLEMENTATION §2,§5)이므로 비교 대상 자체가 성립하지 않는 축이 다수.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | drift id | Drift PK |
| 2 | rule id / context id / projection id / policy id | 대상 |
| 3 | drift type | §3 열거형(스펙 §24 원문) |
| 4 | previous digest | 이전 상태 다이제스트(§33 Digest Validation) |
| 5 | current digest | 현재 상태 다이제스트 |
| 6 | affected subject | 영향받는 subject/session |
| 7 | severity | 심각도 |
| 8 | revalidation required | §25 트리거 연동 |
| 9 | detected at | 탐지 시각 |
| 10 | status | Drift 상태 |

## 3. 열거형 (Drift Type — 스펙 §24 원문 그대로)

`Rule Drift` · `Context Drift` · `Projection Drift` · `Policy Drift`

## 4. 실 substrate 매핑 (ABSENT/근접)

| Drift Type | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| Rule Drift | RBAC Rule Engine 자체 ABSENT(`RuleEngine.php`는 마케팅 KEEP_SEPARATE) | `RuleEngine.php:12,24,32,34,194-220` | **ABSENT** — 비교할 Rule Version 자체 없음. 마케팅 RuleEngine 조건 변경(있다면)은 channel_roas/sku_stock 대상, RBAC 무관(KEEP_SEPARATE) |
| Context Drift(근접) | Runtime Context 기록(session/ip/ua)이 표시용으로만 존재 | `Db.php:1111-1119`·`UserAuth.php:4237,4243-4281` | 근접(context 데이터 저장은 실재)이나 role 결정 미연결(EXISTING_IMPLEMENTATION §5) → 비교해도 role 영향 산출 불가 |
| Projection Drift | Dynamic Permission/Scope/Constraint Projection ABSENT(ADR §3) | — | **ABSENT** |
| Policy Drift(근접) | 정적 rank 4곳(TeamPermissions/index.php/PlanPolicy/AdminMenu) 무통합 산재 | `TeamPermissions.php:236-322,366-394`·`index.php:572-598,82-89`·`PlanPolicy.php:19-22`·`AdminMenu.php:337-356` | 근접(정책값 자체는 실재)이나 버전 관리·변경 이력 diff 없음(DUPLICATE_AUDIT D-2) — 상수/정적 배열 하나만 존재 |

★마케팅 drift(ML 모델 드리프트·재고/광고 자동화 드리프트 등)는 본 편이 정의하는 RBAC Rule/Context/Projection/Policy Drift와 명명만 유사·대상 도메인(ML/광고/재고) 전혀 다름 — **KEEP_SEPARATE**(ADR D-4·DUPLICATE_AUDIT D-1 동형 논리 적용). `AutoCampaign.php`는 `RuleEngine.php`와 소유권을 명시적으로 분리(`AutoCampaign.php:14-15,222-226`).

## 5. 설계 원칙

- Policy Drift는 정적 rank 4곳(`TeamPermissions.php:236-322,366-394`·`index.php:572-598,82-89`·`PlanPolicy.php:19-22`·`AdminMenu.php:337-356`)이 단일 Policy Decision Point로 수렴(ADR D-1 CONSOLIDATION)된 이후에야 "하나의 policy 상태"를 비교할 수 있다 — 통합 선행.
- Context Drift는 Runtime Context(§5)가 role 결정 입력으로 연결(ADR D-1 CONTEXT_ATTRIBUTE)된 이후에야 drift의 "role 영향"을 계산할 수 있다.
- Rule Drift/Projection Drift는 대상 substrate 자체가 없어 Rule Engine·Projection이 먼저 신설되어야 한다(이중 BLOCKED_PREREQUISITE).
- previous/current digest(필드 4,5) = 참조 편 `DSAR_APPROVAL_DYNAMIC_ROLE_DIGEST` 선행 신설 대상.

## 6. Gap / BLOCKED_PREREQUISITE

- Rule Drift/Projection Drift = 완전 ABSENT(선행 substrate 자체 없음).
- Context Drift/Policy Drift = 근접 substrate 존재하나 diff/버전 비교 로직 ABSENT.
- 마케팅 automation drift(ML/광고/재고)는 KEEP_SEPARATE — RBAC Drift로 오흡수 금지.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Dynamic Role Registry/Rule Engine 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.

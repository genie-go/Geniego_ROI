# DSAR — Approval Role Compatibility (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Compatibility)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule · Cycle 금지·Scope Intersection·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조

## 1. 목적

Role Compatibility는 스펙 §20이 정의하는 `APPROVAL_ROLE_COMPATIBILITY` 엔티티로, 두 Role이 여러 축(Dimension)에서 결합 가능한지를 판정한다. 핵심 원칙은 **Unknown을 자동 Compatible로 처리 금지**(§20 원문) — 판정 불가 상태는 안전측(비허용 또는 수동 검토)으로 처리해야 한다.

## 2. Canonical 필드

스펙 §20은 **Compatibility Dimension·Result 두 축의 값공간만 명시**하고, §17(Dependency)·§18(Conflict)·§19(Exclusion)처럼 별도 "필수 필드:" 목록을 제공하지 **않는다**. 아래는 형제 엔티티(Dependency/Conflict/Exclusion)의 필드 패턴 및 §7 Canonical Entity 목록의 `APPROVAL_ROLE_COMPATIBILITY`와 구조적으로 동형이 되도록 **구조적으로 유추한 최소 구성**이며, 스펙이 명시적으로 열거한 필드가 아님을 명확히 한다:

| 필드(구조적 유추) | 의미 |
|---|---|
| `compatibility_id` | 식별자(PK) |
| `source_role_definition_id` / `source_role_version_id` | 판정 대상 A |
| `target_role_definition_id` / `target_role_version_id` | 판정 대상 B |
| `dimension` | §3 Compatibility Dimension |
| `result` | §3 Result |
| `evaluation_context_reference` | Dimension별 평가 근거(선택) |
| `resolution_policy_reference` | `MANUAL_REVIEW_REQUIRED`/`INCOMPATIBLE` 시 처리 정책 |
| `valid_from` / `valid_to` / `status` / `immutable_digest` / `evidence` | 공통 거버넌스 필드(형제 엔티티 §17~19 패턴과 동형) |

## 3. 열거형 / 타입

- **Compatibility Dimension**(§20 원문): `TENANT` · `REGISTRY` · `DOMAIN` · `ACTOR_TYPE` · `ROLE_TYPE` · `PERMISSION` · `SCOPE_REQUIREMENT` · `RISK` · `CRITICALITY` · `LIFECYCLE` · `VALIDITY` · `ASSIGNMENT_POLICY` · `DELEGATION_POLICY` · `IMPERSONATION_POLICY` · `CUSTOM`.
- **Result**(§20 원문): `COMPATIBLE` · `COMPATIBLE_WITH_RESTRICTIONS` · `INCOMPATIBLE` · `MANUAL_REVIEW_REQUIRED` · `UNKNOWN`. **`UNKNOWN`을 자동 `COMPATIBLE`로 처리 금지**(§20 원문 명시 규칙).

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| Role Compatibility(다축 판정) | **ABSENT** | 전수조사 §4: "Role Conflict / Exclusion / Dependency / **Compatibility**(SoD 방향) = 전무" |
| `TENANT` Dimension 관련 근접 맥락(참조 대상 아님) | 참조 아님·맥락만 | 중복감사 D-2: 5 role 어휘(team_role/api_key role/admin_level/AdminMenu ROLE_ENUM/plan)가 "통합 Namespace 없이 공존" — 이는 Compatibility 판정의 **필요성**을 보여주는 맥락일 뿐, Compatibility 판정 자체의 substrate가 아님(오인용 금지) |

★근접 substrate 없음. 전수조사 §5 근접 패턴 표 7종 중 다축 호환성 판정에 대응하는 항목 없음.

## 5. 설계 원칙

1. **Unknown ≠ Compatible**(§20 원문 최우선 규칙) — 판정 미완료/근거 부족 상태를 안전측(Manual Review 또는 Incompatible)으로 처리.
2. **다축 독립 판정** — 14개 Dimension은 서로 독립적으로 평가되며 하나의 단일 Boolean으로 뭉개지 않는다(예: PERMISSION은 Compatible이나 ACTOR_TYPE은 Incompatible일 수 있음).
3. **Compatibility ≠ Conflict/Exclusion** — Compatibility는 "결합 판정 결과의 다축 평가"이고, Conflict(§18)/Exclusion(§19)은 그 판정의 특정 부정적 결과에 대한 별도 엔티티(Critical 발견 시 격상). 세 엔티티는 서로 참조 가능하되 대체 불가.
4. **§7 정의는 있으나 §20 필드 미열거 사실을 은폐하지 않음** — 본 문서 §2는 명시적으로 "구조적 유추"임을 표기(반날조 원칙 — 스펙이 정의하지 않은 것을 정의한 것처럼 서술 금지).
5. **Golden Rule** — 5 role 어휘 산재(중복감사 D-2)는 Compatibility 판정의 배경 문제이지 substrate가 아니므로, 이를 "Compatibility 구현 근거"로 오인용하지 않는다.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Compatibility 판정 실 로직(14 Dimension × 5 Result)은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 필요. 본 차수 코드 0.
- **Gap-1(ABSENT)**: `APPROVAL_ROLE_COMPATIBILITY` 테이블·Dimension/Result enum·Unknown 안전측 처리 로직 전부 순신설.
- **Gap-2**: 스펙 §20 자체가 §17~19 대비 필드 목록을 생략 — 실 구현 세션에서 필드 확정 필요(설계 갭으로 기록, 임의 보완 금지).
- **정직 부재**: 근접 패턴 없음(§4). 5 role 어휘 산재는 맥락일 뿐 substrate 아님(오인용 방지).
- **판정**: NOT_CERTIFIED · 실 엔진 = 별도 승인세션(RP-002).

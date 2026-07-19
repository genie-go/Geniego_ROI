# DSAR — Approval Composite Role Version (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Composite Role Version)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule · Cycle 금지·Scope Intersection·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조

## 1. 목적

Composite Role Version은 스펙 §22가 정의하는 `APPROVAL_COMPOSITE_ROLE_VERSION` 엔티티로, Composite Role 구성이 변경될 때마다 In-place Update가 아닌 **새 Version을 생성**하는 Versioned Graph 원칙(§6.5)을 Composite Role에 적용한다. 각 Version은 Component 스냅샷·Aggregation 결과(Permission/Deny/Scope/Risk)·Expansion 탐지 결과를 불변 기록한다.

## 2. Canonical 필드

`APPROVAL_COMPOSITE_ROLE_VERSION`(스펙 §22 필수 필드 원문):

| 필드 | 의미 |
|---|---|
| `composite_version_id` | 식별자(PK) |
| `composite_role_id` | 소속 Composite Role(§21) |
| `version_number` / `previous_version_id` | 순차 버전·이전 버전 참조(In-place Update 금지·§6.5) |
| `component_snapshot` | 전체 Component 스냅샷 |
| `mandatory_component_snapshot` / `optional_component_snapshot` / `excluded_component_snapshot` | 유형별 Component 스냅샷 |
| `actor_eligibility_snapshot` | Actor Eligibility 결과 스냅샷(§27) |
| `scope_policy_snapshot` / `permission_aggregation_snapshot` / `deny_aggregation_snapshot` / `risk_aggregation_snapshot` | 각 Aggregation 정책·결과 스냅샷(§25·§26·§28) |
| `conflict_result_snapshot` / `dependency_result_snapshot` | §18·§17 검증 결과 스냅샷 |
| `effective_permission_digest` / `effective_deny_digest` / `effective_scope_digest` | Digest(§54 Canonical Sorting 적용) |
| `risk_result` / `criticality_result` | 집계 결과 |
| `change_summary` | 변경 요약 |
| `scope_expansion_detected` / `permission_expansion_detected` | §42·§43 Expansion Guard 탐지 결과 |
| `manual_review_required` | 확대 탐지 시 강제 플래그 |
| `effective_from` / `effective_to` | 유효 기간 |
| `created_by` / `reviewed_by` / `approved_by` | 승인 체계 |
| `activated_at` / `superseded_at` | 활성/대체 시점 |
| `status` / `immutable_digest` / `evidence` | 공통 거버넌스 필드 |

## 3. 열거형 / 타입

- 스펙 §22는 Composite Role Version 전용 별도 `Version Type` enum을 명시하지 않는다(§10 Role Hierarchy Version의 `Version Type`: `INITIAL`·`NODE_ADD`·`NODE_REMOVE`·`EDGE_ADD`·`EDGE_REMOVE`·`EDGE_CHANGE`·`ROOT_CHANGE`·`DIRECTION_CHANGE`·`DEPTH_CHANGE`·`SCOPE_POLICY_CHANGE`·`PERMISSION_POLICY_CHANGE`·`DENY_POLICY_CHANGE`·`CONFLICT_POLICY_CHANGE`·`ACTOR_POLICY_CHANGE`·`SECURITY_HARDENING`·`CORRECTION`·`MIGRATION`·`DEPRECATION`은 Hierarchy Version 전용이며 §22 원문이 Composite Role Version에 그대로 재사용을 명시하지는 않음 — 혼동 방지를 위해 별도 enum 필요성을 Gap으로 기록(§6).
- **Expansion 상태값**: `scope_expansion_detected` / `permission_expansion_detected` = Boolean(§42·§43 Guard 결과). `True` 시 `manual_review_required=true` 강제(§6.16 Mandatory Control).
- **status 생명주기**(§49 원칙 재사용): Active → Deprecated → Retired(신규 Edge/Component 추가 금지 → Active Graph 제거).

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| Composite Role Version(불변 스냅샷·순차 버전) | **ABSENT → 신설** | Composite Role 자체가 부재(전수조사 §3) → Version 개념도 당연 부재 |
| 근접 Versioning 패턴(참조용·비-Role 도메인) | 참조만 · 오흡수 금지 | `menu_defaults`(snapshot_data·version·reset 롤백지점) `AdminMenu.php:119-122,295-311,583-589`(전수조사 §5 "Snapshot/baseline(role 아님)" 항목) — 메뉴 도메인의 버전 스냅샷 구조이지 Composite Role Version이 아님 |
| 근접 Evidence 패턴(★주의) | 참조만 · tamper-evident 아님 | `menu_audit_log` hash_chain(append만) `AdminMenu.php:123-131,169-219`(전수조사 §5) — **정본 append-only 해시체인은 `SecurityAudit::verify`뿐**([[reference_menu_audit_log_not_tamper_evident]]). Composite Role Version의 `evidence`/`immutable_digest` 설계 시 이 hash_chain을 tamper-evident 모델로 인용 금지 |

## 5. 설계 원칙

1. **In-place Update 금지**(§6.5 Versioned Graph) — Composite Role 구성 변경은 항상 새 `composite_version_id` 생성.
2. **Scope/Permission Expansion 탐지 시 Manual Review 강제**(§42·§43·§6.16) — Kill Switch 대상에서 제외 불가(비활성화 불가 Mandatory Control).
3. **Digest는 Canonical Sorting 적용**(§54 원칙 재사용) — 저장 순서 무관 동일 Digest.
4. **Evidence 무결성은 실재하는 tamper-evident 메커니즘만 인용**(`SecurityAudit::verify`) — `menu_audit_log`류 append-only-but-unverified 체인을 정본으로 오인용 금지(반날조 원칙 핵심 적용 사례).
5. **Golden Rule** — Composite Role 부재 위에 Version 개념도 순신설이나, 스냅샷/Version 관리라는 알고리즘 패턴 자체는 `menu_defaults`(비-Role 도메인)에서 참조 가능 — 대상(메뉴)을 Composite Role로 오흡수하지 않는 조건부.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Composite Role Version 실 스냅샷·Digest·Evidence 생성은 선행 Composite Role(§21) 실체 자체가 먼저 필요하며, 그 또한 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현에 종속. 본 차수 코드 0.
- **Gap-1(ABSENT)**: `APPROVAL_COMPOSITE_ROLE_VERSION` 테이블·Digest 3종(permission/deny/scope)·Expansion 탐지 로직 전부 순신설.
- **Gap-2**: §22 원문이 Composite Role Version 전용 Version Type enum을 별도 명시하지 않음 — §10 Hierarchy Version Type을 그대로 재사용할지 별도 정의할지는 구현 세션에서 결정 필요(임의 확정 금지).
- **정직 부재**: `menu_audit_log` hash_chain을 Evidence의 tamper-evident 근거로 사용하면 오탐 — 반드시 `SecurityAudit::verify` 계열과 구분.
- **판정**: NOT_CERTIFIED · 실 엔진 = 별도 승인세션(RP-002).

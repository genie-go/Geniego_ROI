# DSAR — Role Graph Cache Invalidation (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity 설계 · 스펙 §57)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 선행 Permission Engine(Part 2) + Role Registry(Part 3-1) + Decision Core 실 구현 후 별도 승인세션)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ) ground-truth**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **불변**: Role Hierarchy ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group(ADR §D-2·스펙 §6.1~6.3) · Golden Rule(Extend not Replace·중복 Graph/Resolver 신설 금지) · Historical Immutability(스펙 §6.15) · Cache Key는 Version+Tenant-aware 필수(스펙 §56)
- **반날조 규율**: 모든 `file:line`은 위 ADR·전수조사 2문서에서만 인용한다. 그 밖은 **ABSENT**. 폐기 `admin_roles`/`user_roles`(289차 P3) 재부활 금지 · 289차 P1~P4(writeGuard·featurePlan·admin폐기·resolveAdminByToken) 재플래그 금지.

---

## 1. 목적

Role Graph Cache Invalidation = §55~§56 Role Graph Cache가 stale 상태로 인가 판정에 사용되지 않도록, 무효화가 발생해야 하는 **즉시(synchronous) Trigger 목록**과 Tamper/Kill Switch에 의한 강제 무효화 경로를 설계 정본으로 정의한다(스펙 §57).

- **순신규**: Role Graph Cache 계층 자체가 ABSENT(본 편 상위인 `DSAR_APPROVAL_ROLE_GRAPH_CACHE` §6 Gap) → 무효화 대상도 전무.

## 2. Canonical 필드 (즉시 Trigger 목록 — 스펙 §57 원문 그대로)

| # | Trigger | 의미 |
|---|---|---|
| 1 | Role Version Activated | Role Definition 새 버전 활성화 |
| 2 | Role Suspended/Deprecated/Retired | Role 생명주기 상태 전이 |
| 3 | Hierarchy Version Activated | Hierarchy 새 버전 활성화 |
| 4 | Hierarchy Edge/Node Changed | Hierarchy 구조 변경 |
| 5 | Composite Version Activated | Composite 새 버전 활성화 |
| 6 | Composite Component Changed | Composite 구성 요소 변경 |
| 7 | Permission Version/Group Version/Bundle Version Changed | Permission 계열 버전 변경 |
| 8 | Permission Deny Changed | Deny 정의 변경 |
| 9 | Scope Requirement Changed | Scope 요구 변경 |
| 10 | Actor Eligibility Changed | Actor 자격 변경 |
| 11 | Role Conflict/Exclusion/Dependency Changed | 관계 메타데이터 변경 |
| 12 | Propagation Policy Changed | 전파 정책 변경 |
| 13 | Organization Hierarchy Changed Reference | 참조 중인 Organization Hierarchy 변경 |
| 14 | Tamper Detected | 변조 탐지 |
| 15 | Kill Switch Activated | 긴급 차단 스위치 작동 |

## 3. 열거형 / 타입

- **invalidation_scope**: `SINGLE_KEY` · `CACHE_TYPE` · `TENANT_WIDE` · `GLOBAL` — Trigger가 미치는 무효화 범위 축. 스펙 원문에 세부 열거값 미제시 → **설계 예약(미확정, 파생 축)**.
- **trigger_source**: `ROLE` · `HIERARCHY` · `COMPOSITE` · `PERMISSION` · `SCOPE` · `ACTOR` · `POLICY` · `ORG_REFERENCE` · `SECURITY` — 15개 Trigger를 발생 주체별로 분류한 파생 축(스펙 §57 목록을 재분류한 것이며 원문 열거형은 아님).

## 4. 실 substrate 매핑 (§5.2)

| Trigger | 실존 substrate | file:line | 판정 |
|---|---|---|---|
| Organization Hierarchy Changed Reference | `parent_user_id` 계정 위계 변경(추정 대상) | `UserAuth.php:176,316,423-426` | 실 substrate 존재 — **단, 이 substrate 자체가 Role Graph 안이라는 뜻 아님**(ADR §D-2·§6.1 오용 경계). Role Graph가 이 구조를 "참조"하고 있다면 그 변경도 무효화 대상이 된다는 의미일 뿐 |
| Organization Hierarchy Changed Reference(또다른 후보) | `menu_tree.parent_id` 메뉴 트리 변경 | `AdminMenu.php:108,117,268` | 상동 — Role Graph 밖 유지 원칙 재확인, 참조 변경 감지 대상으로만 인용 |
| Role Version Activated / Suspended·Deprecated·Retired | — | **ABSENT** | Role Version/Lifecycle 자체 순신규(Part 3-1 코드 0) |
| Hierarchy/Composite Version Activated·Edge/Node/Component Changed | — | **ABSENT** | Role Graph/Hierarchy/Composite 자체 순신규 |
| Permission Version/Group/Bundle/Deny Changed | — | **ABSENT** | Part 2 Permission Engine 코드 0 |
| Scope Requirement/Actor Eligibility Changed | — | **ABSENT** | 순신규 |
| Role Conflict/Exclusion/Dependency Changed·Propagation Policy Changed | — | **ABSENT** | 순신규 |
| Tamper Detected / Kill Switch Activated | — | **ABSENT** | 반날조상 `SecurityAudit::verify` 등 file:line 미제시 substrate는 인용 보류 |

## 5. 설계 원칙

- **즉시(synchronous) 무효화**: 지연 무효화로 인한 stale 판정 허용 금지(스펙 §6.16 Mandatory Control).
- **Tamper Detected/Kill Switch는 고객 설정으로 비활성화 불가**(§6.16 — 고객 설정으로 필수 Control을 제거하지 못하게 한다).
- **Organization Hierarchy Changed Reference의 경계 재확인**(ADR §D-1·§6.1): 이 Trigger는 `parent_user_id`/`menu_tree`를 Role Graph 내부 구조로 흡수하는 것이 **아니다** — Role Graph가 (Part 3-3 Assignment 등을 통해) 이들을 참조하는 경우, 그 원본이 바뀌면 캐시가 stale해진다는 **의존성 무효화 경계**만 정의한다.
- **cache_type별 세분화 무효화**: 15개 Trigger 각각이 §55의 13종 cache_type 중 어느 것을 무효화할지는 무효화 대상의 인과관계(예: Composite Component Changed → Active Composite Cache·Effective Composite Role Cache·Conflict Cache만 무효화, Ancestor Cache는 무영향)에 따라 세분화 — 전체 캐시 일괄 무효화(GLOBAL)는 최후수단.

## 6. Gap / BLOCKED_PREREQUISITE

- Role Graph Cache 계층 자체 = **ABSENT** → 무효화 대상도 ABSENT.
- Role/Hierarchy/Composite/Permission Version·Lifecycle = **BLOCKED_PREREQUISITE**(Part 2·Part 3-1 코드 0) → 대부분의 Trigger가 감지할 "변경" 자체가 발생할 수 없음.
- Tamper Detected/Kill Switch 판정 소스 = 미확정(향후 SecurityAudit 계열과의 결합은 file:line 날조 없이 별도 검증 세션에서 확정).
- 실 엔진 = 선행 Permission Engine·Role Registry 실구현 후 **별도 승인세션(RP-002)**. 본 편 코드/DB 0 · NOT_CERTIFIED.

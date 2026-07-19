# DSAR — Approval Role Hierarchy Registry (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Hierarchy Registry)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

`APPROVAL_ROLE_HIERARCHY_REGISTRY`는 Role Hierarchy 도메인(계열: PLATFORM/TENANT/APPROVAL/FINANCIAL/…) 별로 어떤 Hierarchy Type·Edge Type이 허용되는지, Multiple Inheritance·Composite Role·Nested Composite·Cross-Registry/Cross-Tenant Edge를 허용할지, 어떤 Mandatory Control(§6.16)이 강제되는지를 최상위에서 규율하는 레지스트리다. 하나의 Registry 아래 여러 `APPROVAL_ROLE_HIERARCHY`(§9)가 소속된다. 현행 저장소에는 이런 레지스트리 개념 자체가 없다 — Part 3-1 GROUND_TRUTH가 확인한 대로 Role Hierarchy/Composite/Graph 전체가 순신규(ABSENT)이며, 유일하게 실재하는 위계 유사 substrate 3종(roleRank/parent_user_id/menu_tree)은 각기 다른 대상(프로그래매틱 rank/계정/메뉴)이라 Registry로 묶일 실체가 아니다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| hierarchy registry id | Registry PK |
| tenant id | 소속 테넌트(PLATFORM Registry는 전역) |
| registry code | 고유 코드(예: `APPROVAL`, `FINANCIAL`) |
| registry name | 표시명 |
| registry type | 아래 Registry Type enum |
| description | 설명 |
| supported hierarchy types | 이 Registry가 허용하는 Hierarchy Type(§9) 집합 |
| supported edge types | 이 Registry가 허용하는 Edge Type(§12) 집합 |
| multiple inheritance allowed | 다중 상속 허용 여부 |
| composite role allowed | Composite Role(§26) 허용 여부 |
| nested composite allowed | Composite 내 Composite 중첩 허용 여부 |
| maximum depth | Hierarchy/Composite 최대 깊이 |
| cross-registry edge allowed | 타 Registry Role과의 Edge 허용 여부(§88) |
| cross-tenant edge allowed | 타 테넌트 Role과의 Edge 허용 여부(기본 차단·§6.14) |
| scope propagation default | 기본 Scope 전파 정책(기본 Intersection·§6.7) |
| permission aggregation default | 기본 Permission 집계 정책 |
| deny propagation required | Explicit Deny 전파 강제 여부(항상 true·§6.8) |
| conflict validation required | Role Conflict 검증 강제 여부 |
| actor eligibility validation required | Actor Eligibility 검증 강제 여부(§6.9) |
| risk escalation required | Risk 상향 강제 여부(§6.10) |
| graph snapshot required | Graph Snapshot 강제 여부 |
| evidence required | Evidence 기록 강제 여부 |
| audit required | 감사 로그 강제 여부 |
| business owner id / technical owner id / security owner id | 3계층 소유자 |
| active version | 현재 Active Hierarchy Version 참조 |
| valid from / valid to | 유효 기간 |
| status | 생명주기 상태 |
| immutable digest | 불변 다이제스트 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

**Registry Type**: `PLATFORM · TENANT · APPROVAL · FINANCIAL · PAYMENT · SETTLEMENT · CONTRACT · SECURITY · COMPLIANCE · DATA · ADMINISTRATION · INTEGRATION · CUSTOM`

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Registry 자체(tenant-scoped 최상위 컨테이너) | ABSENT(순신규) | 저장소에 Role Hierarchy Registry 개념 부재(GROUND_TRUTH §4) |
| supported hierarchy types / edge types 화이트리스트 | ABSENT(순신규) | 대응 substrate 없음 |
| Registry Type=API_CLIENT 근접(프로그래매틱 rank의 소속 축) | Hardcoded Parent-child(순서)·Unversioned Hierarchy | api_key `roleRank` 선형 rank(`index.php:573,592-595`) — **Role Graph 아님**. ADR D-1: "별도 Hierarchy Registry(API_CLIENT)"로 정규화 대상일 뿐, 현재 Registry 실체는 ABSENT. |
| cross-tenant edge allowed(기본 차단) | Organization Hierarchy Candidate(오용 위험) | `parent_user_id`의 tenant 상속(`UserAuth.php:217,227,423-426`)은 계정 도메인의 교차테넌트 차단 사례이며 Role Registry의 cross-tenant edge 정책과 무관(별개 도메인·오흡수 금지) |
| Mandatory Control 강제 플래그(deny/conflict/actor/risk/snapshot/evidence/audit required) | ABSENT(순신규) | 대응 substrate 없음 |

## 5. 설계 원칙

- Registry Type별로 허용 Hierarchy/Edge Type·Multiple Inheritance·Composite 허용 여부를 화이트리스트로 격리한다(§7 Canonical Entity 최상위 컨테이너).
- §6.16 Mandatory Control(Cycle Detection·Tenant Isolation·Version Binding·Deny Propagation·Scope Guard·Actor Validation·Risk Escalation·Retired Blocking·Snapshot·Evidence·Cache Invalidation·Historical Immutability)은 Registry 레벨에서 강제 플래그로 표현하되 고객 설정으로 비활성화 불가(D-4).
- cross-tenant edge allowed는 기본값 false(§6.14). cross-registry edge는 §88 Cross-Registry Edge Governance로만 허용.
- api_key roleRank는 Registry Type=API_CLIENT 축으로 정규화 후보일 뿐, roleRank 자체를 Registry나 Hierarchy로 승격 금지(§6.2 "선형 rank≠상속" 오변환 금지·ADR D-1).
- Registry는 Part 3-1 Role Registry Foundation과 별개 레이어(Role Definition을 담는 레지스트리가 아니라, Role 간 관계 규칙을 담는 레지스트리)이며 혼동 금지.

## 6. Gap / BLOCKED_PREREQUISITE

Role Hierarchy Registry는 저장소에 대응 substrate가 전무한 **완전 ABSENT(순신규)** 판정이다. 유일하게 근접한 것은 api_key roleRank 선형 rank(`index.php:573`)이나 이는 Registry가 아니라 4단 정수 rank map이며 Registry Type=API_CLIENT 정규화 대상 후보일 뿐이다. 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1)이 실 코드로 구현된 이후 별도 승인세션(RP-002)에서만 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.

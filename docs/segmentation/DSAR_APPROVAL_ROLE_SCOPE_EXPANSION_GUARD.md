# DSAR — Role Scope Expansion Guard (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: §42 Role Scope Expansion Guard)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Role Scope Expansion Guard(스펙 §42)는 Role Hierarchy/Composite Role의 새 Version이 활성화되기 전, 기존 Effective Scope보다 **확대**되는 변경(Tenant/Legal Entity/Organization 추가, Subtree 확대, Resource Type 추가, 제한 제거, Amount 완화, Wildcard 허용, Deny/Excluded Component 제거, Broad Parent 추가 등)을 탐지해 High/Critical 등급이면 활성화를 차단하고 승인·Simulation을 강제하는 Mandatory Control(§6.16)이다. 저장소에는 이런 확대 탐지 로직이 없으며, 오히려 이 Guard가 막아야 할 "최대 확장" anti-pattern(plan god flag)이 그대로 실재한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| scope expansion guard id | Guard 판정 레코드 PK |
| hierarchy version id / composite version id | 검사 대상 Version 참조 |
| detected expansion type | 아래 Expansion Signal enum(복수 가능) |
| severity | Low · Medium · High · Critical |
| baseline effective scope digest | 변경 전 Effective Scope 다이제스트 |
| candidate effective scope digest | 변경 후(제안) Effective Scope 다이제스트 |
| block activation | High/Critical 시 true(강제) |
| simulation required | High/Critical 시 true(강제) |
| approval reference | 승인 근거 참조 |
| tenant id | 소속 테넌트 |
| status | 생명주기 상태 |
| immutable digest | 불변 다이제스트 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

**Expansion Signal**: `TENANT_SCOPE_ADDED` · `CROSS_TENANT_EDGE` · `LEGAL_ENTITY_ORGANIZATION_ADDED` · `ORGANIZATION_SUBTREE_EXPANDED` · `RESOURCE_TYPE_ADDED` · `RESOURCE_FIELD_RESTRICTION_REMOVED` · `DATA_CATEGORY_CHANNEL_ADDED` · `CLIENT_RESTRICTION_REMOVED` · `AMOUNT_RELAXED` · `TIME_RESTRICTION_REMOVED` · `VALIDITY_EXTENDED` · `WILDCARD_ALLOWED` · `RESTRICTION_EDGE_REMOVED` · `EXPLICIT_DENY_REMOVED` · `EXCLUDED_COMPONENT_REMOVED` · `BROAD_PARENT_ROLE_ADDED` · `COMPOSITE_OPTIONAL_COMPONENT_AUTO_INCLUDED`

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Expansion 탐지 로직 자체 | ABSENT(순신규) | Role Hierarchy/Composite Version·변경 diff 비교 전무(GROUND_TRUTH §4) |
| Guard가 차단해야 할 "최대 확장" 사례(부정 사례) | Anti-pattern(§6.5·전역 우회) | `isAdmin` plan god flag(`TeamPermissions.php:132`·`AuthContext.jsx:720`) — plan='admin'이면 모든 Scope 제한을 즉시 우회. Scope Expansion Guard가 존재했다면 Critical로 탐지·차단해야 할 패턴의 실사례이나, 현재는 탐지 로직 자체가 없어 무방비로 실재 |
| High/Critical 활성화 차단(근접 없음) | ABSENT(순신규) | 대응 substrate 없음 — 쓰기 게이트(`index.php:592-595`)는 api_key role rank 기준 write 허용 여부일 뿐 Scope 확대 diff 탐지가 아님 |

## 5. 설계 원칙

- 새 Hierarchy/Composite Version 활성화 전, 직전 Active Version 대비 Effective Scope Digest를 비교해 Expansion Signal을 탐지한다(스펙 §42 목록 전부).
- High/Critical 등급은 활성화를 자동 차단하고 승인 + Simulation(§107~108)을 강제한다 — 고객 설정으로 비활성화 불가(§6.16).
- `isAdmin` plan god flag(`TeamPermissions.php:132`·`AuthContext.jsx:720`)는 Guard가 향후 탐지해야 할 "Critical 확장"의 실사례로만 참조하며, 이 Guard가 그 경로를 직접 수정·차단하지 않는다(이번 차수 코드 0·289차 P1~P4 재플래그 금지 — god flag 자체는 이미 별도 판정 대상이며 여기서 재논의하지 않음).
- Scope Expansion Guard는 §39 Scope Propagation(기본 Intersection)의 사후 검증 계층이다 — Propagation Policy가 Intersection이어도 여러 Edge가 누적되면 우회적 확대가 가능하므로 별도 Version diff 비교가 필요하다.
- Cross-Tenant Edge 자체는 §47 Cross-Tenant Edge Governance가 원천 차단하지만, Expansion Guard는 그 외 모든 확대 신호를 포괄한다.

## 6. Gap / BLOCKED_PREREQUISITE

Role Scope Expansion Guard는 **완전 ABSENT(순신규)** 판정이다. 저장소에는 Version 간 Scope 확대 diff 비교 로직이 없다. 유일하게 확인 가능한 것은 이 Guard가 막으려는 확장 패턴의 실사례(`isAdmin` plan god flag·`TeamPermissions.php:132`·`AuthContext.jsx:720`)뿐이며, 이는 근거 substrate가 아니라 반면교사 사례다(반날조 — anti-pattern을 구현 근거로 오인 금지). 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 코드 완성 후 별도 승인세션(RP-002)에서 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.

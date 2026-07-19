# DSAR — Permission Group Membership (EPIC 06-A-03-02-03-04 Part 2 · Permission Engine)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **GROUND_TRUTH 인용원(반날조 allowlist)**: [ADR](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md) · [DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md). `file:line`은 이 2문서에서만 인용.

---

## ① 목적 (Purpose)

Permission Group Membership은 **특정 Group Version에 어떤 Permission Definition Version(또는 중첩 Group)이 원소로 속하는지 1건**을 정형 선언하는 연결 Entity다. 원소별 effect override(allow/deny)·scope override·제약·유효기간·정렬순서를 담아, Group을 펼쳤을 때(flatten) 어떤 유효 Permission 집합이 되는지를 결정한다. Group Version(스냅샷)의 원자 구성단위이며, Effective Permission Set 계산의 입력이다.

## ② Canonical 필드

- `membership id` · `tenant` · `group version`(소속 Group Version) · `permission definition version`(원소 Permission Definition Version) 또는 `nested group version`(중첩 Group Version)
- `effect override`(Allow / Deny / Inherit) · `scope override`(원소 scope 재정의·확장금지) · `constraints`(적용 제약 집합)
- `valid_from` · `valid_to` · `sequence`(펼침 정렬순서) · `evidence`

## ③ 열거형

- **EFFECT_OVERRIDE**: `ALLOW` / `DENY`(Deny-overrides 우선) / `INHERIT`.
- **MEMBER_KIND**: `PERMISSION`(permission definition version) / `NESTED_GROUP`(nested group version).

## ④ substrate 매핑 (§92)

| Canonical 요소 | 실존 substrate | §92 태그 | 근거(allowlist) |
|---|---|---|---|
| 원소 Permission | `acl_permission`(menu×action row) | CANONICAL_PERMISSION_SCOPE_CANDIDATE | EXISTING `TeamPermissions.php:152-171` |
| scope override(확장금지 성향) | data_scope fail-closed(`1=0`·DENY_SCOPE) | ROW/DATA_SCOPE_CANDIDATE | EXISTING `TeamPermissions.php:234,290,303` |
| 위임상한 clamp(부여 확장 방지) | clampActions · reclampTeamMembers · putMemberPermissions(`DELEGATION_EXCEEDED`) | 위임 substrate | EXISTING `TeamPermissions.php:396-402,628-647,779-800` |
| effect override(deny) | `1=0` 센티넬(first-class deny 부재) | Deny PARTIAL | EXISTING `TeamPermissions.php:290,303` |
| membership 연결·version binding·nested·sequence·nesting guard | — | **ABSENT(순신규)** | ADR §D-4 "Group/Bundle=순신규" |

- Group↔Permission/nested-Group 멤버십 연결·version binding·nesting guard 구조체 → **no hits(ABSENT)**.

## ⑤ 설계원칙 — Group Nesting Guard (필수 통제)

- **Circular Nesting 금지**: 중첩 Group이 순환 참조(G1⊃G2⊃G1)를 형성하면 멤버십 삽입 거부(Mandatory Control·ADR §6.16).
- **Max Depth**: 중첩 깊이가 Group의 `max nesting depth`를 초과하면 거부.
- **Tenant 일치**: `group version`·`permission definition version`·`nested group version`의 `tenant`가 모두 동일해야 함 — Cross-tenant 원소 편입 금지(ADR §D-6 Tenant Isolation).
- **Scope Expansion 금지(ADR D-5)**: `scope override`는 원소/상위 Group scope의 **교집합(Intersection)** 만 허용 — 멤버십을 통해 더 넓은 scope를 획득 금지. data_scope fail-closed 성향 확장.
- **Deny Propagation**: 원소·중첩 Group의 `effect override=DENY`는 상위로 전파되어 Allow를 이긴다(Deny-overrides).
- **Version Binding**: 멤버십은 반드시 Permission **Definition Version**·**Group Version**을 가리킴(느슨한 Code/Group-id 참조 금지) — 시점 의미 보존.
- **Cache Invalidation**: 멤버십 변경 시 해당 Group·상위 Group·참조 Subject의 Effective Permission Set 캐시 무효화.
- **★Deprecated/Retired Permission 신규추가 금지**: 폐기(Deprecated)·은퇴(Retired) 상태 Permission Definition은 신규 멤버십으로 추가 금지(기존 멤버십은 마이그레이션 경로로만 정리). ADR §D-2에서 폐기된 `admin_roles`/`user_roles` 계열 죽은 RBAC를 Group 원소로 되살리지 않는다.
- **Group ≠ Role**: 멤버십은 Permission↔Group 연결이며, Subject↔Role 배정(Part 3 RBAC)과 별개. Group을 Role로, 멤버십을 역할부여로 취급 금지.

## ⑥ Gap

- **BLOCKED_PREREQUISITE(RP-002)**: 연결할 Group Version·Permission Definition Version(순신규)·first-class Deny Entity·Effective Cache가 모두 코드 0(ADR §D-4). 현행 위임상한(clamp)은 action grant 축소만 하며 Group 멤버십 nesting guard는 부재.
- **cover 0**: Group 멤버십·nesting guard 전무. 실 엔진은 기존 acl grant·clamp·data_scope 확장금지 성향을 멤버십 guard로 정형화하는 "조립".
- **NOT_CERTIFIED**: 코드/DB 변경 0. 하드코딩 authz·전권 백도어 부재(ADR §D-3) — 멤버십 결함으로 날조 금지. Part 1 D-2 위험 4건 재플래그 금지.

관련: [[DSAR_APPROVAL_PERMISSION_GROUP]] · [[DSAR_APPROVAL_PERMISSION_GROUP_VERSION]] · [[DSAR_APPROVAL_PERMISSION_GRAPH]] · [[ADR_DSAR_PERMISSION_ENGINE_FOUNDATION]].

# DSAR — Permission Graph (EPIC 06-A-03-02-03-04 Part 2 · Permission Engine)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **GROUND_TRUTH 인용원(반날조 allowlist)**: [ADR](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md) · [DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md). `file:line`은 이 2문서에서만 인용.

---

## ① 목적 (Purpose)

Permission Graph는 Hierarchy(순수 Permission 트리)를 넘어 **Permission·Group·Bundle·Grant Source·Scope·Constraint·Deny·Actor Type·Role Ref·Client·Service Account·System Actor를 노드로, 이들 간의 다양한 관계를 간선으로 담는 통합 인가 지식 그래프**다. Effective Permission Set/Deny Set 계산 시 "어떤 Permission이 어디서(GrantedBy) 유래하고·무엇에 스코프되며(ScopedTo)·무엇에 의해 거부되는지(DeniedBy)"를 단일 그래프로 조회·시뮬레이션·감사 가능하게 한다. Hierarchy(트리·§1문서)의 상위 일반화로서, 트리에 담기지 않는 교차관계(DependsOn/ConflictsWith/SupersededBy)를 표현한다.

★**순신규**. 현재 이러한 인가 그래프는 부재하다. 실존은 `effectiveForUser`(EXISTING `TeamPermissions.php:366`)의 온디맨드 계산·`index.php` RBAC(PEP)뿐으로, 노드/간선을 데이터로 영속·조회하는 그래프가 아니다(ADR §D-4 Effective-Set "계산은 존재하나 미영속·미캐시").

## ② Canonical 필드

- `graph id` · `tenant` · `code` · `name` · `active version` · `version digest`
- `node set`(노드 목록·아래 노드 유형) · `edge set`(간선 목록·아래 간선 유형)
- `root nodes`(진입 노드) · `owner` · `status` · `valid_from` · `valid_to` · `evidence`

## ③ 열거형

- **NODE_TYPE**(12종): `PERMISSION` / `GROUP` / `BUNDLE` / `GRANT_SOURCE` / `SCOPE` / `CONSTRAINT` / `DENY` / `ACTOR_TYPE` / `ROLE_REF` / `CLIENT` / `SERVICE_ACCOUNT` / `SYSTEM_ACTOR`.
- **EDGE_TYPE**(10종): `INCLUDES` / `IMPLIES` / `DEPENDS_ON` / `EXCLUDES` / `CONFLICTS_WITH` / `GRANTED_BY` / `SCOPED_TO` / `DENIED_BY` / `SUPERSEDED_BY` / `DERIVED_FROM`.

## ④ substrate 매핑 (§92)

| Canonical 노드/간선 | 실존 substrate | §92 태그 | 근거(allowlist) |
|---|---|---|---|
| `PERMISSION` 노드 | `acl_permission`(menu×action) | CANONICAL_PERMISSION_SCOPE_CANDIDATE | EXISTING `TeamPermissions.php:152-171` |
| `SCOPE` 노드·`SCOPED_TO` | data_scope(행필터·4핸들러 소비) | ROW/DATA_SCOPE_CANDIDATE | EXISTING `TeamPermissions.php:160-322,236-322` |
| `GRANT_SOURCE`·`GRANTED_BY` | acl_permission INSERT(replacePerms) | Grant substrate(EXISTS·그래프화 필요) | EXISTING `TeamPermissions.php:325` |
| `ROLE_REF` 노드 | app_user.team_role(owner/manager/member) | 참조 어댑터(Part 3 RBAC) | EXISTING `TeamPermissions.php:120-131` |
| `ACTOR_TYPE`/`SERVICE_ACCOUNT`/`CLIENT` 노드 | api_key(role·scopes_json) | 프로그래매틱 재료 | EXISTING `index.php:573-577` · `Keys.php:191,204` |
| `DENY` 노드·`DENIED_BY` | `1=0` 센티넬(first-class deny 부재) | Deny PARTIAL | EXISTING `TeamPermissions.php:290,303` |
| `GROUP`/`BUNDLE` 노드·교차간선(DependsOn/ConflictsWith/SupersededBy/DerivedFrom)·version+digest | — | **ABSENT(순신규)** | ADR §D-4 "Graph=순신규" |

- Permission 인가 그래프(노드/간선 영속·version·digest) → **no hits(ABSENT)**. 계산기(`effectiveForUser`)는 있으나 그래프 데이터 모델은 부재.

## ⑤ 설계원칙

- **Golden Rule = Extend**: `PERMISSION` 노드는 `acl_permission`, `SCOPE`는 data_scope, `ROLE_REF`는 team_role, `SERVICE_ACCOUNT`/`CLIENT`는 api_key를 노드로 흡수(재구현 금지). 중복 Resolver/Effective-Set 엔진 신설 금지 — 기존 `effectiveForUser`를 그래프 탐색으로 정형화.
- **Permission ≠ Role ≠ Authority(ADR D-5)**: `ROLE_REF`는 **참조 노드(Adapter)** 일 뿐 Role 정의를 Graph에 내장하지 않는다(Part 3 RBAC 소관). `SERVICE_ACCOUNT`/`SYSTEM_ACTOR`를 Human 승인권으로 등록 금지.
- **Deny 우선·Default Deny**: `DENIED_BY`·`CONFLICTS_WITH`·`EXCLUDES` 간선은 Allow 경로를 이긴다. first-class `DENY` 노드로 현재 `1=0` 센티넬 표현을 정형화.
- **불변 버전+Digest**: 그래프 스냅샷은 `version digest`로 봉인(선행 Crypto Hash Chain 봉인기 재사용). In-place 변경 금지.

## ⑥ Gap

- **BLOCKED_PREREQUISITE(RP-002)**: 그래프가 담을 Canonical Permission Definition·Group·Bundle·first-class Deny Entity, 결과를 봉인할 Decision Core가 모두 코드 0(ADR §D-4).
- **cover 0**: 인가 그래프 데이터 모델 전무. 단 다수 노드 substrate(acl/data_scope/team_role/api_key)가 실재 → "발명 아닌 조립".
- **NOT_CERTIFIED**: 코드/DB 변경 0. 하드코딩 email/user-id authz·FULL_ACCESS/MANAGE_ALL 백도어는 부재(ADR §D-3 정직 판정) — 그래프 결함으로 날조 금지. Part 1 D-2 위험 4건 재플래그 금지.

관련: [[DSAR_APPROVAL_PERMISSION_HIERARCHY]] · [[DSAR_APPROVAL_PERMISSION_GROUP]] · [[ADR_DSAR_PERMISSION_ENGINE_FOUNDATION]].

# DSAR — Permission Organization Scope (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Permission을 **조직 계층(부서/팀/유닛) 경계**로 한정하는 축. Exact(해당 조직만)·Subtree(하위 포함)·Parent·Child·Cross-org(원칙 금지)의 5 관계를 정형화하고, 결정 시점에 사용된 **Organization Hierarchy Version을 함께 저장**해 과거 결정을 나중의 조직 개편 기준으로 **재해석하지 못하게** 한다(불변 계층 스냅샷). ★**순신규** — 현재 플랫폼은 `team`(단일 계층 membership)만 있고 다층 조직 hierarchy·subtree 축은 부재하므로 정직하게 ABSENT 선언 후 신설 설계만 제공한다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `organization_id` | 조직 노드 식별자(tenant 하위) |
| `relation` | 조직 관계(§3 열거·EXACT 기본) |
| `include_descendants` | Boolean(Subtree 확장 여부) |
| `hierarchy_version` | 결정 시점 조직 계층 버전(불변 스냅샷 참조·필수) |
| `cross_org_prohibited` | Boolean(항상 true·비활성 불가·Mandatory Control) |
| `path` | 조직 경로(materialized path·재해석 방지용 고정) |
| `digest` | Organization Scope 정규화 스냅샷 해시 |

## 3. 열거형 / 타입

**relation**: `EXACT`(해당 조직만) · `SUBTREE`(자신+하위 전체) · `PARENT`(상위) · `CHILD`(직속 하위) · `CROSS_ORG_PROHIBITED`(교차 조직 명시 차단).
**organization kind**: `DIVISION` · `DEPARTMENT` · `TEAM` · `UNIT` · `CUSTOM`.

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| 조직 계층·Subtree·hierarchy_version 축 | — | **ABSENT(순신규·정직)** | 다층 org hierarchy·subtree·버전 스냅샷 부재 |
| 최근접 단층 membership | `team` 테이블 + `app_user.team_id`(단일 소속·계층 아님) | 인접(대체 아님) | `TeamPermissions.php:145-151`·`:175` |
| 조직 role 인접 | `app_user.team_role`(owner>manager>member·위계이나 조직트리 아님) | 인접 | `TeamPermissions.php:120-131` |

★정직 선언: 현재는 **단층 team membership**만 있고 **부모/자식/subtree/버전화된 조직 트리는 없다**. team_role 위계(owner/manager/member)를 조직 계층으로 오인 매핑하지 않는다(반날조).

## 5. 설계 원칙 / 결정

- **Subtree 확장은 명시 flag로만**: `include_descendants=true`일 때만 하위 포함 — 기본은 EXACT(암묵 확장 금지·Expansion Guard).
- **Hierarchy Version 불변 저장**: 결정에 사용된 계층 버전을 함께 기록 — 조직 개편 후 과거 결정을 새 트리로 재해석 금지(불변 스냅샷).
- **Cross-org Default Deny**: 조직 간 접근은 명시 grant 없이 금지.
- **team은 substrate이지 org 트리 아님**: `team`을 그대로 조직 계층으로 승격하지 않고, 다층 트리를 상위 신설하되 team을 leaf membership으로 흡수.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED · 전부 ABSENT**: `organization_id`/`relation`(5종)/`hierarchy_version`/`path`/`include_descendants`/`digest` = 순신규.
- **BLOCKED_PREREQUISITE**: 조직 트리·버전 스냅샷은 Org Hierarchy 모델 신설 후 별도 승인세션 **RP-002**.
- Part 1 D-2 위험 4건은 289차 P1~P4로 해소됨 — 재플래그 금지.

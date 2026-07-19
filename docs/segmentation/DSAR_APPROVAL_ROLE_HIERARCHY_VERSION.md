# DSAR — Approval Role Hierarchy Version (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Hierarchy Version)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

`APPROVAL_ROLE_HIERARCHY_VERSION`은 하나의 Role Hierarchy Definition(§9)이 시간에 따라 변경될 때마다(Node/Edge 추가·제거·방향 변경·정책 변경 등) 생성되는 불변 스냅샷이다. Hierarchy Edge를 In-place Update하지 않고(§6.5) 매 변경마다 새 Version을 발급해 과거 Graph를 재해석하지 않도록(§6.15) 보장하는 핵심 축이다. 저장소에는 이런 버저닝된 그래프 변경 이력 자체가 없다 — `menu_defaults`의 snapshot_data/version(`AdminMenu.php:119-122,295-311,583-589`)이 구조적으로 근접한 "버전화된 스냅샷+롤백지점" 패턴이나 대상이 메뉴이지 Role Hierarchy가 아니다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| hierarchy version id | Version PK |
| role hierarchy id | 소속 Hierarchy Definition(§9) FK |
| version number | 순번(단조 증가) |
| previous version id | 직전 Version 참조(이력 체인) |
| version type | 아래 Version Type enum |
| root node snapshot | 해당 시점 Root Node 스냅샷 |
| node snapshot | 해당 시점 전체 Node 스냅샷 |
| edge snapshot | 해당 시점 전체 Edge 스냅샷 |
| maximum depth | 해당 Version의 최대 깊이 |
| multiple inheritance policy | 다중 상속 정책 |
| scope propagation policy | Scope 전파 정책 |
| permission aggregation policy | Permission 집계 정책 |
| deny propagation policy | Explicit Deny 전파 정책(§6.8) |
| conflict policy | Conflict 해소 정책 |
| actor eligibility policy | Actor Eligibility 정책(§6.9) |
| change summary | 변경 요약 |
| affected role count | 영향받는 Role 수 |
| affected assignment reference count | 영향받는 Assignment 참조 수(Part 3-3 재사용) |
| risk impact | 이 Version 변경의 Risk 영향도 |
| scope expansion detected | Scope 확대 감지 여부(감지 시 §6.7 위반 플래그) |
| manual review required | 수동 검토 강제 여부 |
| effective from / effective to | 유효 기간 |
| created by / reviewed by / approved by | 3단계 책임 주체 |
| activated at / superseded at | 활성화/폐기 시각 |
| status | 생명주기 상태 |
| immutable digest | 불변 다이제스트 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

**Version Type**: `INITIAL · NODE_ADD · NODE_REMOVE · EDGE_ADD · EDGE_REMOVE · EDGE_CHANGE · ROOT_CHANGE · DIRECTION_CHANGE · DEPTH_CHANGE · SCOPE_POLICY_CHANGE · PERMISSION_POLICY_CHANGE · DENY_POLICY_CHANGE · CONFLICT_POLICY_CHANGE · ACTOR_POLICY_CHANGE · SECURITY_HARDENING · CORRECTION · MIGRATION · DEPRECATION`

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Version 자체(불변 스냅샷 체인) | ABSENT(순신규) | Role Hierarchy Version 개념 전무(GROUND_TRUTH §4) |
| node snapshot / edge snapshot(근접 구조 패턴) | Snapshot/baseline(role 아님) | `menu_defaults`(snapshot_data·version·reset 롤백지점, `AdminMenu.php:119-122,295-311,583-589`) — §50 Graph Snapshot 참조 패턴이나 **대상이 메뉴**이지 Role Hierarchy Version이 아님(GROUND_TRUTH §5) |
| immutable digest / evidence(근접 경계) | ABSENT(정본 아님) | `menu_audit_log` hash_chain(`AdminMenu.php:123-131,169-219`)은 append만 실재하고 verify는 0 — **tamper-evident 아님**([[reference_menu_audit_log_not_tamper_evident]] 재확인). 정본 append-only 해시체인은 `SecurityAudit::verify`뿐(GROUND_TRUTH §5). Role Hierarchy Version의 evidence 정본으로 menu hash_chain 인용 금지 |
| version number(단조 증가·순서 개념 근접) | Hardcoded Parent-child(순서)·Unversioned Hierarchy | api_key `roleRank`(`index.php:573`)는 rank 순서일 뿐 시점별 Version 발급 개념이 없음(Unversioned) — Version 부재의 반례로만 인용 |

## 5. 설계 원칙

- Hierarchy Edge를 In-place Update하지 않는다(§6.5) — 모든 Node/Edge 변경은 신규 Version 발급을 통해서만 반영한다.
- Historical Graph를 불변 보존한다(§6.15) — 현재 Hierarchy Version으로 과거 Authorization/Assignment를 재해석하지 않는다.
- scope expansion detected가 true인 Version은 manual review required를 강제한다(§6.7 Scope Expansion Guard·§6.16 Mandatory Control).
- `menu_defaults` snapshot_data/version(`AdminMenu.php:119-122`)을 구조적 참조 패턴으로만 활용하고, 메뉴 스냅샷 테이블을 Role Hierarchy Version으로 재사용(오흡수)하지 않는다.
- immutable digest·evidence는 `menu_audit_log` hash_chain처럼 "쓰기만 되고 검증 불가능한 장식"이 되지 않도록 별도 verify 경로를 전제로 설계한다(GROUND_TRUTH §5 tamper-evident 아님 경고 반영).
- affected assignment reference count는 실제 계산 로직이 아니라 Part 3-3 Assignment가 소비할 참조 카운트 필드로만 정의한다(이번 Part는 Assignment 미구현).

## 6. Gap / BLOCKED_PREREQUISITE

Role Hierarchy Version은 **완전 ABSENT(순신규)** 판정이다. 구조적으로 가장 근접한 것은 `menu_defaults`의 snapshot_data/version(`AdminMenu.php:119-122,295-311,583-589`)이나 이는 메뉴 도메인이며 Role Hierarchy Version으로 직접 재사용할 수 없다. 감사 체인 참조 시 `menu_audit_log` hash_chain을 tamper-evident 정본으로 오인하지 않는다(정본=`SecurityAudit::verify`). 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 코드 완성 후 별도 승인세션(RP-002)에서 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.

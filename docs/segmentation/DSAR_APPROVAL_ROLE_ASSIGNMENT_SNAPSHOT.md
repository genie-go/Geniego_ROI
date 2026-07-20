# DSAR — Approval Role Assignment Snapshot (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Assignment Snapshot · 스펙 §26)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Assignment Registry/Version(본 Part 본체) 실 구현 부재
- **불변**: Snapshot 불변(Immutable — 생성 후 절대 수정 금지) · Cache는 Version 기반(§33·본 편 Snapshot/Digest와 연동) · Simulation은 실제 변경 없음(§32와 별개 축이나 동일 비파괴 규율 공유) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §26 Assignment Snapshot = Subject · Role · Scope · Permission Projection · Deny Projection · Assignment Version · Digest 결합의 특정 시점 **불변 캡처**. Assignment Version이 생성될 때마다(§6) 그 시점의 Subject/Role/Scope/Permission 상태를 스냅샷으로 고정해, 이후 Digest(§27)·Reconciliation(§31)·Drift(§29) 비교의 기준점을 제공한다. ADR §D-2는 현행 5경로가 version/approval/snapshot 없이 단일 트랜잭션 UPDATE로 즉시 반영되며, 특히 `replacePerms`가 DELETE→INSERT로 이전 상태를 소실시키는 것(`TeamPermissions.php:324-336`)을 "Snapshot 부재의 직접 실증"으로 명시한다.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | snapshot id | Snapshot PK |
| 2 | assignment id | 대상 Assignment |
| 3 | assignment version id | 캡처 시점의 Assignment Version(§6) |
| 4 | subject | Subject ID/Type(스펙 §26) |
| 5 | role | Role Definition/Version(스펙 §26) |
| 6 | scope | Assignment Scope(§8) 결합값 |
| 7 | permission projection | 스펙 §26 원문 |
| 8 | deny projection | 스펙 §26 원문 |
| 9 | digest | §28 Digest 참조/결합 |
| 10 | captured at | 캡처 시각 |
| 11 | captured reason | 캡처 유발 Version Type(§6 — Initial/Renewal/Approval/Restoration/Suspension/Revocation 등) |

## 3. 열거형 / 타입

스펙 §26 원문에는 전용 열거형이 없다. Snapshot은 §6 Version Type(Initial · Renewal · Scope Change · Role Version Change · Expiration Change · Approval Change · Restoration · Suspension · Revocation · Migration · Correction) 각각의 생성 시점과 1:1로 결합해 생성되는 설계를 채택한다(근거: ADR §D-2 "Assignment는 Version·Approval·Lifecycle·Snapshot을 갖는 1급 엔티티").

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| Snapshot 전체(구조체·캡처 절차) | — | — | **ABSENT** — Assignment Version 자체가 ABSENT(ADR §1·EXISTING_IMPLEMENTATION §6) → 스냅샷 캡처 대상 없음 |
| 근접(비-Role 스냅샷) | `menu_defaults` snapshot(snapshot_data·version)·`menu_audit_log` hash_chain | `AdminMenu.php:119-138,294-311` | EXISTING_IMPLEMENTATION §7 인용 — 메뉴트리 전용·hash_chain에 `verify()` 없음(tamper-evident 아님)·role/acl 미재사용 |
| 반례(스냅샷 부재의 실증) | `replacePerms`/`replaceScope`(DELETE→INSERT·in-place 교체·이전 상태 소실) | `TeamPermissions.php:324-336,337-346` | Snapshot이 있었다면 보존됐을 이전 상태가 물리적으로 소실되는 현재 동작 — Assignment Snapshot 부재를 직접 실증(ADR §D-2 인용) |

## 5. 설계 원칙

- Snapshot은 불변(Immutable) — 생성 후 절대 수정하지 않는다(ADR §D-2 "과거 Version 불변"과 동형 규율).
- `menu_defaults` snapshot은 "시점 데이터 캡처"라는 개념상 참조 패턴일 뿐이며, hash_chain에 `verify()`가 없어 tamper-evident가 아니므로([[reference_menu_audit_log_not_tamper_evident]]) Assignment Snapshot의 무결성 모델로 재사용하지 않는다 — 무결성은 §27 Evidence·SecurityAudit 승격 경로로만 확보한다.
- `replacePerms`/`replaceScope`의 DELETE→INSERT 패턴은 Snapshot이 부재할 때 실제로 벌어지는 정보 손실을 보여주는 반례로만 인용하며, 대체물이 아니다.
- Snapshot은 Digest(§28)와 1:1 결합해 각 Version 시점의 무결성 검증 기준점이 된다.

## 6. Gap / BLOCKED_PREREQUISITE

- Assignment Definition/Version 자체 ABSENT(ADR §1·EXISTING_IMPLEMENTATION §6) → Snapshot 대상 없음.
- `SecurityAudit::verify`(유일 실 tamper-evident 체인)에 role assignment 이벤트가 미기록(ADR §1) → Snapshot 무결성을 실제로 검증할 체인 부재.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy·Assignment Registry/Version 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.

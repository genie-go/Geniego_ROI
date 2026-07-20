# DSAR — Approval Dynamic Role Digest (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Dynamic Role Digest · 스펙 §1(19)·§2·§33)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scoped Role(Part 3-4)·Dynamic Role Registry/Rule Engine(본 Part 본체) 실 구현 부재
- **불변**: Snapshot/Evidence 불변(참조 편 결합) · UNKNOWN Permit 금지(ADR D-2) · 마케팅 automation 오흡수 금지(KEEP_SEPARATE·ADR D-4) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §1(구현범위 19번: Dynamic Role Digest)·§2(Canonical Entity: `APPROVAL_DYNAMIC_ROLE_DIGEST`)·§33(Database Constraint: "Digest Validation") = Snapshot/Evidence payload의 무결성을 검증하는 해시/체크섬 축. §33이 Digest Validation을 `Immutable Version` · `Rule Version Binding` · `Tenant Isolation`과 나란히 데이터베이스 제약조건으로 명문화.

- **순신규 총평**: 해시/다이제스트 산출·검증 코드 전무(grep 0). Rule Version·Rule Engine 자체가 ABSENT(EXISTING_IMPLEMENTATION §1,§2)이므로 Rule Version Binding도 성립 불가. Tenant Isolation만 유일하게 근접 substrate 실재.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | digest id | Digest PK |
| 2 | subject type / subject id | Snapshot/Evidence(참조 편) 대상 |
| 3 | algorithm | 해시 알고리즘 |
| 4 | digest value | 계산된 해시값 |
| 5 | computed at | 계산 시각 |
| 6 | verified | 검증 여부(§33 Digest Validation) |
| 7 | tenant id | Tenant Isolation(§33) |

## 3. 열거형 / 타입

스펙 §33 원문 그대로: Database Constraint 4축 — `Immutable Version` · `Rule Version Binding` · `Tenant Isolation` · `Digest Validation`. Digest 자체의 하위 타입 열거형은 스펙에 없음.

## 4. 실 substrate 매핑 (ABSENT/근접)

| 대상 | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| Digest 산출/검증 로직 | 없음 | — | **ABSENT** — 해시/다이제스트 계산·검증 코드 전무 |
| Immutable Version(§33) | Rule Version 개념 자체(§8) ABSENT | — | **ABSENT** |
| Rule Version Binding(§33) | RBAC Rule Engine 자체 ABSENT(`RuleEngine.php`는 마케팅 KEEP_SEPARATE) | `RuleEngine.php:12,24` | **ABSENT** — 마케팅 Rule 조건 저장은 실재하나 RBAC Rule Version Binding 아님(오흡수 금지) |
| Tenant Isolation(§33 근접) | data_scope 테넌트 필터(ABAC 최근접·fail-closed) | `TeamPermissions.php:236-265` | 근접(테넌트 격리 로직 자체는 실재)이나 Digest/스냅샷 대상 데이터가 없어 결합 지점 부재 |

## 5. 설계 원칙

- Digest는 Snapshot(참조 편)/Evidence(참조 편)가 먼저 신설된 후에만 의미를 갖는다 — 대상 없는 해시는 무의미. 순서: Snapshot/Evidence 스키마 확정 → Digest 산출 로직 추가.
- Tenant Isolation은 이미 근접 substrate(`TeamPermissions.php:236-265`)가 있으므로, Digest 신설 시 이 fail-closed 테넌트 필터를 재사용한다(신규 격리 로직 중복 신설 금지 — Golden Rule Extend).
- Rule Version Binding은 Rule Engine(§20) 및 Rule Version(§8) 신설이 선행되어야 한다 — 이중 BLOCKED_PREREQUISITE. 마케팅 `RuleEngine.php`의 조건 정의(`:12,24`)를 RBAC Rule Version으로 오흡수 금지(ADR D-4).

## 6. Gap / BLOCKED_PREREQUISITE

- Digest 산출/검증 = 완전 ABSENT.
- Immutable Version/Rule Version Binding = Rule Engine·Rule Version 자체가 선행 신설 대상(이중 BLOCKED_PREREQUISITE).
- Tenant Isolation만 근접 substrate 재사용 가능(`TeamPermissions.php:236-265`), 나머지 3축은 순신규.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Dynamic Role Registry/Rule Engine 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.

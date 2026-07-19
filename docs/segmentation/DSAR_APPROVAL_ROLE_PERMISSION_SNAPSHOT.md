# DSAR — Role Permission Snapshot (EPIC 06-A-03-02-03-04 Part 3-1)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
> **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
> **반날조**: 모든 `file:line`은 상위 ADR·전수조사 2문서에서만 인용한다. 그 밖은 `ABSENT`. Role≠Permission≠Authority. 289차 확정분 재플래그 금지.

---

## ① 목적

Role Permission Snapshot = **특정 Role Version이 어떤 Permission Definition Version들에 어떤 방식으로 결합되었는지**를 그 시점 그대로 동결한 substrate. Role Snapshot(별편 1)의 `permission_mappings` 축을 **Permission 측 정본과 결합**해 상세화한다.

- **핵심**: Role→Permission 매핑은 현행 레포에 **3분산**되어 있다(전수조사 §2·§3 PARTIAL): `acl_permission`(menu×action)·`api_key roleRank→scope`·`admin_menus`. **단일 매핑 함수·버전 결합·스냅샷 부재**.
- Role Permission Snapshot은 **Permission Definition Version**을 결합하므로, 그 결합은 선행 Part 2 Permission Engine 실구현에 **BLOCKED_PREREQUISITE**. 본 편은 스냅샷 구조 계약만 규정.
- Role≠Permission: 본 스냅샷은 "Role이 어떤 Permission을 참조했는가"의 매핑 이력이지, Permission 자체의 정의(Part 2)도 실 Subject 부여(Part 3-3)도 아니다.

## ② Canonical 필드 (코드 0 · 구조 명세)

`ROLE_PERMISSION_SNAPSHOT` (전부 신규)

| # | 필드 | 의미 |
|---|---|---|
| 1 | role_permission_snapshot_id | 식별자 |
| 2 | tenant | 테넌트 스코프 |
| 3 | role_version_ref | 대상 Role Version(별편 2) |
| 4 | permission_definition_ref | 결합 대상 Permission Definition |
| 5 | permission_version_ref | 결합 대상 Permission Definition **Version**(Part 2·BLOCKED) |
| 6 | mapping_type | 결합 방식(③) |
| 7 | expected_effect | 기대 효과(ALLOW/DENY 등 · Effect≠실 판정) |
| 8 | scope_propagation | Scope 전파 규칙(Role Scope Requirement→Permission) |
| 9 | constraint_snapshot | 결합 제약 조건 동결(조건부 부여 등) |
| 10 | permission_risk | 결합 Permission의 리스크 등급 |
| 11 | permission_status | 결합 시점 Permission 상태 |
| 12 | captured_at | 캡처 시각 |
| 13 | immutable_digest | 결합 무결성 다이제스트(별편 6) |

## ③ 열거형 (설계 · 코드 0)

- **mapping_type**: `DIRECT`(역할 직접 부여) · `VIA_GROUP`(Permission Group 경유) · `VIA_BUNDLE`(Bundle 경유) · `INHERITED`(Part 3-2 Hierarchy 상속·예약) · `CONDITIONAL`(제약부)
- **expected_effect**: `ALLOW` · `DENY` · `CONDITIONAL`(실 판정 아님·Part 2 Permission Engine 소관)
- **permission_status**: `ACTIVE` · `DEPRECATED` · `RETIRED`(결합 시점 상태 동결)
- **scope_propagation**: `TENANT` · `DATA_SCOPE` · `TEAM` · `NONE`(Part 3-4에서 실 Scope 값 확정)

## ④ substrate 매핑 (§5.2 분류 + file:line · 없으면 ABSENT)

| Permission Snapshot 축 | 최근접 substrate | §5.2 태그 | file:line (2문서) | 판정 |
|---|---|---|---|---|
| mapping(DIRECT, menu×action) | `acl_permission` | PARTIAL(3분산 축1) | `TeamPermissions.php:39,152-159` | PARTIAL |
| scope_propagation(DATA_SCOPE) | `data_scope`(9dims 행필터) | PARTIAL | `TeamPermissions.php:41,218-322` | PARTIAL |
| mapping(api rank→scope) | `roleRank`→scope | PARTIAL(3분산 축2) | `index.php:573`·`Keys.php:189-194` | PARTIAL |
| mapping(admin menu) | `admin_menus`(JSON) | PARTIAL(3분산 축3) | `AdminMenu.php:247`·`UserAdmin.php:43-46` | PARTIAL |
| **permission_version_ref** | — | — | **ABSENT**(Part 2·버전 결합) | **BLOCKED_PREREQUISITE** |
| **매핑 스냅샷/시점 동결** | — | — | **ABSENT** | **ABSENT(순신규)** |
| constraint_snapshot | — | — | **ABSENT** | **ABSENT** |
| immutable_digest | — | — | **ABSENT**(개념=선행 Hash Chain 봉인기) | **ABSENT** |

> ★3분산 통합이 본 스냅샷의 실무 핵심이다. 단 세 축은 **정책 소비지 미러**이지 중복 Registry가 아니다(ADR §5.2·D-3). 통합은 확장이지 신설·대체 아님.

## ⑤ 설계원칙

- **단일 매핑 함수로 통합**: 3분산(acl_permission·roleRank→scope·admin_menus)을 Role→Permission Version Mapping으로 통합. 4번째 매핑 저장소 신설 금지(Golden Rule).
- **Permission Version 결합**: 매핑은 Permission **Version**을 가리켜야 함(Part 2 확정 전 BLOCKED). Version 없는 매핑은 감사 재현 불가.
- **불변 동결**: 결합 시점의 effect·risk·status·constraint를 통째로 동결. 이후 Permission 변경은 새 스냅샷.
- **Effect≠실 판정**: `expected_effect`는 결합 의도이며, 런타임 인가 판정은 Part 2 Permission Engine 소관. Role≠Permission.
- **Golden Rule**: `immutable_digest`=선행 Canonical Cryptographic Hash Chain 봉인기 개념 재사용(별편 6).

## ⑥ Gap

- 단일 Role→Permission 매핑 함수·매핑 스냅샷·시점 동결 = **ABSENT**(3분산 상태).
- Permission Definition **Version** 결합 = **BLOCKED_PREREQUISITE**(Part 2 Permission Engine 실구현 부재).
- constraint_snapshot·scope_propagation 실값 = **ABSENT**(Part 3-4 Scoped Role).
- 실 매핑 통합 엔진 = **별도 승인세션(RP-002)**. 본 편 **코드/DB 0 · NOT_CERTIFIED**.

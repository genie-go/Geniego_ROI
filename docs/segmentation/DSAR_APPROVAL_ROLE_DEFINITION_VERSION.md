# DSAR — Approval Role Definition Version (EPIC 06-A-03-02-03-04 Part 3-1 · per-entity: Role Definition Version)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2) 실 구현 부재
- **불변**: Role ≠ Permission ≠ Authority ≠ Job Title ≠ Plan · Golden Rule(Extend not Replace) · **In-place Update 금지·순신규** · 반날조(substrate file:line은 상위 ADR·전수조사 2문서만·없으면 ABSENT)

---

## 1. 목적

Role Definition Version은 **Role Definition의 매 변경을 순신규 불변 버전으로 봉인**하는 엔티티다. 현재 Role은 하드코딩 enum·컬럼값이라 정의가 바뀌면 과거 값이 흔적 없이 사라지고, 과거 인가 판정의 근거 Role 정의를 복원할 수 없다. 본 엔티티는 **In-place Update를 금지**하고 이름/permission/scope 요구/risk/owner/보안 강화/폐기 같은 모든 변경을 **type 태그된 신규 Version**으로 적재하여, 과거 결정의 근거를 불변 digest로 보존한다(Historical Immutability §6.17). 실 Permission diff 봉인은 선행 Permission Engine 이후 가능하나, Version 골격·불변 규약은 지금 정의한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `role_version_id` | Version 식별자(PK) |
| `role_definition_id` | 대상 Definition 참조 |
| `version_number` | 순증 버전 번호 |
| `previous_version` | 직전 Version 참조(체인) |
| `change_type` | 변경 유형(§3) |
| `name_snapshot` | 이름/약칭/설명 스냅샷 |
| `type_category_snapshot` | Type/Category/Domain 스냅샷 |
| `actor_eligibility_snapshot` | actor 적격 스냅샷 |
| `risk_criticality_snapshot` | risk/criticality 스냅샷 |
| `scope_requirement_snapshot` | Scope 요구 스냅샷 |
| `permission_mapping_ref` | 결합 Permission Version 참조(BLOCKED_PREREQUISITE) |
| `effective_from` / `effective_to` | 유효 구간 |
| `created_by` / `reviewed_by` / `approved_by` | 작성·검토·승인 actor |
| `change_summary` | 변경 요약 |
| `migration_policy` | 기존 Assignment 이관 정책 |
| `immutable_digest` | 불변 digest(무결성 봉인) |
| `rollback_version` | 롤백 대상 Version(신규 Version으로만) |

## 3. 열거형 / 타입

- **`change_type`**: `INITIAL` · `NAME` · `PERMISSION_ADD` · `PERMISSION_REMOVE` · `SCOPE_REQUIREMENT_CHANGE` · `RISK_CHANGE` · `CRITICALITY_CHANGE` · `ACTOR_ELIGIBILITY_CHANGE` · `OWNER_CHANGE` · `CATEGORY_CHANGE` · `TYPE_CHANGE` · `SECURITY_HARDENING` · `DEPRECATION` · `RETIREMENT` · `MIGRATION` · `ROLLBACK` · `CUSTOM`.
- **불변 규약**: 모든 `change_type`은 **기존 Version을 수정하지 않고 신규 Version 레코드로 적재**(In-place Update 금지). `effective_to`는 후속 Version 발효 시에만 설정.
- **Rollback**은 과거 Version 재활성이 아니라 **동일 내용의 신규 Version(ROLLBACK)** 발행(이력 보존).

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| Role Version(불변 이력) | **ABSENT → 신설** | 버전 컬럼/개념 없음 |
| 정의 저장 방식 | 하드코딩 enum/컬럼(비버전) | team_role(`UserAuth.php:188`)·api_key role(`Keys.php:95`)·admin_level(`UserAdmin.php:43-46`)·AdminMenu enum(`AdminMenu.php:247`) |
| 변경 로그(유일 인접) | Evidence 부분(변경 로그만) | auth_audit_log — 정의 스냅샷 아님(전수조사 §3 Evidence=PARTIAL) |
| `version_number` / `previous_version` / `change_type` | **ABSENT** | 없음 |
| `*_snapshot` / `effective_from/to` / `immutable_digest` | **ABSENT** | 스냅샷·digest 전무 |
| `created_by` / `reviewed_by` / `approved_by` | **ABSENT** | Role 정의 변경 승인 주체 개념 없음 |

★현행은 Role 정의가 바뀌면 이전 값이 **버전 없이 덮어써진다**(하드코딩 enum). auth_audit_log는 접근/변경 로그일 뿐 Role 정의 스냅샷이 아니어서 과거 정의 복원 불가.

## 5. 설계 원칙

1. **In-place Update 금지·순신규** — 모든 변경은 신규 Version. 기존 Version 불변.
2. **Historical Immutability(§6.17)** — 과거 인가 판정의 근거 Role 정의를 후속 변경이 덮어쓰지 못함. digest로 봉인.
3. **Snapshot 완전성** — 이름·type·actor 적격·risk·scope 요구를 Version에 스냅샷(부분 스냅샷 금지).
4. **승인 체인** — created/reviewed/approved_by 기록·SECURITY_HARDENING/RETIREMENT 등 고위험 변경은 승인 필수.
5. **Rollback도 신규 Version** — 과거 Version 재활성 금지, ROLLBACK type 신규 발행.
6. **Migration 명시** — 정의 변경 시 기존 Assignment 이관 정책(migration_policy) 필수(실 Assignment=Part 3-3).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: `permission_mapping_ref`(Permission Version 결합)는 선행 Part 2 Permission Engine 실 구현 이후 가능. 본 차수 코드 0.
- **Gap-1(ABSENT)**: version_number·previous_version·change_type·snapshot·immutable_digest 전무 — 순신설. 정의 변경 시 이전 값 소실(하드코딩 enum 덮어쓰기).
- **Gap-2(Evidence PARTIAL)**: auth_audit_log가 유일 인접이나 접근/변경 로그일 뿐 Role 정의 스냅샷 아님 → 과거 정의 복원 불가.
- **정직 부재**: Job Title/Position 버전 개념 전무(ABSENT·해당 없음). admin_roles/user_roles 폐기분 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 별도 승인세션(RP-002).

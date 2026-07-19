# DSAR — Role Replacement (EPIC 06-A-03-02-03-04 Part 3-1)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
> **상위 ADR**: [ADR_DSAR_ROLE_REGISTRY_FOUNDATION](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
> **GROUND_TRUTH 인용원**: [DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md) — 반날조: `file:line`은 본 GROUND_TRUTH·상위 ADR에 실재하는 것만, 없으면 **ABSENT**.

---

## ① 목적

Canonical Role의 **교체·승계 관계(Replacement)** 를 정의한다. Role이 폐기·분할·병합·개명될 때 구 Role → 신 Role의 관계, 발효일, 배정 이관 필요 여부, Permission/Scope/Risk 등가성, 자동 마이그레이션 허용 여부, 수동 검토 필요 여부를 **명시적 레코드**로 남긴다. Replacement는 Role Lifecycle(Draft~Archived)의 전이를 안전하게 만들고, 폐기된 Role에 남은 배정이 은밀히 끊기거나 과대 권한으로 잘못 이관되는 것을 방지한다.

★**Role Split/Merge 시 자동 Assignment Migration은 기본 금지(default deny).** 분할/병합은 권한 경계를 바꾸므로 등가성이 증명되지 않는 한 자동 이관을 막고 수동 검토를 요구한다.

## ② Canonical 필드

| 필드 | 설명 |
|---|---|
| `old_role_ref` | 교체되는 구 Canonical Role(코드+버전) |
| `new_role_ref` | 승계 신 Canonical Role(코드+버전·DEPRECATED_WITHOUT_REPLACEMENT면 null) |
| `replacement_type` | 교체 유형(③) |
| `effective_date` | 발효일 |
| `assignment_migration_required` | 배정 이관 필요 여부 |
| `permission_equivalence` | 구↔신 Permission 등가성(EQUAL/SUBSET/SUPERSET/DIVERGENT) |
| `scope_equivalence` | Scope Requirement 등가성 |
| `risk_equivalence` | 위험/criticality 등가성 |
| `automatic_migration_allowed` | 자동 배정 이관 허용 여부(Split/Merge 기본 false) |
| `manual_review_required` | 수동 검토 필수 여부 |
| `digest` | Replacement 레코드 스냅샷 해시(불변 이력) |

## ③ 열거형

**`replacement_type`**:
`SUPERSEDED_BY` · `SPLIT_INTO`(1→N) · `MERGED_INTO`(N→1) · `RENAMED_TO` · `REPLACED_BY` · `DEPRECATED_WITHOUT_REPLACEMENT` · `CUSTOM`

- `RENAMED_TO`: 순수 개명(Permission/Scope 불변) — `automatic_migration_allowed` 후보(등가 증명 시).
- `SPLIT_INTO`/`MERGED_INTO`: ★권한 경계 변화 → `automatic_migration_allowed=false` 기본·`manual_review_required=true`.
- `DEPRECATED_WITHOUT_REPLACEMENT`: 승계 없이 폐기 → 잔존 배정은 회수(신규 배정 차단·기존 검토 후 제거).

## ④ substrate 매핑 (§5.2 + file:line·없으면 ABSENT)

| Canonical 요소 | 실존 substrate | file:line | 판정 |
|---|---|---|---|
| Role 교체/승계 레코드 전반 | — | **ABSENT** | Role Replacement/Migration 개념 전무(ADR §1 "…Migration…순신규") |
| replacement_type(split/merge/rename) | — | **ABSENT** | 분할/병합/개명 관계 표현 없음 |
| (인접) 실제 폐기 사례 | **admin_roles/user_roles 폐기(289차)** | `routes.php:1670` · `UserAdmin.php:596-599` | DORMANT로 판정·제거된 유일 role-mgmt 시도. **비정형 DEPRECATED_WITHOUT_REPLACEMENT 유사 사례**이나 Replacement 레코드가 아니라 코드 제거+고아 테이블 유지. 289차 처리완료(재플래그·재부활 금지). |
| (인접) AdminMenu ROLE_ENUM 정합 필요 | AdminMenu required_role vs 게이트 rank 불일치 | `AdminMenu.php:247`(ROLE_ENUM) · `:74`(rank map) | CONSOLIDATION_REQUIRED(반쯤 死)=향후 MERGED_INTO 후보이나 Replacement 레코드 부재 |
| assignment_migration / equivalence | — | **ABSENT** | 배정 이관·등가성 검증 없음(Assignment 엔티티 자체 ABSENT) |
| digest(불변 이력) | — | **ABSENT** | 교체 스냅샷 없음(Snapshot=ABSENT, GROUND_TRUTH §3) |

→ Role Replacement는 **순신규**. 유일한 인접 사례는 admin_roles/user_roles 폐기(289차)이나 이는 정형 Replacement 레코드가 아니라 코드 제거·고아 테이블 유지이며 이미 처리완료(재플래그 금지).

## ⑤ 설계원칙

- **★Split/Merge 자동 이관 default deny**: 권한 경계 변화 유형은 등가성(Permission/Scope/Risk)이 증명되지 않는 한 자동 배정 이관 금지·수동 검토 필수. 과대 권한 은밀 이관 차단(fail-closed).
- **Golden Rule(Extend not Replace·문서 계층)**: AdminMenu ROLE_ENUM↔게이트 rank 불일치(`AdminMenu.php:247`·`:74`)의 정합은 신규 어휘 발명이 아니라 Canonical Role로의 MERGED_INTO/CONSOLIDATION으로 처리(ADR §5.2). 폐기 admin_roles 재부활 금지.
- **무후퇴·Historical Immutability**: Replacement는 in-place 삭제 금지. `old_role_ref`·`digest`로 과거 배정·결정 시점 재구성 가능. 발효일 이전 결정의 근거 Role은 보존.
- **Role≠Permission≠Authority≠JobTitle≠Plan**: 등가성 판정은 Role↔Role Permission Mapping 비교이지 Plan/직책 비교가 아니다. `RENAMED_TO`라도 Permission이 바뀌면 등가 아님.
- **DEPRECATED_WITHOUT_REPLACEMENT 안전**: 승계 없는 폐기는 잔존 배정을 침묵으로 끊지 말고 명시 회수·검토(가짜 정상 금지).

## ⑥ Gap

- **엔진 전무**: Replacement 레코드·등가성 검증·이관 정책·digest 미구현(코드 0).
- **BLOCKED_PREREQUISITE (RP-002)**: `old/new_role_ref`가 결속할 Canonical Role Registry(ABSENT), `assignment_migration_required`가 이관할 Assignment 엔티티(Part 3-3 ABSENT), `permission_equivalence`가 비교할 Permission Mapping(Part 2 ABSENT) 모두 선행. 교체할 정본 Role이 아직 없다.
- **cover: 0** — 설계 명세·NOT_CERTIFIED. 정형 Replacement 레코드로 관리되는 Role 교체 없음.
- **289차 재플래그 금지**: admin_roles/user_roles 폐기·AdminMenu rank 불일치는 이미 289차/ADR에서 판정·등재 완료. Replacement 부재를 그 코드의 결함으로 재플래그하지 않는다.

관련: [[DSAR_APPROVAL_ROLE_ALIAS]] · [[DSAR_APPROVAL_ROLE_TAG]] · [[DSAR_APPROVAL_ROLE_ASSIGNMENT]] · [[ADR_DSAR_ROLE_REGISTRY_FOUNDATION]].

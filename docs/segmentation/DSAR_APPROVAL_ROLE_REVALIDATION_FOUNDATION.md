# DSAR — Role Registry Revalidation Foundation (EPIC 06-A-03-02-03-04 Part 3-1 · per-entity 설계)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 선행 Decision Core + Permission Engine 실 구현 후 별도 승인세션)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **전수조사(ⓑ)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **반날조 규율**: 모든 `file:line`은 위 2문서에서만 인용. 없으면 **ABSENT**. Role≠Permission≠Authority. 289차 폐기 `admin_roles`/`user_roles` 재부활·재플래그 금지.

---

## 1. 목적 (Purpose)

Drift·정책 변경·주기 도래·사건(Incident)·변조 의심(Tamper) 등이 발생했을 때, 영향받는 Role Definition을 **다시 검증·재확정하는 절차 엔티티**를 설계 정본으로 정의한다.

★핵심 무후퇴 원칙: Revalidation은 **기존 Role Version을 절대 수정하지 않는다**. 항상 **새 Version 또는 새 Revalidation Record를 생성**한다(Historical Immutability·§D-6). 재검증 실패 시 fail-closed(runtime block)로 귀결하며, "역할을 조용히 바꿔 통과"시키지 않는다. 순신규 — 현행 substrate에 역할 재검증/스냅샷 개념 ABSENT(`EXISTING_IMPLEMENTATION §3`).

## 2. Canonical 필드 (Revalidation Record)

| 필드 | 설명 |
|---|---|
| revalidation_id | 재검증 레코드 식별자 |
| trigger | 아래 열거형 |
| role_definition_id / role_version | 대상 Role Definition·재검증 시점 버전 |
| triggered_by | Drift Record·정책 이벤트·주체 참조 |
| outcome | `REVALIDATED` · `NEW_VERSION_REQUIRED` · `SUSPEND` · `DEPRECATE` · `RETIRE` · `BLOCKED` |
| new_version_ref | 재검증 결과 생성된 신 Version 참조(In-place 금지 증거) |
| runtime_blocked | 재검증 미완/실패 시 런타임 차단 여부 |
| evidence_ref | 재검증 근거·감사 참조(auth_audit_log 계승) |

## 3. 열거형 (Trigger)

- `ROLE_VERSION_CHANGED` · `PERMISSION_VERSION_CHANGED`
- `PERMISSION_RETIRED`
- `PERMISSION_GROUP_CHANGED` · `PERMISSION_BUNDLE_CHANGED`
- `ROLE_SUSPENDED` · `ROLE_REACTIVATED` · `ROLE_DEPRECATED` · `ROLE_RETIRED`
- `OWNER_CHANGED` · `SCOPE_REQUIREMENT_CHANGED` · `ACTOR_ELIGIBILITY_CHANGED` · `ASSIGNMENT_POLICY_CHANGED` · `RISK_CHANGED`
- `REVIEW_OVERDUE` · `CERTIFICATION_OVERDUE`
- `MANUAL` · `INCIDENT` · `TAMPER`

## 4. Substrate 매핑 (§5.2 + file:line)

| Trigger | 실존 substrate | file:line | 태그 |
|---|---|---|---|
| ROLE_SUSPENDED/REACTIVATED (판정 SSOT) | isMaster/requireMasterAdmin·신규 admin=sub 강제 | `UserAdmin.php:43-46,50`·`:298-301,436-438` | SUB_ROLE_CANDIDATE |
| SCOPE_REQUIREMENT_CHANGED | data_scope 행필터 | `TeamPermissions.php:41,218-322` | PARTIAL |
| PERMISSION_VERSION_CHANGED | acl_permission | `TeamPermissions.php:39,152-159` | PARTIAL(버전 없음) |
| ACTOR_ELIGIBILITY_CHANGED | api_key role·defaultScopes | `Keys.php:95,189-194` | CANONICAL(API_CLIENT) |
| ROLE_REACTIVATED via SSO | roleForGroups(IdP 그룹→role) | `EnterpriseAuth.php:78-88` | VALIDATED_IAM(Adapter) |
| evidence_ref | auth_audit_log | `EXISTING_IMPLEMENTATION §1.1,§3` | 변경 로그(PARTIAL) |
| ROLE_VERSION_CHANGED / new_version_ref | 버전화 개념 | ABSENT | 순신규 |
| REVIEW_OVERDUE / CERTIFICATION_OVERDUE | Review/Certification 개념 | ABSENT | 순신규 |
| RISK_CHANGED / OWNER_CHANGED | Risk·Owner 개념 | ABSENT | 순신규 |
| TAMPER | 역할 스냅샷 무결성 | ABSENT | 순신규(정본=Part 2/SecurityAudit 계열) |

## 5. 설계 원칙 (Design Principles)

- **★기존 Role Version 수정 금지 → 새 Version/Record 생성**: In-place Update 절대 금지. 재검증 결과는 새 버전으로 이어지며 이전 버전은 불변 이력으로 보존(무후퇴·Historical Immutability).
- **Fail-closed 귀결**: 재검증 미완/실패 시 runtime_blocked=true. `roleOf` fail-closed(`TeamPermissions.php:120-131`)·Retired Runtime Block(§D-6) 계승.
- **Role≠Permission≠Authority**: Permission Retired/Version 트리거는 Role 재검증을 유발하되, Permission 자체 재검증은 Part 2 Permission Engine 소유(경계 유지). Role 재검증이 Approval Authority(Part 5)를 재부여하지 않는다.
- **오탐 방지**: `admin_roles`/`user_roles`(289차 폐기) 관련 트리거 신설 금지. plan god flag 누출은 재검증 대상이 아니라 §D-2 후속 정합.

## 6. Gap

- Role Version/Snapshot 순신규 → `new_version_ref` 생성 기반 부재(BLOCKED_PREREQUISITE).
- Review/Certification/Risk/Owner substrate 부재 → `REVIEW_OVERDUE`·`CERTIFICATION_OVERDUE`·`RISK_CHANGED`·`OWNER_CHANGED` 트리거 순신규.
- Permission Version/Group/Bundle 트리거는 선행 Part 2 실구현 후 가능.
- TAMPER 트리거의 무결성 검증 정본은 별도(Part 2 Snapshot/Evidence·SecurityAudit 계열)와 정합 — 이번 차수 미확정. 실 엔진=RP-002 별도 승인세션.

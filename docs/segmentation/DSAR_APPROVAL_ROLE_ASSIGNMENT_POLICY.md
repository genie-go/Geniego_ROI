# DSAR — Approval Role Assignment Policy (per-entity 설계 명세)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 실 엔진은 선행 Permission Engine 실구현 + 별도 승인세션)
- **상위 ADR**: [`../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **ⓑ GROUND_TRUTH**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **★범위 경계**: 본 Part는 **Assignment Policy(정책 계약)만** 정의한다. **실 Role Assignment Table 생성·부여 실행은 Part 3-3**(신설 금지). 여기서는 "어떤 부여가 허용/금지되며 어떤 승인·증거·기간·검토를 요구하는가"의 **정책 스키마**만 설계한다.

> **반날조 규율**: `파일:라인`은 위 2문서(ADR·ⓑ GROUND_TRUTH)에서 확인된 것만 인용한다. 확인 불가 substrate는 **ABSENT**로 표기한다. Role ≠ Permission ≠ Authority. 289차 확정분(admin_roles/user_roles 폐기·P1~P4 수정) 재플래그 금지.

---

## ① 목적

Canonical Role이 subject(사용자/그룹/API_CLIENT/서비스)에게 **어떤 조건으로 배정될 수 있는지**를 규정하는 **Assignment Policy 계약**을 정형화한다. 현행 substrate에서 role은 `app_user.team_role` 단순 컬럼값(`UserAuth.php:188`)으로, **누가·언제·왜·누구 승인으로 부여했는가의 기록 구조가 전무**하다(ⓑ §3 Owner/Snapshot/Evidence=ABSENT). 본 정책은 부여의 **허용 여부·승인 요구·검토·증거·기간·해지 동작**을 Role Definition에 결합하되, **실 배정 데이터는 생성하지 않는다**(Foundation only). 이후 Part 3-3 Assignment Engine이 이 정책을 소비하여 실 배정을 집행한다.

## ② Canonical 필드

| 필드 | 의미 |
|---|---|
| `role_definition_ref` | 대상 Canonical Role Definition(`{DOMAIN}:{FUNCTION}:{ROLE}`)·version 결합 |
| `direct_assignment_allowed` | subject 직접 배정 허용 |
| `group_assignment_allowed` | 그룹/team 단위 배정 허용(SSO group→role Adapter 결합) |
| `bulk_assignment_allowed` | 대량 배정 허용 |
| `automatic_assignment_allowed` | 규칙 기반 자동 배정 허용 |
| `dynamic_assignment_allowed` | 컨텍스트 기반 동적 배정 허용(실구현 Part 3-5) |
| `temporary_assignment_allowed` | 한시 배정 허용(정책 상세 = Temporary Assignment Policy 문서) |
| `emergency_assignment_allowed` | 긴급 배정 허용(정책 상세 = Emergency Assignment Policy 문서) |
| `delegated_assignment_allowed` | 위임 배정 허용(정책 상세 = Delegation Policy 문서) |
| `self_assignment_allowed` | **자기 배정 허용(기본 false)** |
| `manager_assignment_allowed` | manager 계층의 하위 배정 허용 |
| `administrator_assignment_allowed` | 관리자(admin_level=master/sub) 배정 허용 |
| `approval_required` | 배정 시 승인 필요 여부 |
| `approval_route_ref` | 승인 경로 참조(Approval Workflow — 본 Part 미정의) |
| `min_approver_count` | 최소 승인자 수(High/Critical=≥1 Owner) |
| `security_owner_review_required` | Security Owner 검토 필수 |
| `compliance_owner_review_required` | Compliance Owner 검토 필수 |
| `business_owner_review_required` | Business Owner 검토 필수 |
| `max_assignment_duration` | 최대 배정 유효기간(무기한 금지 대상은 Temporary 문서) |
| `review_due` | 정기 재인증 주기 |
| `certification_required` | 재인증(Access Certification) 필수 |
| `scope_required` | 배정 시 Scope 지정 필수(tenant/data_scope/team — 실 Scope=Part 3-4) |
| `reason_required` | 배정 사유 필수 |
| `evidence_required` | 증거(요청·승인·근거) 캡처 필수 |
| `revocation_behavior` | 해지 시 동작(즉시 차단·캐시 무효화) |
| `suspension_behavior` | 정지 시 동작(일시 무효·복원 조건) |
| `digest` | 정책 스냅샷 무결성 digest(불변) |

## ③ 열거형

- **AssignmentMethod**: `DIRECT` · `GROUP` · `BULK` · `AUTOMATIC` · `DYNAMIC` · `TEMPORARY` · `EMERGENCY` · `DELEGATED` · `SELF` · `MANAGER` · `ADMINISTRATOR`
- **ApprovalRequirement**: `NONE` · `SINGLE` · `MULTI` · `OWNER_MANDATORY`(High/Critical)
- **OwnerReviewType**: `SECURITY` · `COMPLIANCE` · `BUSINESS`
- **RevocationBehavior**: `IMMEDIATE_BLOCK` · `CACHE_INVALIDATE` · `GRACE_THEN_BLOCK`
- **SuspensionBehavior**: `TEMPORARY_DISABLE` · `RESTORE_ON_CONDITION`
- **AssignmentRiskGate**: `LOW`(정책상 승인 생략 가능) · `MEDIUM` · `HIGH`(Owner 승인 필수) · `CRITICAL`(Owner 승인 필수)

## ④ substrate 매핑 (§5.2)

| Canonical 정책 요소 | 현행 substrate | §5.2 분류 | file:line |
|---|---|---|---|
| Role 위계(부여 상한의 기반) | `team_role`(owner/manager/member) | CANONICAL_ROLE_REGISTRY_CANDIDATE | `UserAuth.php:188`·도출 `:316` |
| roleOf 정규화(fail-closed→member) | `TeamPermissions::roleOf` | 정책 소비지 미러 | `TeamPermissions.php:120-131` |
| **위임/부여 쓰기 상한** | `TEAM_OWNER_ONLY` · `teamCanWrite` · `requireTeamWrite` | CANONICAL_ROLE_REGISTRY_CANDIDATE(확장) | `UserAuth.php:1117` · `:1125` · `:1134` |
| administrator 배정 세분(master/sub) | `admin_level` · 권한상승차단(신규 admin=sub 강제) | SUB_ROLE_CANDIDATE | `UserAdmin.php:43-46` · `:298-301,436-438` |
| API_CLIENT 배정 축 | `api_key.role`(viewer~admin) | CANONICAL(별개 actor) | `Keys.php:95` · `index.php:573` |
| group→role 자동 배정 Adapter | `sso_group_role_map` · `roleForGroups` | VALIDATED_IAM(Adapter) | `EnterpriseAuth.php:70-88` |
| approval_required / approval_route_ref | — | ABSENT | ABSENT |
| min_approver_count / owner review | — | ABSENT | ABSENT |
| max_assignment_duration / review_due / certification | — | ABSENT | ABSENT |
| reason / evidence / digest / snapshot | (auth_audit_log=변경 로그만) | PARTIAL(Evidence) | ⓑ §3 |

## ⑤ 설계원칙

1. **Self Assignment 기본 금지** — `self_assignment_allowed` 기본 false. `assigned_by == subject`인 자기 권한 상향은 정책상 차단(Maker-Checker 상세는 Approval Workflow Part).
2. **High/Critical Role = Owner 승인 필수** — `AssignmentRiskGate` HIGH/CRITICAL은 `min_approver_count≥1` + Owner review 없이는 배정 정책 통과 불가.
3. **★Role Assignment Table 생성 안 함** — 본 Part는 **Assignment Policy 스키마만**. 실 배정 행·부여 실행·이력 테이블은 **Part 3-3**. 여기서 배정을 집행하면 범위 위반.
4. **Golden Rule(Extend not Replace)** — 부여 쓰기 상한은 실존 `TEAM_OWNER_ONLY`/`requireTeamWrite`(`UserAuth.php:1117`·`:1134`) 위임 게이트를 **확장**한다. 별도 부여 게이트 신설 금지. impersonate 경로의 `impersonated_by` 보존(289차 P4)은 **참조·보존**하며 본 정책이 무력화하지 않는다.
5. **Reason·Evidence·Scope 없는 배정 금지** — `reason_required`·`evidence_required`·`scope_required` 미충족 배정은 정책상 거부(fail-closed).
6. **무후퇴** — 현행 team_role 3값 위계의 실효 동작(fail-closed 정규화·acl_permission 매핑)은 Canonical 정책 도입 후에도 동등 보존.

## ⑥ Gap

| 능력 | 상태 | 근거 |
|---|---|---|
| Assignment approval / route / min approver | ABSENT | ⓑ §3 Owner=ABSENT |
| Owner review(Security/Compliance/Business) | ABSENT | ⓑ §2 Owner 개념 부재 |
| max duration / review due / certification | ABSENT | ⓑ §3 Lifecycle=ABSENT |
| reason / evidence / digest / snapshot | PARTIAL | auth_audit_log=변경 로그만(ⓑ §3) |
| Self/Manager/Administrator assignment 정책 분리 | ABSENT | team_role=단순 컬럼값 |
| **선행 전제** | BLOCKED_PREREQUISITE | 실 배정 집행=Part 3-3 · Permission Version 결합=선행 Part 2(RP-002) |

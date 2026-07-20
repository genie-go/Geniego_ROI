# DSAR — Runtime SoD Enforcement: 권한 충돌 (APPROVAL_SOD_PERMISSION_CONFLICT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SOD_PERMISSION_CONFLICT`(SPEC §2·§13)는 **한 사용자가 상충하는 개별 권한(Permission) 쌍을 동시에 보유·행사하는지**를 판정·차단하는 SoD 하위 엔티티다. SPEC §13이 열거하는 상충 권한쌍:

- Read ↔ Audit Approval
- Create ↔ Approve
- Register ↔ Close
- Issue ↔ Revoke
- Configure ↔ Certify

Role 단위(§3 Role vs Role)가 아니라 **Permission 원자 단위**의 상충을 대상으로 하며, 평가 시점은 Static(§4 Permission 생성)·Runtime(§6 매 요청 인가 계산)이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 상태 | 근거(파일:라인) |
|---|---|---|
| Permission Conflict Engine (`evaluateConflict`/`conflictMatrix`) | **ABSENT** | grep 0 (GT② §2·§B-2 인접표 밖) |
| Static SoD (Permission 생성 시 상충차단) | **ABSENT** | `TeamPermissions.php:599-621`·`:642-658`는 위임상한 클램프뿐 — 상충 권한 차단 아님. `acl_permission`=menu×action 매트릭스지 SoD 매트릭스 아님 (GT② §2) |
| 런타임 인가 게이트 (SoD 삽입지점) | PRESENT | 중앙 RBAC `index.php:572-611`·AI보조 `:430-460`·`guardTeamWrite` `UserAuth.php:1167-1186`(전역 `index.php:82`) — 스코프 인가지 권한 상충평가 아님 |
| 권한/역할 표 | PRESENT | `UserAuth.php:1119-1131` owner>manager>member 정적표·`:1117`·`:1134-1147` TEAM_OWNER_ONLY (GT① §C) |

판정: Permission 상충평가 계층 **전면 ABSENT(그린필드)**. 재활용 가능 substrate = §C 인가 게이트(PEP 삽입지점).

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**: `left_permission`·`right_permission`·`conflict_type`(§14 Permission vs Permission)·`severity`(§15 Low~Regulatory)·`resolution_strategy`(§16 Block/Challenge/Approval/Escalation/Override/Break-Glass).
- **평가 계약**: 정적 RBAC 판정(`index.php:572-611`) **후** 활성 권한집합을 Conflict Matrix에 조회, 상충 쌍 발견 시 §33 `SOD_CONFLICT_DETECTED` 반환(ADR D-1).
- **제약**: §36 Immutable Conflict Rule(불변버전)·Tenant Isolation. 성능 §38 Conflict Lookup ≤5ms·Runtime Eval ≤10ms.
- **증거**: 충돌 판정 시 SecurityAudit 불변체인(`SecurityAudit.php:14-33`) 기록(ADR D-5).

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **`acl_permission` menu×action 매트릭스** — 권한 부여 매트릭스지 SoD 상충 매트릭스 아님(GT② §2). 개명·흡수 금지.
- **위임상한 클램프** `TeamPermissions.php:599-621`·`:642-658` — privilege-escalation 방지지 permission-conflict SoD 아님(GT② §B-4).
- **HTTP 409 "conflict"** 41개 파일 — sync/merge conflict decoy(GT② §B-1).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**NOT_CERTIFIED · 코드 0.** Permission Conflict Engine·Static/Runtime 상충평가 = **순신규(ABSENT·grep 0)**. 재활용(Extend, 대체 아님) = §C RBAC/ABAC PEP 게이트에 평가층 삽입(ADR D-1)·SecurityAudit 증거(D-5). 선행의존: Part 1~3-9 인증 + Conflict Matrix/Rule Registry(§2) 신설 완료 후 실 구현(BLOCKED_PREREQUISITE). 무후퇴: 기존 인가 게이트 파괴 없이 병행.

# DSAR — Runtime SoD Enforcement: 세션 충돌 (APPROVAL_SOD_SESSION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SOD_SESSION`은 SPEC §9(Session Conflict) 및 §5(Dynamic SoD·Session/Runtime Role)의 세션 시점 SoD 대상이다. 하나의 활성 세션 안에서 **동시에 보유·활성화된 상충 직무 조합**을 탐지한다. SPEC §9 탐지 대상:

- 동시에 활성화된 Role
- Runtime Dynamic Role
- Temporary Assignment
- Emergency Role

즉 "한 세션이 상충하는 역할을 동시에 활성화하고 있는가"를 판정하며, SPEC §23(Conflict Snapshot)의 Active Roles/Permissions/Scope 스냅샷을 데이터 기반으로 삼는다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 요소 | 판정 | 근거(GT file:line) |
|---|---|---|
| 세션 페이로드 역할 표현 | **PARTIAL** | 세션은 사용자당 **단일 team_role**만 실음 — `UserAuth.php:263-316`(조회 join·`:316` team_role 파생)(GT① §D) |
| 세션 발급 | PARTIAL | `UserAuth.php:609`·`:990`(GT① §D) |
| 세션 페이로드 구성 | 공백 | `UserAuth.php:691`·`:1019` — plan·team_role만 실음, Session Conflict 기반 부재(GT① §D) |
| 다중 활성역할 데이터 기반 | **ABSENT** | 세션 단일 team_role → 다중 활성역할·충돌평가 데이터 자체 부재(GT② §2 Dynamic SoD·`UserAuth.php:263-316`) |
| Emergency Role substrate | PRESENT(재활용) | break-glass `isMasterAuth` `UserAuth.php:790-801`(GT① §F) — Emergency Role 재활용 substrate |
| Active Roles 스냅샷(§23) | **ABSENT** | SoD 전용 Snapshot grep 0(GT② §2) |
| Session Conflict Engine | **ABSENT** | `roleConflict|conflictMatrix` grep 0(GT② §2) |

**핵심 공백**: 세션이 **단일 team_role**만 실어(`UserAuth.php:263-316`) "동시 활성 다중역할"이라는 SoD 판정의 전제 데이터가 없다(ADR §D-4).

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **입력**: 세션의 활성 역할·권한·스코프 집합(SPEC §23 Conflict Snapshot: Active Roles/Permissions/Scope/Session/Runtime Context/Conflict State). 이는 Effective Resolution(3-7)·JIT(3-9) 산출을 입력원으로 결합(ADR §D-6).
- **평가**: SPEC §9 4대상(동시활성 Role·Dynamic Role·Temporary Assignment·Emergency Role)을 Conflict Matrix(§14 Left/Right Entity·Conflict Type·Severity·Resolution)와 대조.
- **상태·해소**: SPEC §15 Severity(Low~Regulatory)·§16 Resolution(Block/Challenge/Approval Required/Escalation/Temporary Override/Break Glass).
- **선행 신설**: Active Role 스냅샷 데이터 기반이 **선행**(ADR §D-4). 세션 단일역할 구조로는 불가.
- **테넌트 격리**: 세션 tenant는 인증키 tenant_id 서버도출 강제(`index.php:614-619`)로 위조 불가 — SoD Snapshot도 이 격리 위에서 테넌트별 저장(SPEC §36 Tenant Isolation).
- **증거**: SoD 세션충돌 이벤트는 SecurityAudit 불변체인(`SecurityAudit.php:14-33`·`:56-69`) 재활용 기록(ADR §D-5).

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **위임상한 클램프 ≠ Session SoD**: `TeamPermissions.php:599-621`·`:642-658` `assignable` 클램프는 privilege-escalation 방지이지 세션 내 상충역할 동시보유 판정 아님(GT② B-4).
- **단일 team_role 표 ≠ 다중 활성역할**: `UserAuth.php:263-316`의 team_role은 owner>manager>member 정적 서열(GT① §C `:1119-1131`)이지 "동시 활성 상충 역할집합"이 아님.
- **break-glass = 보상통제 substrate**: `UserAuth.php:790-801`은 Emergency Role 재활용 대상이나, 로그인 통제이지 SoD 세션충돌 엔진 아님(GT② §3-5·ADR §D-5).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT(데이터 기반부터 신설)**. Session Conflict Engine·Active Role 스냅샷·다중 활성역할 표현 전부 grep 0(GT② §2). 유일 substrate는 세션 단일 team_role(PARTIAL)과 break-glass Emergency substrate(재활용).
- **선행 의존**: SPEC §23 Conflict Snapshot(Active Roles) 데이터 기반 신설이 선행(ADR §D-4). Part 1~3-9 인증 후 실구현(BLOCKED_PREREQUISITE).
- **무후퇴·Extend-only**: 세션 발급 경로(`UserAuth.php:609`·`:990`) 파괴 없이 활성역할 스냅샷층 추가.
- **코드 변경 0 · NOT_CERTIFIED**. 본 DSAR은 계약 확정용 설계 명세이며 실 엔진 구현은 별도 RP-track 승인세션 대상.

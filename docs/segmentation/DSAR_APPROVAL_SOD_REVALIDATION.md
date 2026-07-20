# DSAR — Runtime SoD Enforcement: 충돌 재검증 (APPROVAL_SOD_REVALIDATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SOD_REVALIDATION`(SPEC §2·§28)은 **인가 지형(landscape)이 변할 때 기존 SoD 판정을 다시 평가**하는 트리거 엔티티다. 이미 통과했던 조합이 규칙·정책 변경으로 상충 상태가 될 수 있으므로, 변경 이벤트마다 재검증을 촉발한다. SPEC §28은 5종 trigger를 지정한다.

| Trigger(§28) | 재검증 촉발 사유 |
|---|---|
| Role 변경 | 역할 정의/구성 변경 → 상충 조합 재판정 |
| Permission 변경 | 권한 부여/회수 변경 → Permission Conflict(§13) 재평가 |
| Policy 변경 | 정책 변경 → Runtime Evaluation baseline 갱신 |
| Runtime 변경 | 런타임 컨텍스트 변경 → Dynamic/Runtime SoD 재평가 |
| Organization 변경 | 조직 구조 변경 → Scope Conflict(§12) 재판정 |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(GT) |
|---|---|---|
| SoD 전용 Revalidation 스키마·트리거 코드경로 | **ABSENT(grep 0)** | GT② §2 "SoD 전용 …Revalidation… grep 0" · ADR §2.2 |
| 재검증 대상인 기존 SoD 판정 상태 | **ABSENT(순신규)** | GT① §1(Runtime Evaluator 부재)·GT② §2 |
| Role/Permission 변경 지점(재활용·트리거 소스) | PARTIAL | `UserAuth.php:1119-1131`(정적 역할표)·`index.php:572-611`(RBAC scope 게이트·GT① §C) — 변경 hook 삽입지점 |
| 정책/보상통제 변경 지점(재활용) | PARTIAL | `UserAuth.php:929-961`(MFA `mfa_policy` 테넌트별 강제·GT① §F) — Policy 변경 trigger 소스 |
| 조직/Assignment 스냅샷 | **공백** | `UserAuth.php:263-316`(세션 단일 team_role) — 다중 활성역할 재검증엔 Conflict Snapshot 선행(ADR §D-4) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드(안)**: `reval_id`·`tenant_id`·`trigger_kind`(Role/Perm/Policy/Runtime/Org)·`trigger_ref`·`affected_subjects`·`prev_verdict`·`new_verdict`·`triggered_at`·`status`(PENDING/COMPLETED).
- **트리거 모델**: 변경 이벤트 → 영향 subject 집합 도출 → Runtime Evaluation(§22) 재실행 → 새 상충 발견 시 §33 Error Contract(SOD_CONFLICT_DETECTED)·§34 Warning(Missing Review) 발행.
- **제약**: SPEC §36 Immutable Conflict Rule·Tenant Isolation. 재검증은 `index.php:614-619`(auth_tenant 서버도출·GT① §E) 스코프 한정.
- **증거**: 재검증 실행·verdict 전이는 `SecurityAudit.php:14-33`(GT① §F) 불변체인 append(ADR §D-5).

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **Revalidation은 순신규**: 동음이의 decoy가 없으나, 재검증을 트리거하는 변경 지점(RBAC 게이트·MFA policy)은 SoD 엔진이 아니라 **트리거 소스**일 뿐이다(ADR §D-1 Extend·개명 금지).
- **위임상한 클램프 흡수금지**: `TeamPermissions.php:599-621`·`:642-658`(assignable 클램프)는 권한상승 방지이지 SoD 재검증 트리거가 아니다(GT② B-4).
- **"conflict" 흡수금지**: 409/sync conflict(GT② B-1)를 재검증 대상 SoD 충돌로 오인 금지.

## 5. 판정 (NOT_CERTIFIED · ABSENT-순신규 · 선행의존)

**APPROVAL_SOD_REVALIDATION = ABSENT(순신규).** SoD 전용 Revalidation 트리거·스키마 grep 0(GT② §2). 재검증 대상인 SoD 판정 상태(Runtime Evaluator)가 선행 부재 — **선행 의존**: Runtime Evaluator(ADR §D-1)·Conflict Snapshot(ADR §D-4) 신설 후. 재활용: RBAC/MFA 변경 지점(트리거 소스)·SecurityAudit(증거)·cross-tenant(격리). 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(Part 1~3-9 인증 후 RP-track).

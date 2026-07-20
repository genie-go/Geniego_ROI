# DSAR — Runtime SoD Enforcement: 충돌 대사(reconciliation) (APPROVAL_SOD_RECONCILIATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SOD_RECONCILIATION`(SPEC §2·§29)은 **SoD 판정을 산출하는 여러 상태 소스가 서로 일치하는지 대사(對査)** 하는 엔티티다. 런타임 실 강제·저장된 스냅샷·부여된 Assignment·직전 평가 결과가 어긋나면 통제 무결성이 깨진 것이다. SPEC §29는 4종 비교 대상을 지정한다.

| 비교 대상(§29) | 대사 의미 |
|---|---|
| Runtime | 매 요청 실 강제 결과(§22 Runtime Evaluation) |
| Snapshot | 저장된 활성역할/권한/스코프 상태(§23 Conflict Snapshot) |
| Assignment | 부여된 Role/Permission Assignment(§4 Static SoD 대상) |
| Previous Evaluation | 직전 SoD 평가 결과 |

4소스가 불일치하면 §33 Error Contract(SOD_POLICY_VIOLATION)·§27 Drift와 연동한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(GT) |
|---|---|---|
| SoD 전용 Reconciliation 스키마·대사 코드경로 | **ABSENT(grep 0)** | GT② §2 "SoD 전용 …Recon… grep 0" · ADR §2.2 |
| Runtime 소스(실 강제 결과) | **ABSENT** | GT② §2 "Runtime SoD Evaluator ABSENT(grep 0)" |
| Snapshot 소스(활성역할 상태) | **공백** | `UserAuth.php:263-316`(세션 단일 team_role) — 다중 활성역할 Snapshot 선행 필요(ADR §D-4) |
| Assignment 소스(재활용) | PARTIAL | `AdminGrowth.php:1294`·`:1313-1331`(requested_by/decided_by 저장·단 SoD 결재분리 미성립·GT① §G) — Assignment 상태 원천 후보 |
| 대사 결과 증거(재활용) | PARTIAL | `SecurityAudit.php:14-33`·`:56-69`(불변체인·GT① §F) — Reconciliation 결과 기록 |

Reconciliation은 **4개 상태 소스가 모두 실재**해야 성립하는데, Runtime·Snapshot 2소스가 부재하므로 대사 자체가 순신규다.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드(안)**: `recon_id`·`tenant_id`·`subject_ref`·`runtime_state`·`snapshot_state`·`assignment_state`·`prev_eval_state`·`mismatch_flags`·`reconciled_at`·`status`(MATCHED/MISMATCH).
- **대사 모델**: 4소스 diff → mismatch 시 §27 Drift 이벤트 생성·§33 SOD_POLICY_VIOLATION 발행. MATCHED만 통제 무결성 확인.
- **제약**: SPEC §36 Snapshot Integrity·Matrix Integrity·Tenant Isolation. 대사는 `index.php:614-619`(auth_tenant 서버도출·GT① §E) 스코프 한정 — 타 테넌트 상태 교차대사 금지.
- **증거**: 대사 실행·mismatch는 `SecurityAudit.php:14-33` 불변체인 append + `:56-69` verify로 무결성 확인(ADR §D-5).

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **Reconciliation ≠ 정산 Recon**: `PgSettlement.php`(정산 recon·페어링 `:221`)는 결제/정산 금액 대사이지 SoD 권한상태 대사가 아니다(GT② B-6·B-3). 개명·흡수 금지.
- **Assignment 소스 과신금지**: `AdminGrowth.php:1294`·`:1313-1331`은 requested_by 저장하나 self-approval 비교·정족수 없어 SoD 결재분리 미성립(GT① §G·GT② B-5) — Assignment 원천 후보일 뿐 SoD 대사 엔진 아님.
- **"conflict" 흡수금지**: 409/sync conflict(GT② B-1)를 대사 대상 SoD 불일치로 오인 금지.

## 5. 판정 (NOT_CERTIFIED · ABSENT-순신규 · 선행의존)

**APPROVAL_SOD_RECONCILIATION = ABSENT(순신규).** SoD 전용 Reconciliation 스키마·대사 코드경로 grep 0(GT② §2). 대사 4소스 중 Runtime Evaluator·Conflict Snapshot 2소스가 선행 부재 — **선행 의존**: Runtime Evaluator(ADR §D-1)·Conflict Snapshot(ADR §D-4) 신설 후에만 다소스 대사 가능. 재활용: Assignment 원천 후보(AdminGrowth)·SecurityAudit 불변체인(증거·verify)·cross-tenant(격리). 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(Part 1~3-9 인증 후 RP-track).

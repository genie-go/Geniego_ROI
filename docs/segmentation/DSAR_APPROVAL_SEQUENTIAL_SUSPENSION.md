# DSAR — Suspension (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §39 SUSPENSION — REASON
`SECURITY_SUSPENSION` · `AUTHORITY_INVALIDATED` · `DELEGATION_INVALIDATED` · `ASSIGNMENT_INVALIDATED` · `LEGAL_ENTITY_STATE_CHANGE` · `ORGANIZATION_STATE_CHANGE` · `RESOURCE_STATE_CHANGE` · `SOD_FAILURE` · `CONFLICT_OF_INTEREST` · `AUDIT_HOLD` · `RECONCILIATION_DRIFT` · `MANUAL_HOLD` · `SYSTEM_FAILURE` · `CUSTOM`.

### 원칙
Suspension 중에는 **모든 Transition 차단** · 복구 전 **Revalidation** 필수(Version Active·Current 유효·Assignment/Authority/Delegation/Claim/Lease 유효·Cursor 일치·Drift/Deadlock 없음·Lock/Fencing).

## 2. 기존 구현 대조

- **승인 Instance 를 대상으로 한 Suspension State/Reason 은 ABSENT.** SECURITY/AUTHORITY/DELEGATION/ASSIGNMENT/SOD/CoI/RECONCILIATION 사유로 승인 진행을 정지시키는 상태·전이·재검증 게이트는 존재하지 않는다.
- **선행 SoT 자체 부재.** Suspension 사유 대부분이 참조해야 할 선행 5군이 없다: Authority Matrix(§3.2 ABSENT)·Delegation(§3.3 ABSENT)·Assignment(§3.4 ABSENT). 따라서 `AUTHORITY/DELEGATION/ASSIGNMENT_INVALIDATED` 를 판단할 SoT 가 애초에 없다.
- **하드코딩 상태전이 3종 어디에도 Suspension 개념 없음.** catalog_writeback_job 은 `status VARCHAR(30)` 자유문자열(`Catalog.php:80`)에 queued/processing/pending 등 잡 상태만 두며 '전 전이 차단 + 재검증 후 복구' 의미의 Suspend 상태를 갖지 않는다. admin_growth_approval(`AdminGrowth.php:146`)·mapping_change_request 도 동일하게 없다.
- **부분 대응 substrate 만 존재.** `SECURITY_SUSPENSION`·`AUDIT_HOLD` 계열이 참조할 수 있는 감사 무결 기반은 SecurityAudit::verify(`SecurityAudit.php:56-68`)로 PRESENT · Tenant Guard(`UserAuth.php:403-406`) PRESENT. 그러나 이는 감사·격리 substrate 일 뿐 승인 Suspension 상태머신이 아니다.

## 3. 판정

- Verdict: **ABSENT** — 승인 도메인의 Suspension State/Reason/Revalidation 게이트 없음.
- 선행 의존: Authority(§3.2)·Delegation(§3.3)·Assignment(§3.4) 전부 ABSENT → Reason 대부분 **BLOCKED_PREREQUISITE**. `SECURITY_SUSPENSION`/`AUDIT_HOLD` 만이 SecurityAudit substrate 로 부분 실현 가능.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규 **Suspension 상태 + Reason enum**을 Sequential Instance State Machine 위에 신설. Suspend 진입 시 모든 Transition Definition 의 precondition(`NOT_SUSPENDED` Guard §21)로 차단.
- ★복구는 상태 임의 되돌리기 금지(§59 Critical Gap: Pause/Suspension 중 진행·과거 재작성 금지). Resume 전 Revalidation Transition 을 별도 생성해 Version/Assignment/Authority/Delegation/Claim/Lease/Cursor/Fencing 을 전부 재검증(§38 Resume 재검증 계약과 정합).
- 재사용: SecurityAudit::verify(`SecurityAudit.php:56-68`)→`SECURITY_SUSPENSION`/`AUDIT_HOLD` 판정 기반 · Tenant Guard(`UserAuth.php:403-406`)→Suspension 도 테넌트 격리. `AUTHORITY/DELEGATION/ASSIGNMENT_INVALIDATED` 사유는 각 선행 SoT 신설 이후에만 실효 — 그 전까지 미구현이 정직한 상태(가짜 Suspend 훅 금지).

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].

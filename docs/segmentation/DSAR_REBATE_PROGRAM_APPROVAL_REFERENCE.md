# DSAR — Approval Reference (§18·12 Type)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## 실측 (v2.1 정정 — 초판은 "부재→신설"로 오분류했다)
**Change Approval 워크플로는 REAL 이 존재한다**: action_request 에 **decision(approve/reject) · approvals_json · status** + **테넌트 소유 검증(IDOR 차단·208차 P0)**(Alerting.php:578-582 / 545-546) · 승인 후 **실 액추에이터 집행 + 정직 상태 기록**(287차 가짜집행 근본수정 :608-611).
→ **재사용 대상(중복 승인엔진 신설 금지)**. Rebate 전용 Approval Reference 자체는 부재→신설.

## Entity `REBATE_PROGRAM_APPROVAL_REFERENCE`
approval_reference_id · rebate_program_id · version_id · change_set_id · **approval_type · required_roles · submitted_at · approved_at · rejected_at · approval_result · approver_references · segregation_of_duties_result · expiry** · status · evidence

## Approval Type (12)
INITIAL_ACTIVATION · VERSION_ACTIVATION · FUNDING_CHANGE · CONTRACT_CHANGE · CURRENCY_CHANGE · LEGAL_ENTITY_CHANGE · MIGRATION · TERMINATION · DELETE · RESTORE · EMERGENCY_CHANGE · ROLLBACK

## 규칙
- **§4.5 Approval 은 Effectiveness 가 아니다**(승인=권한 확보 · 발효=Effective Period 진입 · APPROVED 는 ACTIVE 가 아니다).
- **승인 만료(expiry) 후 발효 금지** · **Approval 완료 전 Production Activation 차단**.
- **본 블록은 Reference + Enforcement Hook 만**. 상세 Permission·Approval Workflow·SoD 정책은 **Part 4-5-3-1-5**(중복 구현 금지).

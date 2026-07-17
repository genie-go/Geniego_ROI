# DSAR — Role Request 상태 (§32)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 상태(12)
DRAFT · SUBMITTED · **PRECHECK_FAILED** · REVIEW_PENDING · APPROVAL_PENDING · APPROVED · **PARTIALLY_APPROVED** · REJECTED · CANCELLED · EXPIRED · FULFILLED · BLOCKED.

## 🔴 PARTIALLY_APPROVED 와 FULFILLED 의 구분
- **APPROVED** = 승인됐다 (권한이 아직 없다)
- **FULFILLED** = 실제로 Assignment 가 생성됐다

**둘을 합치면 "승인했는데 권한이 안 생긴" 상태가 보이지 않는다.**
287차 **Alerting::executeAction 가짜집행**(승인 "실행완료" 표시하나 광고API 미호출·status 만 변경)이 **정확히 이 혼동의 사례**다.

## 실측
현행 `action_request.status` = `approved`/`pending`(`Mapping.php:214`) · `approved`/`rejected`(`Alerting.php:593`) — **2~3값**.
287차 수정 후 `executed`/`failed`/`approved_manual` 추가(`Alerting.php:608-611`) → **승인≠집행 구분이 이미 도입됨**(재사용 대상).

## 분류
`Alerting.php:608-611` 승인≠집행 분리 = **VALIDATED_LEGACY(패턴 재사용)** · Request 상태 12 = **NOT_APPLICABLE → 신설**.

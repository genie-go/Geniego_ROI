# DSAR — Role Grant (§33)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약
role_grant_id·role_request·role_assignment·granted role·granted scope·granted duration·granted financial threshold·granted field access·granted_by·granted_at·source·**fulfillment result**·**cache invalidation result**·notification result·status·evidence.

## 🔴 핵심 규칙
**요청 범위보다 넓은 Grant 를 허용하지 않는다.**
→ Runtime `REBATE_ROLE_GRANT_EXCEEDS_REQUEST`(§51).

> 이 규칙이 없으면 **승인 절차가 장식**이 된다. 좁게 요청해 승인받고 넓게 부여하면
> **승인자가 본 것과 실제 부여된 것이 다르다.**

## 🔴 fulfillment result 를 필수로 두는 이유
**Grant 했다 ≠ 권한이 생겼다.** 287차 가짜집행 교훈: **status 만 바꾸고 실제 동작이 없으면
"부여 완료"가 거짓**이 된다. → **fulfillment 결과를 실측 기록**.

## 실측
Grant 개념 **부재** — 현행은 승인과 부여가 분리돼 있지 않다.

## 분류
**NOT_APPLICABLE → 신설**.

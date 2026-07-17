# DSAR — Role Request (§32)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약
role_request_id·requester·target subject·requested role·requested role version·requested scope·requested duration·requested environment·requested financial threshold·**business justification**·ticket reference·manager reference·resource owner reference·**risk score**·**conflict precheck**·submitted_at·status·evidence.

## 실측 — 승인 워크플로 기반은 REAL
🔴 **VALIDATED_LEGACY(Approval 정본·재사용 강제)**: `action_request`(id·policy_id·tenant_id·status·action_json·**approvals_json**·created_at) `Db.php:592-600` · **`required_approvals` DEFAULT 2** `Db.php:634` · **IDOR 차단**(타 테넌트 승인/거부 차단·208차 P0) `Alerting.php:545-546/578-582`.

**5-1 §51 결론**: **중복 승인 엔진 신설 금지** — Role Request 는 `action_request` 를 재사용해야 한다.

## 🔴 그러나 재사용 전에 고쳐야 할 것이 있다
**1-6 Gap 원장 G-01(최상위)**: `Mapping.php:212` `\$approvals[] = ["user"=>\$actor,...]` **무조건 append** + `:214` `count(\$approvals) >= required_approvals` → **1인이 2회 누르면 정족수 충족 = Maker-Checker 무효**.
**`UNVERIFIED`**(실호출 경로·UI 제약 미확인) → **PM 재증명 대상**. 상세 승인 경로는 **5-3**.

> **결함이 있는 승인 엔진을 재사용하면 결함까지 재사용된다.**
> 재사용은 옳지만 **G-01 재증명이 선행**돼야 한다.

## 분류
`action_request` = **VALIDATED_LEGACY** · Role Request 전용 필드(risk score·conflict precheck) = **NOT_APPLICABLE → 신설**.

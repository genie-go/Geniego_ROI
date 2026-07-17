# DSAR — Service Account Role Profile (§41)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약
service account·owner·application·tenant·environment·purpose·allowed roles·**prohibited roles**·allowed resources/actions·provider account scope·**network scope**·**token audience**·**maximum token lifetime**·**rotation policy**·**human login prohibited**·**interactive access prohibited**·assignment expiry·status·evidence.

## 🔴 Service Account 기본 금지 Role (6)
**Human Approval Role** · Tenant Admin · Access Admin · Auditor Impersonation · Break Glass Operator · **Manual Payout Approver**.

→ Static Lint(§49) · Runtime `REBATE_SERVICE_ACCOUNT_ROLE_NOT_ALLOWED`(§51) · §48 Critical Gap.

> **이유는 단순하다: 승인은 사람이 하는 것이다.**
> Service Account 가 승인 권한을 가지면 **Maker-Checker 가 자동화로 우회**된다(→5-4).

## 🔴 실측 — api_key 가 사실상 Service Account 다
✅ **REAL**: `api_key`(tenant_id·key_prefix·**key_hash SHA-256**·role·**scopes_json**·is_active·**last_used_at**·**use_count**·**expires_at**·idx(tenant_id,is_active)) `Db.php:942-955`.
✅ **rotation 기반**: `expires_at` · key_hash.
❌ **부재**: owner · application · purpose · **prohibited roles** · network scope · token audience · **human login prohibited** 플래그.

## 🔴 5-1 §59 ③ 실측 계승
**Service Account 0(Subject Type 부재 → 신설)** — api_key 는 **존재하나 "Service Account 로 분류되지 않았다."**
**즉 금지 Role 을 강제할 지점이 없다.** `api_key.role` 에 `admin` 을 넣으면 **admin 권한이 그대로 나온다**(`index.php:554` roleRank).

> **이것이 §41이 가장 시급한 이유다.** 현행은 **Service Account 에 Human Role 을 막는 장치가 없다.**
> 다만 **실 운영에서 그런 키가 발급됐는지는 확인하지 않았다** → **`UNVERIFIED`**(FP 레지스트리).

## 분류
api_key = **VALIDATED_LEGACY(재사용 강제)** + **CONSOLIDATION_REQUIRED**(Service Account Type 승격·금지 Role 강제·**기존 roleRank 의미 보존 필수**).

# DSAR — Evidence Contract (§53)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약 — `REBATE_ROLE_EVIDENCE`
evidence id·subject·role·role version·permission profile·assignment·**assignment source**·source group·organization reference·tenant·workspace·legal entity·program scope·environment·provider account·**business justification**·request/grant/revocation reference·validity·**attribute snapshot**·usage reference·reconciliation reference·effective_at·recorded_at·**result hash**·**lineage**·audit reference.

## 🔴 금지 (No-PII 헌법)
**Password · Access Token · Credential Secret · Bank Data 원문 및 불필요한 PII 를 저장하지 마라.**

현행 정합: `api_key` 는 **key_hash(SHA-256)만 저장**(`Db.php:942-955`) · channel_credential **AES-256-GCM**(267차) · ChannelCreds **마스킹** → **원문 미저장 패턴이 이미 REAL**.

## 🔴 result hash + lineage
**"왜 이 권한이 나왔는가"를 사후 재현**하기 위한 축.
**hash-chain 패턴은 REAL** — `menu_audit_log.hash_chain CHAR(64)`(`AdminMenu.php:123-131`) + **직전 해시 조회로 실제 체인 계산**(:216).
→ **신설이 아니라 확장**(5-7 판정 계승 · R3 "hash-chain 부재"는 **금전 원장 한정**이었다).

## 분류
hash-chain·마스킹·해시저장 = **VALIDATED_LEGACY(패턴 재사용 강제)** · Role Evidence 원장 = **NOT_APPLICABLE → 신설**.

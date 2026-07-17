# DSAR — Provider Account·Credential Access (§39)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## ★Permission 분리 (6)
Provider Program Metadata 조회 · Provider Account Configuration 조회 · **Credential Metadata 조회**(`VIEW_CREDENTIAL_METADATA`) · **Credential 사용**(`USE_PROVIDER_CREDENTIAL`) · **Rotation**(`ROTATE_CREDENTIAL`) · Disable

## ★절대 규칙
- **Credential Secret 원문을 사용자에게 노출 금지** · **Secret Read Permission 자체를 만들지 마라**(§44 Lint).
- **Secret 사용은 Tokenized Runtime Reference 로만**.
- **Production Credential 사용 = Step-up Authentication**(§34).
- **Cross-Environment Credential 사용 = Critical Gap**(§43).

## 실측 — 재사용
**REAL** = channel_credential **at-rest AES-256-GCM**(267차 Crypto fail-closed) · ChannelCreds 마스킹 · **`no_credentials` 게이트**("자격증명이 없으면 no_credentials 반환·**실 API 호출 안 함**"·AdAdapters.php:19) · **미검증 고지**(:25).
**부재** = Credential Access Permission 분리 · Rotation Policy · Provider Account Scope → 신설.

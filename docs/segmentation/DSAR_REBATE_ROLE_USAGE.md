# DSAR — Role Usage (§42)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약
role usage id·role·assignment·subject·resource type·action·scope·**used_at**·decision reference·**allowed·denied**·sensitive action 여부·financial amount reference·evidence.

## 🔴 실측 — 원재료가 이미 있다
✅ **api_key**: `last_used_at` · `use_count`(`Db.php:942-955`) → **미사용 키 탐지가 새 필드 없이 가능**.
❌ **인간 Subject**: `last_used_at` 부재 → **세션 이력 기반 추정 필요**(5-7 판정 계승).
❌ **Decision 기록**: 5-1 §59 ㉓~㉚ = **전부 0**(Decision 기록 구조 자체 부재).

## 🔴 Usage 없이는 Dormant 를 못 잡는다
§44 Dormant 기준 대부분이 **"사용 없음"**에 의존한다. Usage 가 없으면
**"부여됐지만 안 쓰는 권한"을 영원히 발견할 수 없다** — Privilege Creep 의 온상.

## 🔴 5-7 볼륨 정책 계승 — 재정의 금지
**ALLOW 는 샘플링 · DENY 는 전량**(1,448 라우트 × 전 요청은 폭증).
**DENY 를 샘플링하면 공격 탐지가 불가능**하다.

## 분류
api_key last_used_at/use_count = **VALIDATED_LEGACY(재사용)** · Usage 원장 = **NOT_APPLICABLE → 신설**(5-7 Audit 정본과 **단일 정본** · 중복 감사 금지).

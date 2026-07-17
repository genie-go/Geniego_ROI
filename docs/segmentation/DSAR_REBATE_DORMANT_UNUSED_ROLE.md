# DSAR — Dormant·Unused Role (§44)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## Dormant 기준 후보(7)
일정 기간 Assignment 없음 · **Assignment 는 있으나 사용 없음** · **고위험 Permission 이 장기간 미사용** · 만료된 Contract 와 연결 · 종료된 Program 에만 연결 · 비활성 Subject 에만 배정 · 중복 Role 에 의해 대체 가능.

## 처리(6)
Review · Suspend · Deprecate · Merge Candidate · Revoke Assignment · Archive.

## 🔴 실측 — 절반은 지금 가능하다
✅ **api_key**: `last_used_at`·`use_count` → **"Assignment 는 있으나 사용 없음" 탐지 가능**(새 필드 0).
❌ **인간 Subject**: `last_used_at` 부재.
❌ Contract·Program 연결 = **Registry 자체 부재**.

## 🔴 처리 선택이 위험을 가른다
**Revoke 를 기본값으로 하면 안 된다.** Dormant 판정은 **오탐이 있고**, 오탐 회수는
**정상 사용자를 끊는다** — 1-9 최우선 명령: **정상 접근을 지우면 즉시 장애이고,
장애는 롤백을 부르고 롤백은 보안까지 되돌린다.**
→ **기본은 Review · 고위험만 Suspend**.

## 분류
api_key usage 필드 = **VALIDATED_LEGACY(재사용)** · Dormant 탐지 = **NOT_APPLICABLE → 신설**.

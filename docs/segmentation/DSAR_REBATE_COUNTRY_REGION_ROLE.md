# DSAR — Country·Region Role (§22)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약
예: KOREA_REBATE_MANAGER · JAPAN_REBATE_ANALYST · APAC_REBATE_AUDITOR · EU_REBATE_COMPLIANCE_REVIEWER.

## 🔴 핵심 규칙
**국가·지역 Role 은 실제 Country·Region Scope Binding 을 사용하고 이름만으로 Scope 를 추론하지 않는다.**
**Multi-region Role 은 포함 국가와 제외 국가를 명시한다.**

> 이는 §4.5(Role 이름 하드코딩 금지)의 국가판이다.
> `KOREA_...` 라는 **문자열을 파싱해 한국 데이터를 여는 순간**, 이름 변경이 권한 변경이 된다.

## 실측
- **Country Registry**: ❌ 부재. 단 **273차 SMS OTP 15개국 국가코드 연동** 존재(계정 체계) — **Scope Registry 는 아님**.
- **Region Registry**: ❌ 부재.
- `amazon_ads region`(287차 수정 대상) = **Provider 설정값**이지 조직 Region Scope 아님 — **오탐 주의**.

## 🔴 §0 질문 직답
**"Country Manager 가 다른 국가의 Program 을 볼 수 있는가"** → 현행은 **Country Scope 자체가 없으므로 질문이 성립하지 않는다.**
Rebate 도입 시 **Country Registry 선행 필요**.

## 분류
**NOT_APPLICABLE → 신설**.

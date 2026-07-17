# DSAR — Role Composition (§13)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약
role_composition_id·composite role·component role·component priority·included/excluded permissions·**scope intersection policy**·conflict policy·valid_from/to·status·evidence.

## 🔴 기본값 = INTERSECTION
**기본 Scope 결합 정책은 INTERSECTION. UNION 은 명시적 승인이 있는 경우에만 허용한다.**

> **UNION 이 기본이면 Composite Role 이 조용히 권한을 확대한다.**
> 두 역할을 묶었을 뿐인데 합집합 Scope 가 생겨 **Cross-entity 접근이 열린다**(§48 Critical Gap).
> **사용자는 "역할을 합쳤다"고 생각하지 "권한을 늘렸다"고 생각하지 않는다 — 그래서 위험하다.**

Static Lint: **Scope Union 기본 사용 차단**(§49).

## 실측
Composition **부재**. 현행은 단일 role 문자열 — 조합 개념 없음.

## 분류
**NOT_APPLICABLE → 신설**.

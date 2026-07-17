# DSAR — Critical Role Gap 정책 (§48)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## High/Critical 처리 대상(18)
Cross-Tenant Role Assignment · **Legal Entity Scope 없는 Finance·Payout Role** · Sandbox Role 의 Production Scope · External User 에게 Platform Admin · **Service Account 에 Human Approval Role** · Expired Assignment 접근 지속 · **Revoked Role Session 지속** · **Group 제거 후 Role 유지** · 조직 이동 후 이전 법인 Role 유지 · 종료된 Contract 의 Partner Role 유지 · Deprecated Role 신규 Assignment · Role Owner 없음 · **Custom Role 이 Mandatory Deny 우회** · Role Composition 이 고위험 권한 과도 결합 · **Scope Union 으로 Cross-entity 확대** · Program 종료 후 Program Role 유지 · Assignment 근거·Validity 없음 · Dormant High-risk Role 장기 유지.

## 🔴 대응 = "Runtime Guard 차단(1차) + Access Review 등재(2차)"
**5-7이 발견한 설계 순환 참조 정정을 계승한다.**
5-1~5-6이 Critical Gap 대응을 **"Access Review 차단"**으로 적었으나 **Access Review 는 부재(grep 0)**였다.
**존재하지 않는 기능에 의존한 설계**였고, 1차 대응은 **Runtime Guard(§50)**여야 한다.

## 🔴 현재 성립 여부 — 정직 표기
**Rebate Role 자체가 부재**하므로 18종 중 대부분이 **잠재 Gap**이다.
**단 2종은 현행 구조상 지금도 가능**하다:
- **Service Account 에 Human Approval Role**: `api_key.role='admin'` 이 막히지 않음(§41) — **`UNVERIFIED`**
- **Group 제거 후 Role 유지**: `sso_group_role_map` removal behavior 부재(§28) — **`UNVERIFIED`**

**둘 다 실 데이터·실 동작을 확인하지 않았으므로 P0 로 단정하지 않는다**(FP 레지스트리 · **PM 코드 재증명 전 P0 단정 금지**).

## 1-6 우선순위 계승
**위험 = 운영영향 × 오신뢰.** ABSENT(Rebate Role 전체)는 **최대 Gap 이자 최하위** — 없는 기능은 오작동하지 않는다.

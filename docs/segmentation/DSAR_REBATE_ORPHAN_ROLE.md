# DSAR — Orphan Role (§43)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## Orphan 후보(8)
Owner 없는 Role · **Permission 없는 Role** · **Assignment 없는 Role** · Deprecated Permission 만 가진 Role · 존재하지 않는 Tenant 에 속한 Role · 삭제된 Workspace 에 속한 Role · 제거된 Provider Account 에 연결된 Role · **Source Group 이 없는 Group Role**.

## 계약
orphan role id·role·orphan type·detected_at·severity·affected assignments·recommended action·status·evidence.

## 🔴 "Source Group 이 없는 Group Role" 은 지금도 가능하다
`sso_group_role_map`(`EnterpriseAuth.php:70`)은 **group_name 문자열**을 저장한다.
IdP 에서 그 그룹이 삭제돼도 **매핑 행은 남는다** — **Orphan 그대로**.
**본 세션은 실 데이터를 조회하지 않았다** → **`UNVERIFIED`**(FP 레지스트리 · PM 재증명 대상).

## 🔴 1-7 교훈의 재적용 — 고아는 "없음"보다 나쁘다
1-7 D-4: **"고아 규칙은 규칙 없음보다 나쁘다 — 규칙이 없으면 아무도 안 믿지만
고아는 있다고 믿게 한다."**
**Orphan Role 도 같다.** 매핑이 있으면 **관리되고 있다고 믿게 된다.**

## 분류
**NOT_APPLICABLE → 신설**(탐지기 · **5-8 `GuardWiringRule`/`PhantomTargetDetector` 와 동일 계보 · 중복 탐지기 금지**).

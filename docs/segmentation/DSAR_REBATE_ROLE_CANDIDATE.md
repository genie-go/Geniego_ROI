# DSAR — Role Candidate (§45)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약
candidate id·request id·subject·tenant·workspace·organization·department·team·**source groups**·direct roles·inherited roles·temporary roles·conditional roles·role versions·permission profile·**scope result**·exclusions·financial threshold·field access result·environment·**conflicts**·**proposed effective roles**·manual review requirement·evidence.

## 🔴 Candidate = 판정 전 중간 산물
**"이 사용자가 최종적으로 어떤 Role·Scope 를 갖는가"를 계산한 결과**이며,
§29의 **"상속 후 최종 Scope 는 명시적 계산 결과로 저장한다"**가 여기서 실현된다.

> Candidate 를 저장하지 않으면 **"왜 이 권한이 나왔는지"를 재현할 수 없다.**
> §0 질문 **"Role 의 부여 근거를 설명할 수 있는가"**의 직답.

## 1-1 정본과의 정합
1-1이 이미 `CANDIDATE` 엔티티를 정의했다(Rebate Program Master §7 · 17 엔티티 중 하나).
**동일 개념 · 다른 도메인**이며 **패턴을 재사용**한다.

## 실측
Candidate **부재**. 현행은 판정 과정을 남기지 않는다(5-1 §59 ㉒ **Authorization Request 0**).

## 분류
**NOT_APPLICABLE → 신설**.

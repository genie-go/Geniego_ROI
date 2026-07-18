# DSAR — Position Assignment (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§29 POSITION_ASSIGNMENT — 직위(Position) 기반 배정 계약:

1. **Position Incumbency → Subject 해석** — 배정은 직위 자체가 아니라 그 직위의 현직자(Incumbency)를 통해 실주체로 해석된다.
2. **Vacant Fallback 순서**(직위 공석 시):
   1. Acting Position
   2. Delegated Position
   3. Manager
   4. Position Parent
   5. Queue
   6. Manual Review
   7. Block
3. **이름 문자열 판정 금지** — 직위/현직자를 문자열 이름으로 매칭하지 않는다(Canonical 바인딩만).

## 2. 기존 구현 대조

- **Position / Position Incumbency 엔티티: ABSENT.** 직위 및 현직 배정(incumbency) 엔티티가 없다 — Identity/Org 축 **ABSENT**(`org_unit/reporting_line/incumbency/legal_entity` grep 0).
- Position Incumbency→Subject 해석(①)의 재료가 전무. 현행에는 `UserAuth.php:156-157,1225-1227` parent_user_id(=owner 로 붕괴)와 flat team_role 3값만 있어 직위 개념을 표현하지 못한다.
- **Vacant Fallback(②)**: 승인자 fallback waterfall 자체가 부재(§GROUND_TRUTH = Fallback PARTIAL/무관 — 채널 waterfall·AI fallbackContent 은 approver-fallback 아님). Acting/Delegated Position·Position Parent·Manager 해석 대상이 모두 부재.
- **이름 문자열 판정 금지(③)**: 위반 여부를 평가할 Position 바인딩 자체가 없다 — 판정 불가(부재).

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE**
- 선행 의존: **Position Incumbency 부재**가 직접 원인이다. 이는 **축3 Identity/Org(ABSENT)** 에 종속되며, Vacant Fallback 의 Manager/Delegated Position 단계는 각각 Manager Resolution Foundation·Delegation Foundation(둘 다 부재)까지 요구한다. 선행 축·Position Incumbency 엔티티 신설 전에는 해석 대상이 없다.
- cover: 0

## 4. 확장/구현 방향 (설계)

- **순신규 — 선행 4축 후행.** Position·Position Incumbency 엔티티는 축3 Identity/Org 신설의 일부로 함께 도입되어야 한다.
- **재사용 자산**: Vacant Fallback 의 종착점인 Queue·Manual Review·Block 단계는 실존 승인 큐 `catalog_writeback_job`(`Catalog.php:75-84`)+claim/lease `omni_outbox`(`Omnichannel.php:95-99,405,425-448`) 로 실현한다 — 신규 큐 신설 금지.
- **Mandatory Control**: 직위는 항상 현직자(Incumbency)로 해석하고, 공석 시 §29 순서(Acting→Delegated→Manager→Parent→Queue→Manual Review→Block)를 **Silent Pass 없이** 결정론적으로 소진한다. 문자열 이름 매칭 금지 — Canonical Position 바인딩만 허용.
- **무후퇴 유의**: 실 엔진은 별도 승인 세션. 코드변경 0. Position 엔티티가 없는 동안 "직위 해석 완료"를 표시하지 않는다(가짜녹색 금지).

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].

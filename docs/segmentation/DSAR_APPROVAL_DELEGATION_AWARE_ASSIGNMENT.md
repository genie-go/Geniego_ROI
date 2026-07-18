# DSAR — Delegation-Aware Assignment (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§32 DELEGATION_AWARE_ASSIGNMENT — 위임 인지 배정 계약. 다음을 기록:

1. Original Participant
2. Delegator
3. Delegate
4. Delegation Definition
5. Delegation Version
6. Delegation Type
7. Delegated Authority
8. Delegated Scope
9. Delegated Ceiling
10. Delegated Currency
11. Delegation Period
12. Re-delegation Chain
13. Delegation Snapshot

원칙: 위임이 적용되어도 **Queue Eligibility·Decision-time Revalidation 유지**(위임이 적격성 검증·결정시점 재검증을 우회하지 않는다).

## 2. 기존 구현 대조

- **Delegation Foundation: ABSENT.** 승인 위임(Delegator→Delegate)의 Definition/Version/Type·Delegated Authority/Scope/Ceiling·Delegation Period·Re-delegation Chain·Delegation Snapshot 을 표현하는 엔티티가 전무하다. 선행 4축(Approval Chain·Authority·Org·SoD) 중 어디에도 위임 기반이 없다.
- **DELEGATION_EXCEEDED 오인 금지(§GROUND_TRUTH 확정 트랩)**: `TeamPermissions.php:627-647` 의 DELEGATION_EXCEEDED 는 manager 가 자기 미보유 menu:action 을 부여하려 할 때 발생하는 **RBAC 부여상한(monotonicity — 못 가진 걸 못 줌)** 이다. 이는 승인 위임(approval delegation)이 아니라 직교하는 ACL 부여 제약이며, **KEEP_SEPARATE** 로 판정된다. 이름의 "DELEGATION" 을 근거로 위임 기반이 있다고 추론 금지(이름에서 능력 추론 금지).
- **①~⑬ 기록 항목**: Delegator/Delegate 주체 해석은 Identity/Org 축 **ABSENT**, Delegated Authority/Ceiling 은 Authority Matrix 축 **ABSENT**(`authority_matrix/amount_band` 0), Delegation Snapshot 은 Assignment Snapshot ABSENT 에 각각 종속. 재료 전무.
- **Queue Eligibility·Decision-time Revalidation 유지 원칙**: Queue Eligibility 는 현행 PARTIAL(RBAC 게이팅만), Decision-time Revalidation 전용 hook 은 부재 — 위임 적용 후 재검증을 강제할 지점이 없다.

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE**
- 선행 의존: **Delegation Foundation 부재**가 직접 원인이다. 위임 기록 13항목은 **축2 Authority Matrix(ABSENT)**·**축3 Identity/Org(ABSENT)**·Delegation Definition 엔티티(부재)에 종속된다. `TeamPermissions.php:627-647` DELEGATION_EXCEEDED 는 **KEEP_SEPARATE**(RBAC 부여상한) 로, 위임 기반의 선행 자산으로 인용 금지.
- cover: 0

## 4. 확장/구현 방향 (설계)

- **순신규 — 선행 4축 후행.** Delegation Foundation(Delegator/Delegate/Definition/Version/Type/Authority/Scope/Ceiling/Period/Re-delegation Chain/Snapshot)은 축2 Authority·축3 Identity/Org 신설 이후 별개 선행 자산으로 도입한다. `TeamPermissions` DELEGATION_EXCEEDED(RBAC 부여상한)와 **명명·의미 분리**를 명시하여 혼용 금지(§66 Delegation↔Reassignment/RBAC 혼용 금지).
- **재사용 자산**: 위임 적용 후 배정 lifecycle·claim/lease 는 `catalog_writeback_job`(`Catalog.php:75-84`)·`omni_outbox`(`Omnichannel.php:95-99,405,425-448`) 확장.
- **Mandatory Control**: 위임이 적용돼도 Queue Eligibility 와 Decision-time Revalidation 을 **유지**(위임이 적격성·결정시점 재검증을 우회하지 않음). Re-delegation Chain·Delegation Period 만료·revocation 을 결정 시점에 재검증. Delegation Snapshot 은 immutable 기록.
- **무후퇴 유의**: 실 엔진은 별도 승인 세션. 코드변경 0. Delegation Foundation 이 없는 동안 "위임 검증 통과"를 표시하지 않는다(가짜녹색 금지).

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].

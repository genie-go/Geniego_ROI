# DSAR — Assignment Claim (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§40 CLAIM — 큐 작업 점유(Claim) 계약. 필드:

1. claim_id
2. assignment_id
3. work_item_id
4. queue id
5. claimant subject / role assignment / position incumbency id
6. authority / delegation resolution id
7. claim policy version
8. requested_at / granted_at / rejected_at
9. rejection reason
10. lease id
11. lock id
12. claim status
13. status
14. evidence

CLAIM_STATUS enum: REQUESTED / VALIDATING / GRANTED / REJECTED / ACTIVE / RELEASED / EXPIRED / REVOKED / SUPERSEDED / COMPLETED.

§41 검증: Work Item Claimable · Queue/Queue Version Active · Candidate Queue Member · Queue Eligibility · Authority/Delegation Active · Legal Entity/Organization/Resource/Action/Amount/Currency · Capacity · Availability · Security · SoD · CoI · 기존 Active Claim 없음 · Lock 획득 · Lease 생성.

## 2. 기존 구현 대조

- **PARTIAL — job 용 claim 패턴은 CANONICAL 로 실존, 그러나 승인 claim 은 아님.**
- `catalog_writeback_job` 승인/작업 큐가 **CAS(Compare-And-Swap) claim** 을 실사용한다(`Catalog.php:1721-1731`) — 워커가 pending 행을 조건부 UPDATE 로 점유하여 이중 처리(중복 Active Claim)를 방지한다.
- `omni_outbox` 발송 큐는 claim_id/claimed_at·`FOR UPDATE SKIP LOCKED`·CAS fallback 을 갖춘 **CANONICAL claim/lease 패턴**이다(`Omnichannel.php:95-99,405,425-448`).
- **결정적 한계**: 이 두 자산의 claim 은 **작업(job)/발송 점유**이지 §40 의 **승인 작업 항목(Approval Work Item) claim** 이 아니다. §41 의 승인 특화 검증 대부분이 부재 — Candidate Queue Member·Queue Eligibility(PARTIAL, RBAC 만)·Authority/Delegation Active(축2 ABSENT)·Legal Entity/Organization(축3 ABSENT)·SoD/CoI(축4 hook 부재)를 통과시키지 않으며, claim→lease→lock 을 하나의 승인 claim 레코드로 묶는 구조도 없다.
- claimant 은 승인 자격 검증 없이 임의 워커/`requirePro`(`Catalog.php:2385`) 수준이며, `claimant subject / authority resolution id / claim policy version` 같은 §40 승인 필드가 없다.

## 3. 판정

- Verdict: **PARTIAL**
- 선행 의존: claim/lease 의 **동시성 메커니즘 자체는 CANONICAL 로 실존**(`Catalog.php:1721-1731`·`Omnichannel.php:95-99,405,425-448`)하나, 이를 **승인 claim** 으로 승격시키는 §41 자격 검증이 **축2 Authority Matrix·축3 Identity/Org(모두 ABSENT)·축4 SoD/CoI hook(부재)** 에 종속되어 차단된다. Queue Eligibility 는 RBAC 만(PARTIAL).
- cover: `Catalog.php:1721-1731`(catalog_writeback_job CAS claim — job 점유; 승인 claim 아님) · `Omnichannel.php:425-448`(omni_outbox CAS/SKIP LOCKED claim — 발송 점유, CANONICAL 패턴) · `Omnichannel.php:95-99`(claim_id/claimed_at 필드)

## 4. 확장/구현 방향 (설계)

- **확장 우선(재생성 금지).** 승인 Claim 은 **새 claim/lease/lock 동시성 엔진을 만들지 말고** 실존 CANONICAL 패턴(`Omnichannel.php:425-448` FOR UPDATE SKIP LOCKED + CAS fallback, `Catalog.php:1721-1731` CAS claim)을 **재사용**하여 Approval Work Item 큐 위에 얹는다.
- **신규 필요**: §40 승인 필드(claimant subject/role assignment/position incumbency·authority/delegation resolution id·claim policy version·lease id·lock id·claim status)와 §41 검증(Candidate Queue Member·Queue Eligibility·Authority/Delegation Active·Legal Entity/Org·Capacity·Availability·Security·SoD·CoI·기존 Active Claim 없음)을 선행 4축 신설 이후 추가.
- **Mandatory Control**: **Claim 은 반드시 Lock 획득 + Lease 생성을 동반**하며(§41), 기존 Active Claim 이 있으면 거부(중복 Active Claim 금지). 모든 검증은 claim 시점 + Decision 시점 재검증(Decision-time Revalidation). CLAIM_STATUS 전이는 감사 이벤트로 기록.
- **무후퇴 유의**: 실 엔진은 별도 승인 세션. 코드변경 0. 실존 `catalog_writeback_job`(`Catalog.php:75-84`) 승인큐·`omni_outbox` 발송 claim 동작은 후퇴시키지 않는다(§70 회귀 게이트). 승인 자격 검증이 없는 동안 "담당자 점유 완료"를 승인 맥락으로 표시하지 않는다(가짜녹색 금지).

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].

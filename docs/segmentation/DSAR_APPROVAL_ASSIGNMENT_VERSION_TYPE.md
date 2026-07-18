# DSAR — Approval Assignment Version Type (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§10 VERSION_TYPE enum (원문 전사·15종):

1. INITIAL
2. STRATEGY_CHANGE
3. QUEUE_CHANGE
4. CANDIDATE_CHANGE
5. AUTHORITY_POLICY_CHANGE
6. DELEGATION_POLICY_CHANGE
7. CAPACITY_POLICY_CHANGE
8. LOAD_POLICY_CHANGE
9. AVAILABILITY_POLICY_CHANGE
10. CLAIM_POLICY_CHANGE
11. LEASE_POLICY_CHANGE
12. LOCK_POLICY_CHANGE
13. FALLBACK_POLICY_CHANGE
14. CORRECTION
15. MIGRATION

## 2. 기존 구현 대조

- **버전 타입 enum 부재.** 승인 배정 version 을 "무엇이 바뀌었나"로 분류하는 enum 은 물론, 상위 version 엔티티 자체가 부재([[DSAR_APPROVAL_ASSIGNMENT_VERSION]] ABSENT).
- 15종 중 대응 정책이 부분 실존하는 것도 정책이 아니라 코드 관용구 수준이다: CLAIM/LEASE/LOCK_POLICY_CHANGE 가 가리킬 claim/lease 관용구는 job 처리용(`Catalog.php:1721-1731`·`Omnichannel.php:425-448`)으로만 존재하고, STRATEGY/QUEUE/CANDIDATE/AUTHORITY/DELEGATION/CAPACITY/LOAD/AVAILABILITY/FALLBACK 축은 전무하다.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: version 엔티티([[DSAR_APPROVAL_ASSIGNMENT_VERSION]]) 및 그것이 분류하는 정책 축들(§8) 부재에 종속.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규 enum**. 확장 가능 카탈로그로 정의(하드코딩 DB ENUM 금지 — 신규 타입 INSERT 예외 선례 반복 회피).
- **Mandatory Control**: 모든 version 은 INITIAL 로 시작하고 이후 변경은 정확한 change 타입으로 기록 — CORRECTION/MIGRATION 은 audit 상 별도 취급(과거 재작성 아님을 명시). version_type 은 change_summary·정책 스냅샷 delta 와 정합해야 한다.
- **선결**: version 엔티티 신설과 동반. 본 문서는 설계 명세.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].

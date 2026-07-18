# DSAR — Assignment Strategy (§20) (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §20 STRATEGY enum (원문 전사)
1. DIRECT
2. EXPLICIT_SUBJECT
3. ROLE_PRIMARY
4. POSITION_PRIMARY
5. MANAGER_PRIMARY
6. OWNER_PRIMARY
7. DELEGATION_FIRST
8. AUTHORITY_FIRST
9. QUEUE_CLAIM
10. ROUND_ROBIN
11. WEIGHTED_ROUND_ROBIN
12. LEAST_LOADED
13. LEAST_ASSIGNED
14. LEAST_CLAIMED
15. HIGHEST_CAPACITY
16. SKILL_BEST_MATCH
17. AVAILABILITY_FIRST
18. GEOGRAPHIC_MATCH
19. LEGAL_ENTITY_MATCH
20. ORGANIZATION_MATCH
21. RESOURCE_AFFINITY
22. CASE_AFFINITY
23. CUSTOMER_AFFINITY
24. PROGRAM_AFFINITY
25. STICKY_ASSIGNEE
26. PRIORITY_WEIGHTED
27. RANDOM_WITH_DETERMINISTIC_SEED
28. MANUAL
29. FALLBACK_CHAIN
30. CUSTOM

### §20 STRATEGY 필수 필드 (원문 전사)
1. strategy_id
2. code
3. name
4. algorithm
5. deterministic 여부
6. ranking dimensions
7. tie-break policy
8. capacity awareness
9. workload awareness
10. availability awareness
11. affinity awareness
12. authority awareness
13. delegation awareness
14. legal entity awareness
15. fallback policy
16. version
17. valid_from / valid_to
18. status
19. evidence

## 2. 기존 구현 대조

§GROUND_TRUTH 근거로 Assignment Strategy 는 **전무**하다.

- **전략 알고리즘 축 0** — round-robin / least-loaded / weighted 어느 것도 backend 에 존재하지 않는다(§GROUND_TRUTH 개념별 판정: Strategy=ABSENT).
- 현행 두 승인 큐의 "승인자 결정"은 전략이 아니라 **진입 게이트 통과 임의자**다: `catalog_writeback_job` 의 `approveQueue` 는 테넌트 내 임의 requirePro(`Catalog.php:2385`) · `admin_growth_approval` 은 1인 admin 결정(`AdminGrowth.php:1313`). 어느 쪽도 후보 풀에서 랭킹·타이브레이크로 특정 승인자를 고르는 로직이 없다.
- capacity/workload 신호는 읽기전용 리포트로만 존재(`PM/Enterprise.php:371-400`)하며 배정 로직에 환류되지 않는다 — 즉 `LEAST_LOADED`/`HIGHEST_CAPACITY` 전략이 소비할 라이브 입력이 배정 경로에 연결되어 있지 않다.
- job 소비 순서는 FIFO drain(`Catalog.php:1716` `ORDER BY id ASC`)으로, owner/후보 라우팅이 아닌 단순 큐 배수다.
- 선행 4축(Authority `AbSENT` · Delegation · Org · Chain) 이 전무하므로 `AUTHORITY_FIRST`/`DELEGATION_FIRST`/`ROLE_PRIMARY`/`POSITION_PRIMARY`/`MANAGER_PRIMARY`/`OWNER_PRIMARY`/`LEGAL_ENTITY_MATCH`/`ORGANIZATION_MATCH` 계열 전략은 참조할 SoT 자체가 없다.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: 랭킹/타이브레이크 전략은 후보(§15 Candidate·ABSENT)·Resolution(§18·ABSENT)·Capacity/Workload 라이브 신호(§34·§35 PARTIAL·읽기전용) 위에서만 성립한다. 나아가 `AUTHORITY_FIRST`/`DELEGATION_FIRST`/`ROLE_PRIMARY` 등 신원기반 전략은 **선행 4축 전부(축1 Approval Chain·축2 Authority Matrix·축3 Identity/Org 전부 ABSENT)** 에 막혀 `BLOCKED_PREREQUISITE` 이다.
- cover: 0 (전략 알고리즘·랭킹·타이브레이크 어느 것도 실코드 없음)

## 4. 확장/구현 방향 (설계)

- Strategy 는 **순신규**다. 다만 하위 신호원은 재구현하지 말고 실존 인접 자산을 확장한다: capacity/workload 는 `PM/Enterprise.php:371-400` resourceCapacity 리포트를 **배정 경로로 환류**(신규 집계 엔진 난립 금지) · FIFO drain(`Catalog.php:1716`)은 `QUEUE_CLAIM`/`LEAST_LOADED` 전략의 특수화로 흡수.
- Mandatory Control: `RANDOM_WITH_DETERMINISTIC_SEED` 만 무작위 허용(§21 Determinism 준수) · 모든 전략은 결정성 재현을 위해 cursor version·partition key·candidate set hash·tie-break key·resolution timestamp 를 기록해야 한다.
- 무후퇴: `catalog_writeback_job` 의 임의 requirePro 승인·`admin_growth_approval` 1인 admin 결정은 전략 도입 후에도 하위호환(전략 `MANUAL`/`DIRECT` 로 매핑)으로 보존 — 기존 승인 경로를 깨지 않는다(§70 Regression).
- ★전략을 도입해도 신원기반 전략(AUTHORITY_FIRST 등)의 실 집행은 선행 4축 신설 후 별도 승인세션. 지금은 설계 명세만.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].

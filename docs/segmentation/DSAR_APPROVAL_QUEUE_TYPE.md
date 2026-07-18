# DSAR — Approval Queue Type (§22 enum) (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §22 QUEUE_TYPE enum (원문 전사)
1. SHARED
2. PERSONAL
3. TEAM
4. ROLE
5. POSITION
6. ORGANIZATION
7. LEGAL_ENTITY
8. COUNTRY
9. REGION
10. FINANCE
11. REBATE
12. CLAIM
13. SETTLEMENT
14. PAYMENT
15. CONTRACT
16. EXCEPTION
17. MANUAL_REVIEW
18. DEAD_LETTER
19. RECOVERY
20. CUSTOM

## 2. 기존 구현 대조

§GROUND_TRUTH 근거로 **queue type 분류축이 부재**하다.

- 현행 두 승인 큐는 type 컬럼/enum 을 갖지 않는다. `catalog_writeback_job`(`Catalog.php:75-84`) 은 채널/SKU/operation 차원의 job 큐이지 SHARED/TEAM/ROLE 등 라우팅 유형으로 분류되지 않는다.
- 그럼에도 **능력상 매핑**하면 현행 큐는 전부 사실상 `SHARED` 에 해당한다: 승인자=테넌트 내 임의 requirePro(`Catalog.php:2385`) · admin 1인(`AdminGrowth.php:1313`). PERSONAL/TEAM/ROLE/POSITION 은 그 개념을 표현할 멤버십 축(§24·ABSENT)이 없어 성립 불가.
- ORGANIZATION/LEGAL_ENTITY/COUNTRY/REGION 유형은 선행 3축 Identity/Org(ABSENT — `org_unit/legal_entity/reporting_line` grep 0) 부재로 표현 불가.
- FINANCE/REBATE/CLAIM/SETTLEMENT/PAYMENT/CONTRACT 도메인 큐는 해당 승인 도메인 자체가 큐로 구현되어 있지 않다. DEAD_LETTER/RECOVERY 는 stuck-processing 600s 회수(`Catalog.php:1699-1702`)가 암묵적 recovery 유사 동작을 하나, 별도 유형 큐로 분리되지 않은 인라인 재적재다.

## 3. 판정

- Verdict: **ABSENT** (type 분류축 부재 · 능력상 전 큐가 SHARED 단일점)
- 선행 의존: TEAM/ROLE/POSITION 유형은 멤버십(§24·ABSENT)에, ORGANIZATION/LEGAL_ENTITY/COUNTRY/REGION 은 선행 3축 Identity/Org(ABSENT) 에 막혀 `BLOCKED_PREREQUISITE`.
- cover: 0 (queue type enum 컬럼·분류 로직 없음. 현행은 무분류 SHARED 상당)

## 4. 확장/구현 방향 (설계)

- Queue Type 은 **순신규 enum**이다. 최소 착지점은 실존 큐를 `SHARED` 로 명시 분류(`catalog_writeback_job`·`admin_growth_approval` → SHARED)하고, TEAM/ROLE/POSITION 은 멤버십 축(→[[DSAR_APPROVAL_QUEUE_MEMBERSHIP]]) 신설 후 활성화.
- ORGANIZATION/LEGAL_ENTITY/COUNTRY/REGION 유형은 선행 3축(Identity/Org) 신설 전에는 사용 금지 — 표현할 SoT 가 없는데 유형만 부여하면 §65 "문자열/이름 기반 판정" gap 을 유발.
- DEAD_LETTER/RECOVERY 는 현행 stuck 회수(`Catalog.php:1699-1702`)를 명시 유형 큐로 승격해 흡수(신규 회수 로직 난립 금지·기존 인라인 동작 무후퇴).
- ★type 은 라우팅(§26)·eligibility(§25)의 상위 분류일 뿐 권한 판정 축이 아니다 — type 만으로 승인 자격을 부여하지 않는다.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].

# DSAR — Direct Assignment (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§27 DIRECT_ASSIGNMENT 검증 — 특정 승인 Work Item 을 특정 Subject 에 직접 배정할 때 통과해야 하는 필수 검증 항목:

1. Subject Active
2. Employment Active
3. Role/Position Active
4. 동일 Tenant
5. Legal Entity
6. Organization
7. Authority Active
8. Delegation Active
9. Resource Scope
10. Action Scope
11. Amount Scope
12. Currency Scope
13. Security
14. SoD (Segregation of Duties)
15. CoI (Conflict of Interest)
16. Availability
17. Capacity
18. Duplicate 없음 (기존 Active Assignment 중복 금지)

## 2. 기존 구현 대조

- **Direct Assignment 엔티티/핸들러: ABSENT.** 특정 승인 Work Item 을 전략으로 특정 승인자에게 직접 배정하는 테이블/코드 없음(§GROUND_TRUTH 개념별 판정 = Approval Assignment ABSENT). 현행 승인은 "배정된 자"가 아니라 "임의 자격 보유자"가 처리한다 — `Catalog.php:2383` approveQueue=테넌트 내 임의 requirePro(:2385), `AdminGrowth.php:1313` approvalDecide=admin 1인.
- **18개 검증축 중 대부분이 선행 4축에 종속되어 검증 재료조차 부재:**
  - Subject/Employment/Role/Position Active (①②③): Identity/Org 축 **ABSENT** — `org_unit/reporting_line/incumbency/legal_entity` 0. `UserAuth.php:156-157,1225-1227` parent_user_id=owner 로 붕괴, team_role flat 3값만.
  - Legal Entity/Organization (⑤⑥): Identity/Org 축 **ABSENT**.
  - Authority Active·Amount/Currency Scope (⑦⑪⑫): Authority Matrix 축 **ABSENT** — `authority_matrix/amount_band` 0. `TeamPermissions.php:627-647` DELEGATION_EXCEEDED 은 ACL 부여상한(monotonicity)일 뿐 승인 권한 검증 아님(인접·상이).
  - Delegation Active (⑧): Delegation Foundation **부재**(선행 4축 Approval Chain 계열 ABSENT).
  - SoD·CoI (⑭⑮): Security/Authz 축 **PARTIAL** — `SecurityAudit.php:56-68` verify() 는 실재하나 **SoD hook·CoI·Actor Snapshot foundation 부재**.
  - Duplicate 없음 (⑱): `Catalog.php:1721-1731` CAS claim 이 job 단위 double-claim 은 막으나(affected-rows 소유), 배정 수준 duplicate 개념은 없음.
- **동일 Tenant (④)** 만이 부분 재료 존재 — tenant 격리는 분산 구현(Security/Authz PARTIAL). 그러나 Direct Assignment 문맥에서 이를 배정 검증으로 소비하는 경로는 없음.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: 18개 검증축 중 Subject/Employment/Role/Position Active·Legal Entity·Organization은 **축3 Identity/Org(ABSENT)**, Authority·Amount/Currency Scope는 **축2 Authority Matrix(ABSENT)**, Delegation Active는 **Delegation Foundation(부재)**, SoD·CoI는 **축4 Security/Authz(PARTIAL — SoD/CoI foundation 부재)** 에 막혀 있다. Direct Assignment 는 단일 엔티티지만 그 검증 계약이 선행 4축 전부를 참조하므로, 4축 부재 상태에서는 "검증 통과"를 표시할 수 없다(가짜녹색 금지).
- cover: 0

## 4. 확장/구현 방향 (설계)

- Direct Assignment 는 **순신규**다. 다만 배정 후 human-in-loop lifecycle 은 실존 `catalog_writeback_job`(`Catalog.php:75-84` pending_approval→queued→processing→done/failed) 을 확장하고, claim/lease 는 `omni_outbox`(`Omnichannel.php:95-99,405,425-448` CANONICAL claim/lease 패턴)+catalog CAS(`Catalog.php:1721-1731`) 를 재사용한다 — 중복 큐/claim 모델 신설 금지.
- **Mandatory Control**: 18개 검증축은 배정 시점(assign-time)과 결정 시점(decision-time) 양쪽에서 fail-closed 로 강제한다. Availability·Capacity 는 우선순위/제외 신호로만 사용하고 단독으로 권한을 부여하지 않는다.
- **무후퇴 유의**: 현행 `Catalog.php:2385` requirePro·`AdminGrowth.php:1313` admin 1인 승인·`Mapping.php:267-271` 자기승인 차단+정족수(:273) 게이트는 **그대로 두고**, Direct Assignment 검증을 그 앞에 추가한다.
- **선행 조건**: 축2(Authority)·축3(Identity/Org)·Delegation Foundation·축4 SoD/CoI foundation 신설이 선행되지 않으면 Direct Assignment 의 15개 이상 검증축이 참조할 SoT 가 없다 → 실 구현은 선행 신설 후 별도 승인 세션.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].

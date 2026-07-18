# DSAR — Approval Assignment Registry (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§7 REGISTRY 필수 필드 (원문 전사):

1. approval_assignment_registry_id
2. tenant_id
3. registry_code
4. registry_name
5. registry_type
6. authoritative_source
7. direct assignment support
8. queue assignment support
9. claim support
10. reassignment support
11. transfer support
12. delegation awareness
13. authority awareness
14. capacity awareness
15. workload awareness
16. availability awareness
17. monetary routing support
18. legal entity routing support
19. geographic routing support
20. fallback support
21. owner
22. active_version
23. valid_from
24. valid_to
25. status
26. evidence

Registry Type (enum): PLATFORM · TENANT · LEGAL_ENTITY · ORGANIZATION · FINANCE · REBATE · CLAIM · SETTLEMENT · PAYMENT · CONTRACT · SHARED_SERVICE · WORKFLOW · CUSTOM.

## 2. 기존 구현 대조

- **Assignment Registry 상위 개념 자체가 부재.** 승인을 "레지스트리→정책→정의"로 계층화해 다스리는 최상위 카탈로그는 backend 어디에도 없다. 실존하는 승인 인프라는 flat 상태머신 3~4종뿐이다: `admin_growth_approval`(`AdminGrowth.php:142`), `catalog_writeback_approval`(`Catalog.php:86`), `mapping_change_request` 정족수2(`Mapping.php:273`) — 각각 도메인 국한이며 상위 registry 추상으로 통합되어 있지 않다.
- **registry_type 14종의 대응 인접 자산**: PLATFORM≈`admin_growth_approval`(플랫폼 전역 1인 승인 `AdminGrowth.php:142`), WORKFLOW≈`catalog_writeback_job` 승인 큐(`Catalog.php:75-84`). 그러나 이들은 "assignment registry"가 아니라 개별 승인 큐/티켓이며, registry_code·active_version·authoritative_source·delegation/authority/capacity awareness 축은 전무하다.
- **tenant_id**: 권위 Tenant 마스터 테이블 부재(선행 축3 Identity/Org ABSENT). `parent_user_id=owner` 붕괴 모델(`UserAuth.php:156-157`, `UserAuth.php:1225-1227`)만 존재해 registry의 legal_entity/organization 라우팅 근거가 없다.
- **evidence**: 유일한 검증 가능한 evidence 정본 = `SecurityAudit.php:56-68`(verify() 실재). registry evidence 필드는 이것을 확장해야 하며, tamper-evident 하지 않은 장식 해시체인을 인용하면 안 된다.

## 3. 판정

- Verdict: **ABSENT** (BLOCKED_PREREQUISITE)
- 선행 의존: 축1 Approval Chain(ABSENT)·축2 Authority Matrix(ABSENT)·축3 Identity/Org(ABSENT) 3축 전부에 막힘. Registry의 authoritative_source·registry_type(LEGAL_ENTITY/ORGANIZATION/FINANCE)·legal entity/geographic routing support 는 조직·권한·법인 SoT 없이는 값을 채울 수 없다. tenant_id 권위 목록 부재(축3)로 테넌트 격리 registry 자체가 BLOCKED.
- cover: **0** (registry 엔티티 통째 부재 · 인접 flat 승인테이블은 registry 아님)

## 4. 확장/구현 방향 (설계)

- **순신규 엔티티**. 단 하위 필드의 인접 선례를 재구현하지 말 것: evidence=`SecurityAudit.php:56-68` verify() 확장 · WORKFLOW-type registry 는 `catalog_writeback_job`(`Catalog.php:75-84`) 승인 큐 lifecycle 을 registry 아래로 편입(중복 큐 테이블 신설 금지·§66 Duplicate Queue Table).
- **Mandatory Control**: registry는 자신이 선언한 능력(monetary/legal entity/geographic routing support)을 실제로 뒷받침하지 못하면 활성화 금지 — 능력 초과 선언은 §58 "Amount 초과인데 승인 성공" 구조적 gap 을 유발한다.
- **무후퇴**: 신설 registry가 기존 `admin_growth_approval`·`catalog_writeback_approval`·`mapping_change_request` 경로를 회귀시키면 안 됨(§70). registry는 이들을 흡수·상위화하되 기존 승인 동작을 보존한다.
- **선결**: 실 registry 는 선행 4축(chain·authority·org·SoD) 신설 후 별도 승인세션에서만 구현. 본 문서는 부재 증명·설계 명세에 한한다.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].

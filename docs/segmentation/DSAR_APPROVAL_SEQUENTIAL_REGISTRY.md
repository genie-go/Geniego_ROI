# DSAR — Sequential Approval Registry (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§7 REGISTRY 필수 필드 (원문 전사):

1. registry_id
2. tenant_id
3. registry_code
4. name
5. registry_type
6. authoritative_source
7. workflow engine type
8. stage support
9. level support
10. step support
11. skip support
12. pause support
13. resume support
14. retry support
15. recovery support
16. replay support
17. simulation support
18. reconciliation support
19. owner
20. active_version
21. valid_from
22. valid_to
23. status
24. evidence

Registry Type (enum·13종): PLATFORM · TENANT · WORKFLOW · FINANCE · REBATE · CLAIM · SETTLEMENT · PAYMENT · CONTRACT · COMPLIANCE · LEGAL · SECURITY · CUSTOM.

## 2. 기존 구현 대조

- **Sequential Approval Registry 상위 개념 부재.** 순차 승인 상태머신을 "레지스트리→정책→정의→버전→인스턴스"로 계층화해 다스리는 최상위 카탈로그는 backend 어디에도 없다(ⓑ 전수조사). 실존하는 승인 인프라는 상위 registry 추상 없이 도메인에 국한된 flat 상태 전이 3종뿐이다: `admin_growth_approval`(`AdminGrowth.php:146`), `catalog_writeback_job` 승인 큐(`Catalog.php:80`), `mapping_change_request` 정족수(`Mapping.php:287`).
- **workflow engine type(필드 7)의 대응 실체 없음**: 워크플로 엔진(camunda/temporal/bpmn/saga/state_machine/CREATE TRIGGER)은 라이브 전무. 진행은 PHP 핸들러 인라인 SQL UPDATE + cron 폴링이며 선언적 워크플로 정의가 없다. 따라서 registry가 선언해야 할 authoritative_source·workflow engine type의 값을 채울 실 엔진이 존재하지 않는다.
- **stage/level/step/skip/pause/resume/retry/recovery/replay/simulation/reconciliation support(필드 8–18)**: 대부분 부재. 저니 도메인에만 pause/resume·retry(stale 회수)·멱등 primitive가 성숙하게 있으나(`JourneyBuilder.php:396,403,415-425`) 이는 마케팅 그래프순회 상태머신이지 승인 registry가 아니며 KEEP_SEPARATE다. Stage/Level/Step 다단 개념은 backend 전체 no hits(`current_step/stage/level/step_order/sequence_no` 0).
- **tenant_id(필드 2)**: 권위 Tenant 마스터 부재(선행 축 Identity/Org ABSENT). `parent_user_id=owner` 계정트리(`UserAuth.php:156-157,1225-1227`)만 존재해 registry의 legal/organization/tenant 격리 근거가 없다.
- **evidence(필드 24)**: 유일하게 검증 가능한 evidence 정본 = `SecurityAudit.php:56-68`(verify() 실재). registry evidence는 이것을 확장해야 하며, tamper-evident 하지 않은 장식 해시체인을 인용하면 안 된다.

## 3. 판정

- Verdict: **ABSENT** (BLOCKED_PREREQUISITE)
- 선행 의존: 축1 Approval Chain/Workflow(ABSENT)·축2 Authority Matrix(ABSENT)·축5 Identity/Org(PARTIAL·Tenant Guard만 실재) 에 막힘. registry_type의 LEGAL/COMPLIANCE/SECURITY/FINANCE 라우팅과 authoritative_source·workflow engine type은 조직·권한·워크플로 엔진 SoT 없이는 값을 채울 수 없다. tenant_id 권위 목록 부재로 테넌트 격리 registry 자체가 BLOCKED.
- cover: **0** (registry 엔티티 통째 부재 · 인접 flat 승인테이블은 registry 아님)

## 4. 확장/구현 방향 (설계)

- **순신규 엔티티**. 단 하위 필드의 인접 선례를 재구현하지 말 것: evidence=`SecurityAudit.php:56-68` verify() 확장 · WORKFLOW-type registry 는 `catalog_writeback_job`(`Catalog.php:80`) 승인 큐 lifecycle 을 registry 아래로 편입(중복 큐/승인 테이블 신설 금지·§67 Duplicate Workflow Status Table).
- **Mandatory Control**: registry는 자신이 선언한 능력(stage/level/step/skip/pause/resume/retry/recovery/replay/simulation/reconciliation support)을 실제로 뒷받침하는 엔진·정의가 없으면 활성화 금지 — 능력 초과 선언은 §59 Critical Gap(Workflow Engine 불일치·이중 진실원)을 유발한다. workflow engine type 은 실 엔진 부재 시 값을 지어내면 안 된다.
- **무후퇴**: 신설 registry가 기존 `admin_growth_approval`·`catalog_writeback_job`·`mapping_change_request` 경로를 회귀시키면 안 됨(§71). registry는 이들을 흡수·상위화하되 기존 승인 동작을 보존한다.
- **선결**: 실 registry 는 선행 4축(chain·authority·assignment·org) 신설 후 별도 승인세션에서만 구현. 본 문서는 부재 증명·설계 명세에 한한다.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].

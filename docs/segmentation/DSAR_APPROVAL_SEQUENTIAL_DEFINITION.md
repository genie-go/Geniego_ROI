# DSAR — Sequential Approval Definition (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§9 DEFINITION 필수 필드 (원문 전사):

1. definition_id
2. registry_id
3. workflow_id
4. workflow_version_id
5. chain_id
6. chain_version_id
7. code
8. name
9. description
10. stage ordering policy
11. level ordering policy
12. step ordering policy
13. dependency policy
14. activation policy
15. completion policy
16. skip policy
17. retry policy
18. recovery policy
19. current version
20. owner
21. valid_from
22. valid_to
23. status
24. evidence

## 2. 기존 구현 대조

- **Sequential Definition 엔티티 부재이며, 그것이 참조해야 할 상위 축들이 전부 부재.** definition은 그 정의상 workflow_id·workflow_version_id·chain_id·chain_version_id(필드 3–6)를 외래 참조로 요구한다. 그러나:
  - **Workflow**: 워크플로 엔진·워크플로 정의 테이블 라이브 전무(ⓑ). 참조할 workflow_id 원본이 없다.
  - **Chain**: `approval_chain/chain_level/chain_stage/chain_resolution` 라이브 0(축1 ABSENT). 참조할 chain_id·chain_version_id 원본이 없다. 실존 승인값은 도메인 특화(`Catalog.php:2300` approvalCreate·`Catalog.php:395` requiresHighValueApproval)이며 chain 정의가 아니다.
- **stage/level/step ordering policy(10–12)**: 다단 Stage/Level/Step 개념 자체가 backend 전체 no hits(`current_step/stage/level/step_order/sequence_no` 0). 큐 순서는 `ORDER BY id ASC` FIFO(`Catalog.php:1716`)뿐 — 순서 정책이 아니라 처리 순서다.
- **dependency/activation/completion policy(13–15)**: Dependency 개념·활성화/완료 정의 부재. 실존 완료는 `admin_growth_approval` 단발(`AdminGrowth.php:1330`)·`mapping_change_request` 정족수(`Mapping.php:287`)이며 정의 기반 활성화 전이가 아니다.
- **evidence(24)**: `SecurityAudit.php:56-68` verify() 만 정본.

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE**
- 선행 의존: **workflow(엔진·정의) 부재 + chain(축1 Approval Chain) 부재** — definition의 정의상 필수 외래참조(workflow_id/version·chain_id/version)의 원본 2종이 통째로 없다. 이 문서 계열에서 가장 강하게 막힌 엔티티다: registry/policy가 순신규로라도 값을 채울 여지가 있는 것과 달리, definition은 참조 대상(workflow·chain) 신설 이전에는 정의 자체를 구성할 수 없다.
- cover: **0** (definition 부재 · workflow·chain 참조원 부재로 구성 불가)

## 4. 확장/구현 방향 (설계)

- **순신규 엔티티이나 선행 강제**: workflow(엔진·정의)와 chain(Stage/Level/Step 구조) 신설이 definition의 절대 선결 — 이 둘 없이 definition을 만들면 §59 Critical Gap(Definition·Runtime 혼합·Sequential Version 없음)을 그대로 유발한다.
- **Runtime/Definition 분리(§24 ORDERING)**: stage/level/step ordering policy는 Stable Sequence Number·Unique within Parent 로 정의하고, Runtime 활성화 후 Definition Sequence 직접 변경 금지·재정렬은 새 Version만. Runtime은 생성 당시 Snapshot을 따른다.
- **무후퇴**: 정형화가 기존 도메인 승인(`Catalog.php:2300,395`·`AdminGrowth.php:1330`·`Mapping.php:287`) 동작을 회귀시키지 않게 흡수·상위화.
- **선결**: workflow·chain·authority·assignment 축 신설 후 별도 승인세션. 본 문서는 BLOCKED 증명·설계 명세.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].

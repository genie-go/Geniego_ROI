# DSAR — Sequential Approval Stage Instance (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§13 STAGE_INSTANCE 필수 필드 (원문 전사):

1. stage_instance_id
2. instance_id
3. chain_stage_id
4. chain_stage_version
5. stage sequence
6. stage type
7. mandatory
8. blocking
9. activation policy
10. completion policy
11. skip policy
12. current level instance id
13. stage status
14. activated_at
15. completed_at
16. skipped_at
17. suspended_at
18. blocked_at
19. version
20. status
21. evidence

(stage status enum 전사·판정 = [[DSAR_APPROVAL_SEQUENTIAL_STAGE_STATUS]].)

## 2. 기존 구현 대조

- **Stage 개념 자체가 부재.** 승인을 다단(Stage→Level→Step)으로 나눠 각 Stage를 인스턴스화하고 순서·필수·차단·활성화/완료/스킵을 관리하는 계층은 backend 전무. `current_step/current_stage/current_level/step_order/stage_order/sequence_no/approval_stage/approval_level/approval_step` backend 전체 **no matches**(ⓑ 전수조사). 존재하는 승인은 단발(`AdminGrowth.php:1330`) 또는 단일레벨 정족수(`Mapping.php:287`)이며 "동일 레벨 N명 병렬"일 뿐 Stage/Level 계층이 없다.
- **chain_stage_id·chain_stage_version(3–4)**: 참조 대상인 Chain Stage 정의(축1 Approval Chain) ABSENT. `chain_stage` 라이브 0. 채울 외래 참조원이 없다.
- **stage sequence(5)**: 순서 번호 개념 부재. 유일한 순서는 큐 FIFO `ORDER BY id ASC`(`Catalog.php:1716`·`Omnichannel.php:405`)로 처리 순서이지 승인 단계 시퀀스가 아니다.
- **current level instance id(12)**: 하위 Level Instance 개념 ABSENT([[DSAR_APPROVAL_SEQUENTIAL_STAGE_STATUS]] 계열 및 §14 LEVEL_INSTANCE 부재). Stage→Level→Step 트리 전체가 없다.
- **activated/completed/skipped/suspended/blocked_at(14–18)**: 단계 활성화·완료→다음 단계 활성화 전이가 없어 진입할 단계 타임스탬프가 없다.

## 3. 판정

- Verdict: **ABSENT** (Stage 개념 부재)
- 선행 의존: 축1 Approval Chain(chain_stage 정의) ABSENT + 다단 Stage/Level/Step 계층 통째 부재. instance([[DSAR_APPROVAL_SEQUENTIAL_INSTANCE]] BLOCKED)와 chain_stage 참조원이 둘 다 없어 Stage Instance는 구성 불가.
- cover: **0** (Stage 개념·chain_stage 정의·순서 시퀀스 전부 no hits)

## 4. 확장/구현 방향 (설계)

- **순신규 엔티티**. 선결은 Chain(Stage/Level/Step 구조 정의) 신설 — chain_stage_id/version이 참조할 원본 없이 Stage Instance를 만들면 §59 Critical Gap(Stage/Level/Step 미구분·Definition·Runtime 혼합)을 유발한다.
- **§24 ORDERING 준수**: stage sequence는 Stable·Unique within Parent·No Duplicate Active·Gap Policy 준수. Runtime은 생성 당시 Snapshot을 따르고 Definition Sequence 직접 변경 금지·재정렬은 새 Version만.
- **Mandatory Control**: mandatory·blocking Stage는 §25 Current Stage Resolution(가장 앞선 Created·Blocking Previous 완료·Skip/Cancel 아님)으로만 current 진입, 동시 2+ current Stage=Conflict 생성·진행 차단. Mandatory Stage Skip 금지(§35).
- **선결**: chain·instance 축 신설 후 별도 승인세션. 본 문서는 ABSENT 증명·설계 명세.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].

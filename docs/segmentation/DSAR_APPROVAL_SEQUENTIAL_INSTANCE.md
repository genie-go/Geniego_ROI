# DSAR — Sequential Approval Instance (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§11 INSTANCE 필수 필드 (원문 전사):

1. instance_id
2. tenant_id
3. approval_request_id
4. request_version_id
5. case_id
6. case_version_id
7. item_id
8. requirement_id
9. workflow_id
10. workflow_version_id
11. chain_id
12. chain_version_id
13. chain_resolution_id
14. sequential_definition_id
15. sequential_version_id
16. execution mode
17. current stage instance id
18. current level instance id
19. current step instance id
20. current cursor id
21. execution status
22. started_at
23. paused_at
24. resumed_at
25. suspended_at
26. blocked_at
27. completed_at
28. cancelled_at
29. version
30. immutable origin hash
31. status
32. evidence

Execution Mode (enum·6종): STRICT_SEQUENTIAL · SEQUENTIAL_WITH_OPTIONAL_LEVELS · SEQUENTIAL_WITH_SKIP · SEQUENTIAL_WITH_AUTO_ADVANCE · SEQUENTIAL_WITH_CONDITIONAL_REFERENCE · CUSTOM.

(execution status enum 전사·판정 = [[DSAR_APPROVAL_SEQUENTIAL_EXECUTION_STATUS]].)

## 2. 기존 구현 대조

- **Sequential Instance 엔티티 부재.** 하나의 승인 요청을 다단 순차 실행의 런타임 인스턴스로 삼아 current stage/level/step·cursor·execution status를 진척시키는 실행체는 backend 전무. 실존하는 승인 "인스턴스"는 flat 상태 레코드 3종뿐이며 다단 진척 축(current stage/level/step instance id·cursor)이 통째로 없다: `admin_growth_approval`(`AdminGrowth.php:146`)·`catalog_writeback_job`(`Catalog.php:80`)·`mapping_change_request`(`Mapping.php:287`).
- **참조 외래키군(3–15)**: approval_request/case/workflow/chain/chain_resolution/sequential_definition/sequential_version 원본이 전부 ABSENT(축1 Chain·워크플로 엔진·definition BLOCKED). 참조로 채울 SoT가 없다.
- **current stage/level/step instance id(17–19)·current cursor id(20)**: 다단 Stage/Level/Step·Cursor 개념 ABSENT(`current_step/stage/level` 0). 가장 근접한 런타임 커서는 마케팅 저니의 `journey_enrollments.current_node`(`JourneyBuilder.php:44,68,504`)이나 이는 승인 무관 그래프순회이며 KEEP_SEPARATE다.
- **execution mode(16)**: STRICT_SEQUENTIAL 등 6모드가 가리킬 순차/스킵/자동전진 실행기 부재. 실존 진행은 인라인 조건부 UPDATE + FIFO(`Catalog.php:1716`)로 모드 개념이 없다.
- **immutable origin hash(30)·version(29)**: 불변 오리진 해시 정본은 `SecurityAudit.php:56-68` verify()만; 낙관적 version CAS는 ABSENT(menu_defaults.version=라벨).
- **started/paused/resumed/suspended/blocked_at(22–26)**: 저니 도메인에 pause/resume(resume_at·wait_until `JourneyBuilder.php:82`·cron `:403`)·stale 회수(`:396`) 타임스탬프 패턴이 성숙하게 실재하나 승인 인스턴스가 아니다(참조정본·KEEP_SEPARATE).

## 3. 판정

- Verdict: **ABSENT** (BLOCKED_PREREQUISITE)
- 선행 의존: 축1 Chain·축4 Assignment·definition/version(BLOCKED)·Cursor primitive(ABSENT) 전부에 막힘. instance는 chain_resolution_id·sequential_definition_id·current stage/level/step instance id를 요구하나 그 참조 대상이 없어 다단 인스턴스를 구성할 수 없다. Step→assignee 링크가 해석될 Assignment SoT 부재(축4)로 공회전.
- cover: **0** (flat 승인 3종은 다단 실행 인스턴스 아님)

## 4. 확장/구현 방향 (설계)

- **순신규 엔티티**. cursor/pause-resume/lease/멱등의 **가장 성숙한 참조 구현**은 JourneyBuilder(`JourneyBuilder.php:44,68,82,396,403,415-425,446-490`) — 패턴을 인용하되 마케팅 코드를 재사용·오염하지 말 것(KEEP_SEPARATE). current cursor는 §45 원칙대로 Derived Cache가 아니라 Runtime Consistency Contract로 설계.
- **동시성**: current stage/level/step 진척은 CAS 조건부 UPDATE(`Catalog.php:1726-1730`·`JourneyBuilder.php:415-425`)·FOR UPDATE SKIP LOCKED(`Omnichannel.php:405`) 위에 구현(CANONICAL). immutable origin hash=`SecurityAudit.php:56-68` 확장.
- **Mandatory Control**: 동시 2+ current 지목 금지(§25 Conflict 생성·진행 차단). execution mode STRICT_SEQUENTIAL은 이전 Mandatory 완료 없이 다음 활성화 금지(§28 — `status=COMPLETED`만으로 불충분·Completion Event+Snapshot 병행).
- **선결**: chain·assignment·definition·cursor 축 신설 후 별도 승인세션. 본 문서는 설계 명세.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].

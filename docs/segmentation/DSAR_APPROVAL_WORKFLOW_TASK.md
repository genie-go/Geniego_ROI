# DSAR — Workflow Task (§36)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §36 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_WORKFLOW_TASK` 엔티티 | `workflow_task`·`human_task`·`task_claim` **backend/src grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| Task 개념 자체 | 승인은 **노드도 Task도 아니고 핸들러 메서드**(`Mapping::approve` Mapping.php:238-294 · `AdminGrowth::approvalDecide` AdminGrowth.php:1322-1327 · `Alerting::decideAction`) | `NOT_APPLICABLE` |
| 배정 대상(assignee) | `assigned_to`/`assignee` **grep 0**. `candidate` 히트는 창고 후보(Wms.php:1017,1063)·아이덴티티 병합 후보(CRM.php:769)·지오 후보(Geo.php:105) = **전부 타 도메인** | `KEEP_SEPARATE_WITH_REASON` |
| task priority | 승인 3핸들러(Alerting·Mapping·AdminGrowth) `priority` **grep 0** | `NOT_APPLICABLE` |
| due date | `due_at` = **Dsar.php:204,235,291,307,373 단 1도메인**(개인정보 요청 법정기한 SLA) | `KEEP_SEPARATE_WITH_REASON`(선례로만 인용) |
| lock version | `lock_version`·optimistic `version` **grep 0** — 레포 전역 낙관적 잠금 부재 | `NOT_APPLICABLE` |
| 잡 단위 선점(형태 유사) | `Omnichannel::claimBatch`(Omnichannel.php:394-423) · `ChannelSync`(:6136-6153) · `Catalog`(:1683-1691) · `JourneyBuilder`(:411-418) | `KEEP_SEPARATE_WITH_REASON` — **잡/메시지 선점**이지 Human Task 아님 |

**★축 주의 — 형태 유사 ≠ 의미 동일.** 레포의 `claim*` 4계열은 **워커가 잡 행을 선점**하는 기전이다. 원문 §36 의 `claimed by`/`claimed_at` 은 **사람이 Human Task 를 집는 것**이다. 주체(워커 vs 사람)·대상(메시지 vs 승인 업무)·목적(중복 전송 차단 vs 배타적 처리 책임)이 전부 다르다. **이 유사를 커버로 계산하면 갭이 정의상 소멸하는 역산**이다 → `NOT_APPLICABLE`. 다만 **동시성 구현 패턴의 재사용 근거로는 인용 가능**(§38 참조).

**★lock version 부재의 실증.** `Mapping::approve` 는 :262 에서 `status='pending'` 을 **읽어 검사**하지만, 최종 :288 `UPDATE mapping_change_request SET approvals_json=?, status=? WHERE id=? AND tenant_id=?` 에는 **status/version 가드가 없다**. 즉 읽기-검사-쓰기 사이가 무방비다(동시 승인 시 `approvals_json` lost update 가능). 원문 `lock version` 요구가 채우려는 결번이 **현행에 실재**함을 보인다.

## 1. 원문 전사 + 판정 — **원문 27종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | workflow_task_id | 부재 | `NOT_APPLICABLE` |
| 2 | workflow_instance_id | 부재(§10 인스턴스 자체 부재) | `NOT_APPLICABLE` |
| 3 | workflow_token_id | 부재(§11 토큰 자체 부재) | `NOT_APPLICABLE` |
| 4 | workflow_node_id | 부재(승인) · 인접 = `journey_node_logs` 의 `node_id`(JourneyBuilder.php:50,69) — **마케팅 여정** | `KEEP_SEPARATE_WITH_REASON` |
| 5 | task_definition_id | 부재 — 정의 테이블(`workflow_*`/`flow_*`/`wf_*`) grep 0 | `NOT_APPLICABLE` |
| 6 | approval_case_id | 부재 · 인접 = `mapping_change_request.id`(Mapping.php:253) = **케이스 아닌 단건 제안** | `NOT_APPLICABLE` |
| 7 | approval_item_id | 부재 — Case↔Item 분화 없음 | `NOT_APPLICABLE` |
| 8 | approval_requirement_id | 부재 — 요건은 코드 상수(`required_approvals` 리터럴 `2` Mapping.php:209) | `NOT_APPLICABLE` |
| 9 | task type | 부재 | `NOT_APPLICABLE` |
| 10 | task code | 부재 | `NOT_APPLICABLE` |
| 11 | task title | 부재 | `NOT_APPLICABLE` |
| 12 | task priority | 부재(승인 3핸들러 grep 0) | `NOT_APPLICABLE` |
| 13 | candidate participants | 부재 — 후보군 개념 전무 | `NOT_APPLICABLE` |
| 14 | assigned participant | 부재 — `assigned_to`/`assignee` grep 0 | `NOT_APPLICABLE` |
| 15 | claimed by | 부재(사람) · 형태 유사 = 워커 `claim_id`(Omnichannel.php:394,409) | `KEEP_SEPARATE_WITH_REASON` |
| 16 | task input reference | 부재 · 인접 = `payload`(catalog_writeback_job Catalog.php:1712 맥락) — 잡 페이로드 | `NOT_APPLICABLE` |
| 17 | task output reference | 부재 · 인접 = `result` 컬럼(channel_shipment_job ChannelSync.php:6145) — 잡 결과 | `NOT_APPLICABLE` |
| 18 | due date reference | 부재(승인) · 선례 = `dsar_request.due_at`(Dsar.php:204) | `KEEP_SEPARATE_WITH_REASON` |
| 19 | timeout at | 부재(승인) · 인접 = 워커 stale 리스(Omnichannel.php:395 `900s` · ChannelSync.php:6136 `600s`) = **워커 크래시 회수**이지 업무 기한 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 20 | created_at | 부재(Task) — 승인 3종에 Task 행 자체가 없음 | `NOT_APPLICABLE` |
| 21 | assigned_at | 부재 | `NOT_APPLICABLE` |
| 22 | claimed_at | 부재(사람) · 형태 유사 = `omni_outbox.claimed_at`(Omnichannel.php:397,409) | `KEEP_SEPARATE_WITH_REASON` |
| 23 | started_at | 부재 | `NOT_APPLICABLE` |
| 24 | completed_at | 부재 · 인접 = `dsar_request.completed_at`(Dsar.php:373) | `NOT_APPLICABLE` |
| 25 | status | 부재(Task) — 단, 레포 전역 `UPDATE ... SET status=` **155건/44파일**이 전부 **전이 규칙 선언 0**(호출 지점 인라인) | `NOT_APPLICABLE` |
| 26 | lock version | **grep 0** — 위 §0 "lock version 부재의 실증" 참조 | `NOT_APPLICABLE` |
| 27 | evidence | 부재 · 인접 감사 = `Mapping::audit`(:292) · `journey_node_logs`(JourneyBuilder.php:50,69) · `auth_audit_log`(TeamPermissions.php:19) = **감사로그이지 Task 증거 참조 아님** | `NOT_APPLICABLE` |

**실측 개수: 27 / 27 전사.** 커버리지 = 부재(`NOT_APPLICABLE`) 20 · 형태유사 분리(`KEEP_SEPARATE_WITH_REASON`) 7 · **현행 충족 0**.

## 2. 규칙

- 🔴 **잡 선점 `claim*` 4계열을 §36 `claimed by`/`claimed_at`/`timeout at` 의 커버로 계산 금지.** 워커의 메시지 선점 ≠ 사람의 Human Task 클레임. 매핑하면 역산이다. **패턴 재사용 근거로만 인용**한다(§38).
- 🔴 **`lock version` 신설 시 다른 동시성 모델 도입 금지.** optimistic lock(`version`)·분산락·`GET_LOCK` 이 **레포 전역 grep 0** 인 것은 우연이 아니라 **SQLite 폴백 호환이라는 명시적 설계 제약**(Db.php 이중 백엔드 · `Omnichannel::claimConditional` Omnichannel.php:427-447 이 그 제약의 증거)이다. §36 `lock version` 은 **조건부 UPDATE + rowCount CAS**(ChannelSync.php:6150 주석 "FOR UPDATE 불필요·SQLite/MySQL 동일 동작")로 구현해야 제약을 지킨다.
- **`due date reference` 는 `dsar_request.due_at`(Dsar.php:204) 을 선례로 참조하되 재사용 금지** — 법정 SLA 기한과 업무 기한은 도메인이 다르다.
- **`status` 신설 시 전이 규칙을 선언적으로 둘 것.** 현행 155건/44파일이 전부 인라인이고 전이 가드는 **4곳뿐**(`FeedTemplate::transition`:248-285 · `Mapping::apply`:309 · `Catalog::approveQueue`:2341 · `AdminGrowth::launch`:1155). §36 Task 가 **다섯 번째 인라인**이 되면 안 된다.
- 🔴 **20종 "있다고 가정"하고 배선 금지.**
- ⚠️ **`evidence` 는 부록이 아니다.** 원문 필드 목록의 **마지막 항목**이며 27번째 필수 필드다(5-3-1 에서 19축이 일관되게 이 항목을 누락했다).

# DSAR — Human Task (§25)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §25 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Human Task 엔티티 | **부재** — 배정/클레임/토큰 개념 전무 | `NOT_APPLICABLE` |
| `claimed_by`·`task_token`·`assignment_version`·`lock_version`·`legal_entity` | **backend/src grep 0** | `NOT_APPLICABLE` |
| `claim_id`/`claimed_at` | **존재하나 `omni_outbox`**(Omnichannel.php:97,:397,:410,:418) = **잡 큐 워커 클레임**. `claimBatch`(:390)는 `private static` — 사람이 아니라 워커가 선점 | `KEEP_SEPARATE_WITH_REASON` |
| `due_date`·`priority`·`status`·`created_by` | **존재하나 `pm_tasks`**(PM/Tasks.php:29-47) · `pm_raid`(PM/Enterprise.php:60) = **프로젝트 관리(Gantt:39·RAID·milestone)** 도메인 | `KEEP_SEPARATE_WITH_REASON` |
| optimistic lock(`version`)·분산락·`GET_LOCK` | **전부 grep 0** — SQLite 폴백 호환이 **명시적 설계 제약** | `NOT_APPLICABLE` |

**★축 주의 — §25에는 형태 유사 함정이 둘 있다.**
① **`pm_tasks`는 "Task"라는 이름과 `priority`/`due_date`/`status`/`created_by` 필드까지 갖춘 실 엔티티**다(PM/Tasks.php:29-47). 그러나 이것은 **프로젝트 일정관리**(간트 차트 duration 계산 Gantt.php:70-71, RAID 리스크 대장)이지 **승인 작업함**이 아니다 — 배정(Assignment)·클레임(Claim)·토큰·락 축이 전무하다. 이름과 일부 필드가 겹친다는 이유로 커버로 계산하면 **갭이 정의상 소멸하는 역산**이다.
② **`claim_id`/`claimed_at`는 실재하며 심지어 레포 최고 성숙 자산**(`Omnichannel::claimBatch` :390-423 — stale lease 900s 회수 → `SELECT..FOR UPDATE SKIP LOCKED` → 조건부 UPDATE 폴백)이다. 그러나 이는 **워커가 발송 잡을 선점**하는 것으로, "사람이 승인 업무를 집어든다"는 Human Task Claim과 **의미가 다르다**. 🔴 다만 **실행 프리미티브(선점·stale 회수·CAS)의 재사용 근거로는 인용 가능**하다 — 새 동시성 모델(optimistic lock/분산락) 도입은 **SQLite 폴백 제약 위반**이다.

## 1. 원문 전사 + 판정 — Human Task Lifecycle **원문 15종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | CREATED | 부재 | `NOT_APPLICABLE` |
| 2 | ASSIGNMENT_PENDING | 부재 | `NOT_APPLICABLE` |
| 3 | ASSIGNED | 부재 | `NOT_APPLICABLE` |
| 4 | AVAILABLE | 부재 · 인접 = `omni_outbox.status='queued'`(Omnichannel.php:397) | `KEEP_SEPARATE_WITH_REASON` |
| 5 | CLAIMED | 부재 · 인접 = `status='processing'`+`claim_id`(:410) — **워커 선점** | `KEEP_SEPARATE_WITH_REASON` |
| 6 | IN_PROGRESS | 부재 | `NOT_APPLICABLE` |
| 7 | SUSPENDED | 부재 | `NOT_APPLICABLE` |
| 8 | COMPLETION_PENDING | 부재 | `NOT_APPLICABLE` |
| 9 | COMPLETED | 부재 | `NOT_APPLICABLE` |
| 10 | RELEASED | 부재 · 인접 = stale lease 900s 회수(`claim_id=NULL` :397) — **시간 만료 회수**이지 자발적 반납 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 11 | REASSIGNMENT_PENDING | 부재 | `NOT_APPLICABLE` |
| 12 | CANCELLED | 부재 | `NOT_APPLICABLE` |
| 13 | EXPIRED | 부재 | `NOT_APPLICABLE` |
| 14 | FAILED | 부재 | `NOT_APPLICABLE` |
| 15 | BLOCKED | 부재 · §24 검토 결과 `BLOCKED` 와 **동명이의** | `NOT_APPLICABLE` |

**실측 개수: 15 / 15 전사.** 커버리지 = 부재 11 · 인접(도메인 상이) 4 · 현행 충족 **0**.

## 2. 원문 전사 + 판정 — Human Task 기록 항목 **원문 16종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Candidate Subjects | grep 0 — 승인자는 "먼저 누른 사람" | `NOT_APPLICABLE` |
| 2 | Candidate Roles | grep 0 · 인접 = RBAC 역할(`viewer<connector<analyst<admin`)이나 **후보 바인딩 아님** | `NOT_APPLICABLE` |
| 3 | Candidate Groups | grep 0 | `NOT_APPLICABLE` |
| 4 | Required Scope | grep 0(작업 단위) · 인접 = API 키 scope(`write:*`)이나 **인증 축** | `NOT_APPLICABLE` |
| 5 | Required Legal Entity | `legal_entity` **grep 0** | `NOT_APPLICABLE` |
| 6 | Required Environment | 부재 · 인접 = `Db::envLabel()`(278차)이나 작업 배정과 무관 | `NOT_APPLICABLE` |
| 7 | Claimed By | `claimed_by` **grep 0**(`omni_outbox`는 `claim_id`=워커 UUID) | `NOT_APPLICABLE` |
| 8 | Claimed At | 부재(승인) · `omni_outbox.claimed_at`(:97) = 워커 선점 시각 | `KEEP_SEPARATE_WITH_REASON` |
| 9 | Assignment Version | grep 0 | `NOT_APPLICABLE` |
| 10 | Due Date Reference | 부재(승인) · `pm_tasks.due_date`(PM/Tasks.php:42) = **PM 도메인** | `KEEP_SEPARATE_WITH_REASON` |
| 11 | Priority | 부재(승인) · `pm_tasks.priority`(:39) = **PM 도메인** | `KEEP_SEPARATE_WITH_REASON` |
| 12 | Form Reference | grep 0 | `NOT_APPLICABLE` |
| 13 | Evidence Requirement | grep 0 | `NOT_APPLICABLE` |
| 14 | Decision Requirement | grep 0 · 현행 정족수는 행 컬럼 상수(Mapping.php:287) | `NOT_APPLICABLE` |
| 15 | Task Token | grep 0 | `NOT_APPLICABLE` |
| 16 | Lock Version | `lock_version`·optimistic lock **grep 0** — SQLite 폴백 제약 | `NOT_APPLICABLE` |

**실측 개수: 16 / 16 전사.** 커버리지 = 부재 13 · 인접(도메인 상이) 3 · 현행 충족 **0**.
※ 원문 §25 기록 항목 목록은 **`evidence` 로 끝나지 않는다**(마지막 = `Lock Version`). `Evidence Requirement`(13번)가 중간에 있을 뿐이다 — 스펙 다른 엔티티의 관례(`evidence` 종결)를 여기에 **투사하지 않았다**.

## 3. 규칙

- 🔴 **`pm_tasks`를 Human Task로 재활용 금지.** 이름·필드 유사에 의한 매핑은 역산이다. 승인 작업함은 **신설**이되, PM 도메인과 **테이블을 공유하지 마라**(간트/RAID 집계 SQL이 승인 건을 삼킨다).
- 🔴 **새 동시성 모델 도입 금지.** `Lock Version`(16번) 요구를 optimistic lock 컬럼으로 구현하면 **SQLite 폴백 호환 제약을 위반**한다. 현행 확립 패턴 = **조건부 UPDATE + rowCount CAS**(Omnichannel:394-447 · Catalog:1683 · ChannelSync:6136-6153 · JourneyBuilder:411). `Lock Version` 은 이 CAS 위에 얹어라.
- **Claim/Release 는 `Omnichannel::claimBatch`(:390-423) 패턴을 재사용하라** — stale lease 회수(:397)가 이미 `RELEASED`(10번)/`EXPIRED`(13번)의 실행 프리미티브다. 단 **의미는 재정의**(워커→사람). `claimBatch` 는 `private static` 이므로 **가시성 승격이 선결**이다.
- Lifecycle 15종은 **JourneyBuilder 노드로 표현될 수 없다** — JourneyBuilder는 `customer_id` 필수(:554) **마케팅 여정 도메인**이다. 비-고객 승인을 태우려면 **enrollment 컨텍스트 일반화가 선결**(설계 결론 1).
- 🔴 **31종(Lifecycle 15 + 기록 16) 전부 현행 충족 0** — "있다고 가정"하고 배선 금지.

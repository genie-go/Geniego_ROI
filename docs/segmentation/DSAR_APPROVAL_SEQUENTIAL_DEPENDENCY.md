# DSAR — Dependency (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §23 DEPENDENCY
- **TYPE**: `PREVIOUS_STAGE/LEVEL/STEP` · `EXPLICIT_STEP/LEVEL/STAGE` · `ASSIGNMENT` · `CLAIM` · `AUTHORITY` · `DELEGATION` · `RESOURCE_STATE` · `EXTERNAL_EVENT_REFERENCE` · `CONDITIONAL_REFERENCE` · `MANUAL_RELEASE` · `CUSTOM`.
- **MODE**: `BLOCKING` / `OPTIONAL` / `INFORMATIONAL` / `CONDITIONAL_REFERENCE`.
- 필드: dependency_id · sequential_version_id · source/target scope type · source/target scope id · dependency type · mode · completion requirement · skip treatment · failure treatment · evaluation order · valid_from/to · status · evidence.

## 2. 기존 구현 대조

- **단계 간 의존성(Dependency) 개념 전면 ABSENT.** dependency_id·source/target scope·dependency type·mode 를 정의하는 의존성 레지스트리·평가기는 존재하지 않는다.
- 다단 순차의 전제인 **Stage/Level/Step 자체가 ABSENT**(`current_step/stage/level/step_order/sequence` backend 0) → `PREVIOUS_STAGE/LEVEL/STEP`·`EXPLICIT_*` 의존성이 참조할 스코프가 없다.
- 선행 SoT 부재로 다른 TYPE 도 성립 불가: `ASSIGNMENT`/`CLAIM`(§3.4 Assignment ABSENT)·`AUTHORITY`(§3.2 ABSENT)·`DELEGATION`(§3.3 ABSENT).
- 실존하는 "순서"는 **FIFO 처리순뿐**: catalog_writeback_job 큐 `ORDER BY id ASC`(`Catalog.php:1716`)·omni_outbox `Omnichannel.php:405`. 이는 도착순 소비이지 단계 간 완료 의존(blocking dependency)이 아니다.
- mapping_change_request 정족수(`Mapping.php:287`)는 **동일 레벨 병렬 M-of-N**으로, 승인자 간 순서·의존성이 없다(순차 의존의 반례 아님).

## 3. 판정

- Verdict: **ABSENT** — 단계 간 의존성 정의·모드·완료요건·평가기 전무. 실존=FIFO 처리순(의존성 아님).
- 선행 의존: Stage/Level/Step(§13~§15)·Assignment/Authority/Delegation(§3.2~§3.4) 전부 ABSENT → **BLOCKED_PREREQUISITE**.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규 **dependency 레지스트리**(sequential_version_id 결속·source/target scope·TYPE 11종·MODE 4종·completion requirement·skip/failure treatment·evaluation order). Runtime 이 아니라 Version 단위로 정의(§24 Ordering·§54 Replay 정합).
- 전제: Stage/Level/Step Instance(§13~§15) + Chain/Assignment/Authority/Delegation SoT 선행 신설 필요 — 그 전에는 `PREVIOUS_*`/`EXPLICIT_*`/`ASSIGNMENT`/`AUTHORITY`/`DELEGATION` 의존성이 공회전.
- ★`BLOCKING` 모드 의존성 미완료 시 다음 스코프 활성화 차단(Fail Closed·§59 "Previous Mandatory 미완료 진행" High 갭 방지). FIFO(`Catalog.php:1716`)는 유지하되 단계 의존과 혼동 금지 — FIFO=처리순, Dependency=완료 게이트로 명확 분리.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].

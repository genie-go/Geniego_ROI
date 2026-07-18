# DSAR — Snapshot Type (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §52 SNAPSHOT TYPE enum (전사)
`INSTANCE_INITIALIZATION` · `STAGE_ACTIVATION` · `LEVEL_ACTIVATION` · `STEP_ACTIVATION` · `ASSIGNMENT` · `CLAIM` · `DECISION_WAIT` · `STEP_COMPLETION_REFERENCE` · `STEP_SKIP` · `LEVEL_COMPLETION` · `STAGE_COMPLETION` · `PAUSE` · `RESUME` · `SUSPENSION` · `BLOCK` · `RETRY` · `RECOVERY` · `CURSOR_UPDATE` · `CONFLICT` · `RECONCILIATION` · `SIMULATION` · `AUDIT_RECONSTRUCTION`.

## 2. 기존 구현 대조

- **Snapshot Type 분류 ABSENT.** 스냅샷 엔티티 자체가 ABSENT(§52)이므로, 그 유형 enum 을 담는 컬럼/분기도 없다. 위 22종 어느 것도 실존하지 않는다.
- 각 유형이 지칭하는 트리거 시점 대부분이 부재: STAGE/LEVEL/STEP_ACTIVATION(다단 ABSENT §13~§15)·CURSOR_UPDATE(Cursor ABSENT §45)·CONFLICT/RECONCILIATION/SIMULATION(§56·§57·§55 전부 ABSENT)·ASSIGNMENT/CLAIM(§3.4 Assignment ABSENT).
- 인접 관찰: PAUSE/RESUME 개념은 JourneyBuilder 저니에 성숙하게 존재(pause/resume cron `JourneyBuilder.php:403`·resume_at/wait_until `:82`)하나 **스냅샷 유형이 아니라 저니 상태전이**이며 승인 무관(KEEP_SEPARATE). RECOVERY 시점 역시 잡 stale 회수(`Catalog.php:1700`·`Omnichannel.php:395-399`)에 유사 동작이 있으나 스냅샷 캡처를 동반하지 않는다.

## 3. 판정

- Verdict: **ABSENT** — Snapshot(§52) 부재의 종속 결과. 22종 유형 enum 전무.
- 선행 의존: 상위 Snapshot 엔티티(§52)·유형이 참조하는 stage/level/step·cursor·conflict·reconciliation·simulation 모두 ABSENT → **BLOCKED_PREREQUISITE**.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규. Snapshot(§52) 신설과 동시에 **22종 Snapshot Type enum** 을 정의, 각 활성화·완료·스킵·pause/resume/suspension/block·retry/recovery·cursor 갱신·conflict/reconciliation/simulation·audit reconstruction 시점을 유형으로 분류해 스냅샷 검색·Replay 기준을 명확화(§54).
- 재사용 기반: JourneyBuilder pause/resume 상태전이(`JourneyBuilder.php:403,82`)를 PAUSE/RESUME 유형의 시점 판별 참조(단 저니≠승인, 개념만 차용). 잡 stale 회수(`Catalog.php:1700`)를 RECOVERY 유형 트리거의 선례로 참조.
- ★무후퇴 필수: 각 유형은 §65 Audit Event 와 1:1 대응되어 감사 추적성 확보. SIMULATION 유형 스냅샷은 실 상태 미변경 보장(§55). Mandatory Control — 유형 없는 스냅샷 생성 금지(Fail Closed).

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].

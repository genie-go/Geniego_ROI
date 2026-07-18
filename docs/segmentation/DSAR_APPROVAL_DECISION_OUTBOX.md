# DSAR — Decision Outbox (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**OUTBOX(§46)** 필수 필드:
`outbox_id` · `tenant_id` · aggregate type · aggregate id · decision record id · event type · event version · payload · payload hash · correlation id · causation id · partition key · created_at · available_at · published_at · retry count · last error · status · evidence.

EVENT TYPE(§46):
`APPROVAL_DECISION_COMMITTED` · `COMMITTED_WITH_WARNINGS` · `REJECTED_BY_SYSTEM` · `SEQUENTIAL_COMPLETION_REFERENCE` · `RECONCILIATION_REQUIRED` · `MANUAL_REVIEW_REQUIRED`.

관련 축: TRANSACTION_BOUNDARY(§48) 12단계 마지막 두 단계 = 11) Sequential Completion Reference Outbox · 12) Committed Outbox. DUPLICATE_PREVENTION(§45) — "Outbox Consumer 역방향 중복" 방지 대상.

## 2. 기존 구현 대조

- **Decision Outbox = ABSENT.** 4개 in-place UPDATE 핸들러(Mapping/AdminGrowth/Alerting/Catalog) 중 어느 것도 결정 커밋 후 `outbox_id`/`decision record id`/`event type`/`payload hash`/`published_at` 축을 가진 트랜잭셔널 이벤트 레코드를 생성하지 않는다. 결정은 상태 컬럼 UPDATE로 끝나며(`Mapping::approve:288` 단일 UPDATE · `AdminGrowth::approvalDecide:1330` · `Alerting::decideAction:594` · `Catalog::approveQueue:2397`), 커밋과 side-effect 발행이 분리 저장되지 않는다.
- **인접 설계원형 = `omni_outbox`(`Omnichannel.php:390-448`).** claim/lease/SKIP LOCKED 소비 패턴, `claim_id`=`random_bytes`(`Omnichannel.php:392`), 15분 리스를 갖춘 **메시지 발송용 아웃박스**다. Decision Outbox가 요구하는 claim/lease/멱등 소비 구조의 **실전 선례**를 제공하나, aggregate=**메시지**이지 **Decision Record**가 아니다.
- `Alerting::executeAction:601-665`는 결정(`decideAction`)과 집행(`AdAdapters::pause` `:631` + UPDATE `:653`)이 **별도 호출·비원자·무아웃박스**로 갈라져 있어, outbox가 채워야 할 "커밋된 결정 → 신뢰 가능한 side-effect 발행" 계약이 코드 경로로만 존재한다(발행 보장·재시도·중복차단 없음).

## 3. 판정

- **Verdict: ABSENT**(설계원형 인접자산 = **KEEP_SEPARATE**).
- **선행 의존**: §3.1 Approval · §3.5 Sequential 부재. Decision Record(§35) 불변 저장이 없으면 `decision record id`를 참조하는 Outbox 행 자체가 성립하지 않는다 → **Record 선행**.
- **cover: 0** (Decision Outbox 기준). `omni_outbox`는 메시지 도메인 cover이지 결정 도메인 cover가 아니다.

## 4. 확장/구현 방향 (설계)

- **`omni_outbox`의 claim/lease/SKIP LOCKED 패턴을 재사용**(Golden Rule=Extend)하되, aggregate를 Decision Record로 두는 **별도 Outbox**로 신설한다 — 메시지 아웃박스에 결정 이벤트를 혼입하지 않는다(도메인 분리 유지·중복 인텔리전스 금지). `claim_id`=`random_bytes` 관용(`Omnichannel.php:392`)·15분 리스를 그대로 승계.
- Outbox 쓰기는 **Decision Record 생성과 동일 트랜잭션 내**(§48 11·12단계)에서만 발생해야 한다 — 커밋 후 별도 호출(현행 `Alerting` 분리 발행 형태) 금지. Record는 커밋됐는데 Outbox가 누락되면 §53 Recovery 대상.
- **VACUOUS 회피**: consumer(발행 워커) 배선 없이 outbox 행만 쌓으면 `omni_outbox`형 실전성이 아니라 287차 죽은 스켈레톤이 된다 — 생산자(트랜잭션)와 소비자(발행/재시도)를 함께 결정.
- EVENT TYPE 6종은 **데이터 enum**으로 저장(코드 분기 금지). `published_at` NULL = 미발행 = 신뢰 불가 상태이지 성공 아님(가짜녹색 금지).
- 실 구현 = **별도 승인 세션**. 본 문서는 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].

# DSAR — Approval Decision Slot (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§13 SLOT — Slot Key 구성:
- `tenant_id` · `case_id` · `case_version_id` · `requirement_id` · `sequential_instance_id`
- `stage/level/step instance id`
- `decision group ref` · `decision round ref` · `action scope ref`

★ 불변식: **Sequential 단일승인 = 동일 Slot 단일 Committed Decision.**

## 2. 기존 구현 대조

- **Slot 개념은 부분적으로만 실재** → PARTIAL. 현행은 "동일 대상에 이중 결정 금지"를 **상태 가드**로만 근사하며, Slot Key 정본·DB UNIQUE 제약은 없다:
  - 상태 가드 409: `AdminGrowth::approvalDecide` 이미처리 시 409(`Handlers/AdminGrowth.php:1327`), pending 중복 방지(`:1292`). → 애플리케이션 레벨 가드일 뿐, 동시 요청 경합 시 원자성 없음.
  - dedup: `Mapping::approve`가 approvals_json 내 중복 승인자 제거(`Handlers/Mapping.php:278`), 자기승인 차단(`:268`), 정족수(`:287`). 그러나 read→append→UPDATE(`:273`,`:288`)가 **트랜잭션 없이**(TOCTOU) 수행되어 동일 Slot 이중 Committed를 구조적으로 막지 못함.
  - `Catalog::approveQueue` — CAS-lite `WHERE status=` 조건부 bulk UPDATE(`Handlers/Catalog.php:2397`)로 근사하나 Slot Key 개념 없음.
- 필드 대조:
  - `case_version_id`·`sequential_instance_id`·`stage/level/step instance id`·`decision group/round ref`·`action scope ref` → **no hits**(Slot Key를 구성하는 위계 자체가 선행 부재).
  - **DB UNIQUE(Slot Key) 제약 없음** — 이중 Committed 방지가 DB 불변식이 아니라 애플리케이션 상태 체크(409)에만 의존.
- 참조 원형: omni_outbox claim/lease/SKIP LOCKED(`Handlers/Omnichannel.php:390-448`, claim_id random_bytes `:392`, 15분 리스) = Slot 점유/락/리스의 설계 원형(KEEP_SEPARATE). Paddle UNIQUE(notification_id) 멱등(`Handlers/Paddle.php:343-368`) = DB 레벨 단일성 강제의 VALIDATED_LEGACY 근거.

## 3. 판정

- Verdict: **PARTIAL** (상태 가드 409 실재 · DB UNIQUE 없음)
- 선행 의존: Slot Key는 §12 Instance·Sequential(§3.5 ABSENT)·case_version 위계에 종속. 핵심 불변식(동일 Slot 단일 Committed)이 현행에선 원자적으로 보장되지 않음(무트랜잭션 TOCTOU).
- cover: **부분** — "이중 결정 금지" 의도는 409 가드(`AdminGrowth.php:1327`)·dedup(`Mapping.php:278`)로 존재하나, **DB UNIQUE·Fencing·트랜잭션 원자성 = 0**.

## 4. 확장/구현 방향 (설계)

- 순신규 Slot Key 정본 + **DB UNIQUE(Slot Key) 제약**으로 "동일 Slot 단일 Committed Decision" 불변식을 애플리케이션 가드가 아니라 저장소 레벨에서 강제(Fail-Closed). 참조: Paddle UNIQUE 멱등(`Paddle.php:343-368`)의 DB 단일성 패턴을 결정 Slot에 일반화.
- 락/리스/Fencing: omni_outbox의 claim/lease/SKIP LOCKED(`Omnichannel.php:390-448`)를 Decision Lock(§41)/Lease(§42)/Fencing(§43)으로 확장 — Slot 점유를 낮은 Fencing 토큰이 덮어쓰지 못하게.
- 원자성: 현행 `Mapping::approve`의 read(`:273`)→UPDATE(`:288`) TOCTOU를 Transaction Boundary(§48) 안에서 Slot Unique 검증(4단계)→Record 생성(5단계)으로 대체. 409 상태 가드는 유지하되 DB UNIQUE가 최종 방어선.
- 무후퇴: 기존 정족수(`Mapping.php:287`)·자기승인차단(`:268`)·dedup(`:278`) 동작을 Slot 불변식 하위로 승격, 회귀 0(§70).

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].

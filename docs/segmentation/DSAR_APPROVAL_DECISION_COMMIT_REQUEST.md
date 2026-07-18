# DSAR — Decision Commit Request (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§31 COMMIT_REQUEST** — Validation 완료 후 Commit을 개시하는 요청 봉투. Validation과 Commit을 분리하는 경계 객체.

필수 필드:
`request_id` · command id · instance id · validation result id · validation context hash · requested action type(→ §11 ACTION_TYPE) · actor subject id · slot id · expected decision version · expected assignment version · expected step version · expected cursor version · lock id · fencing token · idempotency key · commit requested_at · status · evidence.

전제(§25·§26): Validation Result가 `VALID`/`VALID_WITH_WARNINGS`여야 하며(STATUS enum), Validation은 **무기한 재사용 금지** — Commit 직전 Critical 재검증(§32)이 선행 조건.

## 2. 기존 구현 대조

- **Commit Request 객체가 부재.** 4개 핸들러 모두 Validation과 Commit이 분리되지 않은 채 단일 UPDATE로 결정이 곧바로 확정된다: `Mapping::approve`(`Mapping.php:288`) · `AdminGrowth::approvalDecide`(`AdminGrowth.php:1330`) · `Alerting::decideAction`(`Alerting.php:594`) · `Catalog::approveQueue`(`Catalog.php:2397`).
- validation result id · validation context hash · expected version 집합 · lock id · fencing token — 이 요청 봉투를 구성할 필드 상당물이 **grep 없음(no hits)**.
- idempotency key 상당물: Paddle 웹훅 UNIQUE(notification_id) 멱등(`Paddle.php:343-368`)이 존재하나 이는 결제 웹훅용이며 결정 Commit Request의 idempotency key가 아니다(VALIDATED_LEGACY — 일반화 대상, 현존 결선 아님).
- `Alerting`은 집행을 별도 호출(`executeAction` `Alerting.php:601-665`)로 분리하나, 이는 Commit Request 개시가 아니라 결정 UPDATE(`Alerting.php:594`) 이후의 부수효과 집행이며 비원자·무Request이다.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §3.1 Approval · §3.5 Sequential — Validation Result(§26)·State Machine(§27)이 선행 부재여서 Commit Request가 참조할 상류가 없다 → **BLOCKED_PREREQUISITE**.
- cover: 0

## 4. 확장/구현 방향 (설계)

- Commit Request는 §26 Validation Result와 §33 Commit 사이의 명시적 경계로 신설. Validation→Commit 원스텝 UPDATE(현행 4핸들러)를 2단계로 분리하는 것이 핵심 — 요청 시점의 validation result id·context hash·expected version 집합을 봉투에 고정해 §32 재검증의 비교 기준으로 삼는다.
- 재사용: Paddle 멱등(`Paddle.php:343-368`)의 UNIQUE 키 패턴을 결정 idempotency key로 일반화(VALIDATED_LEGACY). omni_outbox claim_id `random_bytes`(`Omnichannel.php:392`)는 요청 식별·중복 개시 방지의 선례(KEEP_SEPARATE).
- **Mandatory Control**: Commit Request는 반드시 유효한 Validation Result를 참조해야 하며(Validation 없이 Commit 금지 — §60 Critical Gap), context hash·expected version이 담겨야 §32에서 Drift를 탐지할 수 있다.
- **실위험**: 현행은 Commit Request 경계가 없어 Validation과 Commit 사이 시간창(TOCTOU)이 봉인되지 않는다 — `Mapping::approve`의 read(`Mapping.php:273`)→UPDATE(`Mapping.php:288`) 사이 트랜잭션 부재가 그 구체적 발현.
- 실 구현 = 별도 승인 세션. 본 문서는 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].

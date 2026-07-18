# DSAR — Idempotency (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §48 IDEMPOTENCY 필수 필드
idempotency_id · tenant_id · instance_id · event type · idempotency key · request hash · expected state · expected version · first/last received_at · processing status · transition instance id · result hash · response reference · expiration policy · status · evidence.

★동일 key 다른 request hash = Conflict.

## 2. 기존 구현 대조

- **범용 Idempotency 레지스트리·미들웨어 ABSENT.** idempotency_id·request hash·expected state/version·processing status·result hash·expiration policy 를 갖춘 재사용 멱등 레코드 계층은 없다. 요청 재시도/이벤트 재전달을 가로채는 공통 진입점(미들웨어)이 존재하지 않는다.
- **국소적 UNIQUE 제약 2종만 실존** — 도메인 특화 멱등이며 승인 전이용이 아니다:
  - Paddle webhook: `notification_id` UNIQUE 제약으로 동일 알림 재수신 dedup(`Paddle.php:343-348`).
  - JourneyBuilder 발송: `journey_node_sent` UNIQUE 로 노드 1회 발송 보장(`JourneyBuilder.php:454`, 삽입·해제 `:482`·`:490`, releaseSendOnce `:463`).
- 두 지점 모두 **DB UNIQUE 위반을 곧 dedup 신호로 사용**하는 방식이며, idempotency key ↔ request hash 비교(§48 핵심: 같은 key·다른 payload = Conflict)·expected state/version 결속·result hash 보존·만료 정책 은 없다.
- 승인 3전이(catalog_writeback_job·admin_growth_approval·mapping_change_request)에는 멱등 키 자체가 없다. 재처리 방어는 CAS affected-rows(`Catalog.php:1726-1730`)와 상태체크 409(`AdminGrowth.php:1327`)라는 별개 메커니즘에 의존한다.

## 3. 판정

- Verdict: **PARTIAL** — 도메인 특화 UNIQUE dedup 2종(`Paddle.php:343-348`·`JourneyBuilder.php:454`)만 존재. 범용 멱등 레코드·미들웨어·request hash 충돌판정·result hash·만료정책 **없음**.
- 선행 의존: idempotency 는 §20 Transition Instance·§45 Cursor 에 결속되어야 실효 — 둘 다 ABSENT → **BLOCKED_PREREQUISITE**. instance_id/expected state 결속 대상인 State Machine 자체 부재.
- cover: 부분(Paddle notification_id UNIQUE · journey_node_sent UNIQUE) · 승인 도메인 0

## 4. 확장/구현 방향 (설계)

- 순신규 **idempotency 레지스트리 + 공통 미들웨어**. 모든 전이/이벤트 진입에서 idempotency key + request hash 를 선기록, 동일 key·동일 hash = `ALREADY_APPLIED` 재생(result hash 반환), 동일 key·상이 hash = `CONFLICT`(§56) 로 차단.
- 재사용 기반: `Paddle.php:343-348`(notification_id UNIQUE)·`JourneyBuilder.php:454`(journey_node_sent UNIQUE)를 **UNIQUE-as-idempotency 참조정본**으로 승격 — 단, UNIQUE 위반→dedup 이라는 암묵 관례를 명시 processing status(`RECEIVED/PROCESSING/APPLIED/CONFLICT`)로 정규화한다.
- ★실위험 무후퇴 필수: 범용 멱등 부재는 Scheduler + Event Consumer 중복 진행(§50)·API Retry/Kafka Redelivery 이중처리를 그대로 허용한다. Mandatory Control — 멱등 레코드는 immutable, 만료정책 명시(무기한 금지), key↔hash 불일치는 Fail Closed(§59).

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].

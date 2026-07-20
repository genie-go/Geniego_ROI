# DSAR — Twin Synchronization & Data Pipeline (Part 3-22 §4·§5)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC 요약)
Authorization Digital Twin의 §4 Twin Synchronization + §5 Data Pipeline은 운영 authz 평면(정책/역할/세션/결정)의 상태 변화를 **실시간 동기화된 미러 트윈**으로 반영하는 계약을 정의한다. SPEC이 요구하는 동기화 5모드와 파이프라인 5스테이지는 다음과 같다.

- **Sync 5모드**: Streaming Sync(변경 즉시 전파), Batch Sync(주기적 대량 정합), Snapshot Sync(시점 전량 스냅샷), Event Sync(도메인 이벤트 단위), Incremental Sync(델타 증분).
- **Pipeline 5스테이지**: Event Collector → Event Normalizer → State Builder → Stream Processor → Replay Queue.
- **전송 substrate 후보**: Kafka / Pulsar / RabbitMQ / EventBridge 등 durable 메시지 브로커.

계약 원칙: 트윈은 운영 평면을 **읽기 전용으로 반영**하며 운영 상태를 되돌려 쓰지 않는다(단방향). 모든 이벤트는 순서 보존·재생 가능(append-only 소스)이어야 한다.

## 2. Substrate 매핑 (현행 코드 → SPEC 스테이지)
| SPEC 스테이지 | 현행 substrate | 위치 | 판정 |
|---|---|---|---|
| Event Collector | 감사 이벤트 수집 선례 존재 | `Compliance.php:133-151`(collectAuditEvents) | PARTIAL 선례 |
| Event Normalizer | 감사 이벤트 정규화 선례 | `Compliance.php:133-151`·`:267` | PARTIAL 선례 |
| 이벤트 소스(append-only) | SecurityAudit 해시체인 | `SecurityAudit.php:27`·`:59-67` | PARTIAL 소스 |
| 이벤트 소스(auth) | auth_audit_log 시간순 | `UserAuth.php:4165`·`:4217-4220` | PARTIAL 소스 |
| 메시지 브로커 | **부재** | `composer.json:5-13` | ABSENT |
| State Builder / Stream Processor / Replay Queue | 없음(grep 0) | — | ABSENT-greenfield |
| 전파 메커니즘 | cron/outbox만(브로커 아님) | — | ABSENT-substrate |

`composer.json:5-13` 의존성에 Kafka/Pulsar/RabbitMQ/EventBridge 클라이언트가 **없다** — 실시간 durable 브로커는 미보유이며 현행 전파는 cron 배치·outbox 패턴에 국한된다.

## 3. 설계 계약 (신설 시)
- **단방향 미러 원칙**: 트윈 Sync는 운영 authz 평면을 소스로만 읽는다. State Builder는 SecurityAudit/auth_audit_log append-only 스트림을 소비하며 운영 테이블에 write-back 금지.
- **브로커 신설**: 메시지 브로커는 순신설 대상. 도입 전까지 Streaming/Event Sync는 **BLOCKED_PREREQUISITE**(brokerless). 과도기 Batch/Snapshot/Incremental Sync는 cron+outbox 위에서 near-real-time으로만 승인 가능(≠streaming 계약 충족).
- **Event Collector/Normalizer 재사용**: `Compliance.php:133-151`의 collectAuditEvents 정규화 로직을 canonical event shape 선례로 채택·확장. 신규 정규화 엔진 난립 금지(기존 확장).
- **신규 엔드포인트 배선**: 트윈 동기화 제어/상태 조회 엔드포인트 신설 시 `/api` 접두·라우트 등록 파일에 `$register` 배선 필수.
- **테넌트 격리**: demo/운영은 별개 env로 트윈 스트림도 테넌트별 격리.

## 4. KEEP_SEPARATE (혼동 금지)
- **AdminPlans 미러**(`AdminPlans.php:53`) = **product-config 미러**(플랜 구성 정보 미러링)이며 **runtime state sync 아님**. Twin Synchronization의 authz runtime 상태 동기화와 무관 — 흡수/병합 금지.
- attribution event(`JourneyBuilder.php:330`) = 마케팅 어트리뷰션 도메인 이벤트. authz twin event pipeline과 별개 — KEEP_SEPARATE.

## 5. 판정
**ABSENT-greenfield.** Twin Sync 5모드·Pipeline 5스테이지·메시지 브로커 모두 grep 0(`composer.json:5-13` 브로커 부재·cron/outbox만). 재사용 가능한 선례는 Event Collector/Normalizer 계층(`Compliance.php:133-151`)과 append-only 이벤트 소스(`SecurityAudit.php:27`·`:59-67`·`UserAuth.php:4165`·`:4217-4220`)뿐이며, 이는 소스일 뿐 동기화/파이프라인 엔진이 아니다. AdminPlans 미러(`AdminPlans.php:53`)는 config 미러로 runtime sync가 아님을 재확인. → **순신설(브로커 신설 포함)**. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.

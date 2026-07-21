# MEA Part 009 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 009 SPEC/ADR.

## 전수조사 방법
SecurityAudit/change-log/ChannelSync/kafka/debezium/event-stream/binlog/idempotent/paymentKey/ON-DUPLICATE/rowCount/dead-letter 키워드로 `backend/src` 전수 grep + 판독.

## 실존 substrate (불변 Change Log·멱등·배치 sync·충돌해결)
| MEA 개념 | 실존 substrate | 인용 | 성격·판정 |
|---|---|---|---|
| Immutable Change Log | ★append-only tamper-evident 해시체인 | `SecurityAudit.php:5,29`(security_audit_log·prev_hash→hash_chain) | PARTIAL-strong |
| Idempotent/Exactly Once | ★멱등 처리 | `Payment.php`(paymentKey 멱등)·289차 TOCTOU 원자화(조건부 UPDATE+rowCount)·`Attribution.php`(ON DUPLICATE/ON CONFLICT) | PARTIAL-strong |
| Conflict Resolution | Survivorship(승인/신뢰도/최신/Golden) | Part 005 MDM·`SecurityAudit`(충돌 이력) | PARTIAL |
| Synchronization(배치) | 커넥터 sync(cron) | `ChannelSync.php` | PARTIAL(배치/API) |
| Event Signature | AES-256-GCM 인증암호화 | `Crypto`·`SecurityAudit`(hash_chain) | PARTIAL |
| Consistency Validation(seed) | 무후퇴 동기화·SHA byte-match | 무후퇴 value unification·배포 SHA 검증 | PARTIAL-informal |
| Retry(seed) | 백오프 스로틀 | `UserAuth.recoveryThrottle` | PARTIAL(백오프만) |
| Event Log(seed) | 경량 이벤트 로그 | `PM/Events.php` | PARTIAL-seed |
| Security/Tenant | 격리·RBAC | `Db.php`·`index.php` | 실재(재사용) |

## 부재(ABSENT-aspirational) — 실시간 CDC/이벤트 스트리밍/DLQ (grep 0)
Enterprise CDC Engine(WAL/binlog 캡처) · **Event Streaming/버스**(Kafka/Debezium) · **Real-Time Sync** · CDC Stream/Offset · **Snapshot Manager** · **Dead Letter Queue** · **Recovery Manager**(Checkpoint/Snapshot Recovery) · 형식 Consistency Validation Engine · Retry Manager(형식·Exponential Backoff/Retry Limit) · Synchronization Dashboard · Event 표준(ChangeDetected 등).

## 판정
**PARTIAL / ABSENT-aspirational.** ★불변 Change Log(`SecurityAudit` 해시체인)·멱등/Exactly Once(Payment paymentKey·289차 TOCTOU·UNIQUE)·Conflict Resolution(Part 005 Survivorship)·배치 sync(`ChannelSync`)·Signature(`Crypto`)·Consistency(무후퇴/SHA byte-match)는 실재하나, **실시간 CDC Engine·Event Streaming/버스·Snapshot/Recovery Manager·Dead Letter Queue는 이벤트 스트리밍 인프라 부재로 전무**. 실행은 선행 Part 001~008 + 이벤트 스트리밍 인프라 종속.

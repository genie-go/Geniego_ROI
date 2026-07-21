# MEA Part 009 — Canonical Entities Design & Judgment (§5~§16)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★SecurityAudit/Payment·TOCTOU·UNIQUE/Part 005 Survivorship/ChannelSync 재사용·형식 CDC/이벤트스트리밍 greenfield·Part 001~008 상속.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | CHANGE_EVENT | 변경 감사 로그(action별) | `SecurityAudit.php` | PARTIAL(형식 이벤트 아님) |
| 2 | CHANGE_LOG | ★append-only 해시체인 | `SecurityAudit.php:5,29` | PARTIAL-strong |
| 3 | CDC_STREAM | 부재(WAL/binlog) | — | ABSENT-aspirational |
| 4 | CDC_OFFSET | 부재 | — | ABSENT |
| 5 | SNAPSHOT | 정산/rollup 스냅샷(부분) | (정산 스냅샷) | PARTIAL-informal(형식 Snapshot Manager 아님) |
| 6 | SYNC_JOB | 커넥터 sync(cron) | `ChannelSync.php` | PARTIAL |
| 7 | SYNC_TARGET | 외부 채널/시스템 | `ChannelSync.php` | PARTIAL |
| 8 | CONFLICT_RECORD | Survivorship·충돌 이력 | Part 005·`SecurityAudit` | PARTIAL |
| 9 | RECOVERY_JOB | 배포 롤백(.bak)·부분 | (배포 롤백) | PARTIAL-informal |
| 10 | RETRY_POLICY | 백오프 스로틀 | `recoveryThrottle` | PARTIAL(백오프만) |
| 11 | SYNC_STATUS | 커넥터 sync 상태 | `ChannelSync.php` | PARTIAL |
| 12 | DATA_CHECKPOINT | 부재(Checkpoint Recovery) | — | ABSENT |
| 13 | CONSISTENCY_REPORT | 무후퇴·SHA byte-match | 무후퇴 value unification | PARTIAL-informal |
| 14 | CDC_AUDIT | 해시체인 감사 | `SecurityAudit.php` | PARTIAL-strong |
| 15 | SYNC_METRIC | 부재(형식) | — | ABSENT |

## §6~§16 표준 판정
- **§6 CDC 대상(10)**: Database(`Db.php`)·Master Data(Part 005)·External(`ChannelSync`). Data Lake/Feature Store/Event Store=Part 002 미래.
- **§7 Change Event(8)**: 변경 감사=`SecurityAudit`·Merge=Part 005 dedup·형식 Change Event 스트림=ABSENT.
- **§8 Sync(6)**: Scheduled/Micro Batch/API=`ChannelSync`·Real-Time Streaming/Message Queue=ABSENT.
- **§9 Conflict Resolution**: ★Part 005 Survivorship 정합·충돌 이력=`SecurityAudit`·형식 Engine=ABSENT.
- **§10 Consistency**: 무후퇴·SHA byte-match·UNIQUE(PK/dedup)·형식 Validation Engine=ABSENT.
- **§11 Retry & Recovery**: 백오프=`recoveryThrottle`·롤백=.bak. DLQ/Checkpoint Recovery=ABSENT.
- **§12 Security**: ★Signature=`Crypto`(AES-256-GCM)·`SecurityAudit`(hash_chain)·Change Auth=`index.php` RBAC/writeGuard·Part 001~008 상속.
- **§16 AI**: 불일치/이상 탐지=`AnomalyDetection`·CDC Event 생성 불가=헌법 V3. 병목/장애 예측=순신설. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§2·§14=Change Log/CDC Audit=SecurityAudit·멱등=Payment/TOCTOU/UNIQUE·§12 Signature) / PARTIAL(§1·§5~11·§13) / ABSENT-aspirational(§3·§4·§12 checkpoint·§15=CDC Stream/Offset/Checkpoint/Sync Metric·Event Streaming/DLQ).** 코드 0. ★SecurityAudit/멱등/Survivorship/ChannelSync/Crypto 재사용(중복 감사/멱등/survivorship/sync 절대 금지)·형식 CDC Engine/Event Streaming/DLQ 신설(이벤트 버스 전제)·Part 001~008 상속·AI CDC Event 생성 불가(V3).

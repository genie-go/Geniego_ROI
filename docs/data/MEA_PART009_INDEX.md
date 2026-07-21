# MEA Part 009 — Index (Enterprise CDC & Data Synchronization Architecture)

> **거버넌스 상태**: 설계 명세 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).

Master Enterprise Architecture Part 009 (CDC & Data Synchronization) 산출 문서 색인. ★MEA Part 001~008 상속·확장(재정의 금지).

## 문서 구성
| 문서 | 역할 |
|---|---|
| `docs/spec/MEA_PART009_CDC_DATA_SYNCHRONIZATION_ARCHITECTURE_SPEC.md` | canonical SPEC v1.0(§1~§18) |
| `docs/architecture/ADR_MEA_CDC_DATA_SYNCHRONIZATION_ARCHITECTURE.md` | 설계 결정(D-1~D-5·Part 001~008 상속·SecurityAudit/멱등/Survivorship 승격) |
| `docs/data/MEA_PART009_EXISTING_IMPLEMENTATION.md` | GT① 실존 substrate 전수조사 |
| `docs/data/MEA_PART009_DUPLICATE_AUDIT.md` | GT② SecurityAudit/Survivorship/멱등·Part 005/007 중복 경계 |
| `docs/data/MEA_PART009_CANONICAL_ENTITIES.md` | §5 15 엔티티 + §6~16 CDC/Sync/Conflict/Retry 판정 |
| `docs/data/MEA_PART009_GOVERNANCE_MECHANISMS.md` | §11~18 Retry/Security/Runtime/API/Event/AI |
| `docs/data/MEA_PART009_INDEX.md` | 본 색인 |

## 판정 요약
- **★PARTIAL substrate(불변 Change Log·멱등·충돌해결·배치 sync 실재):** ★Immutable Change Log=`SecurityAudit.php:5,29`(append-only tamper-evident 해시체인·security_audit_log·prev_hash→hash_chain) · **Idempotent/Exactly Once**=`Payment.php`(Toss paymentKey 멱등)+289차 TOCTOU 원자화(조건부 UPDATE+rowCount)+UNIQUE(`Attribution` ON DUPLICATE/ON CONFLICT) · Conflict Resolution=Part 005 MDM Survivorship(승인>신뢰도>최신>Golden Record)·충돌 이력=`SecurityAudit` · Synchronization(배치)=`ChannelSync`(cron 커넥터) · Event Signature=`Crypto`(AES-256-GCM)·`SecurityAudit`(hash_chain) · Consistency=무후퇴 value unification·SHA byte-match 배포검증 · Retry seed=`recoveryThrottle`(백오프) · Event Log seed=`PM/Events.php`.
- **ABSENT-aspirational(이벤트 스트리밍 인프라 부재):** Enterprise CDC Engine(WAL/binlog) · **Event Streaming/버스**(Kafka/Debezium) · **Real-Time Sync** · CDC Stream/Offset · **Snapshot Manager** · **Dead Letter Queue** · **Recovery Manager**(Checkpoint/Snapshot Recovery) · Consistency Validation Engine · Retry Manager(형식) · Sync Dashboard · Event 표준(ChangeDetected 등).
- **★핵심:** 불변 Change Log(SecurityAudit 해시체인)·멱등 처리(Payment/**289차 TOCTOU**/UNIQUE)·충돌 해결(Part 005 Survivorship)·배치 sync(ChannelSync)는 실 seed — 실시간 CDC/이벤트 스트리밍/DLQ는 단일 호스트 이벤트 버스 부재로 미래. 형식 CDC/스트리밍 엔진만 신설. ★중복 감사 체인/멱등/survivorship/sync 로직 신설 절대 금지.
- **★재사용(중복 신설 절대 금지):** `SecurityAudit`(Change Log)·Payment/TOCTOU/UNIQUE(멱등)·Part 005 Survivorship(Conflict)·`ChannelSync`(Sync)·`Crypto`(Signature)·무후퇴(Consistency). Part 005 MDM·Part 007 Change·헌법 재정의 금지. AI=CDC Event 생성 불가(V3)·마케팅 AI KEEP_SEPARATE.
- **★교훈:** [[project_n289_post_blob_cap_hardening]](289차 TOCTOU 원자화=멱등/Exactly Once seed) · Part 005 Survivorship(=Conflict Resolution 정본) · [[feedback_no_regression_value_unification]](무후퇴=Consistency 원칙) · [[reference_menu_audit_log_not_tamper_evident]](Change Log 정본=SecurityAudit::verify·menu_audit_log는 tamper-evident 아님) · [[reference_platform_growth_actas_tenant_hijack]](Cross-Tenant CDC Leakage).
- **코드 변경 0 · NOT_CERTIFIED**(선행 Part 001~008 + 이벤트 스트리밍 인프라).

## 다음
MEA Part 010 — Enterprise ETL/ELT Processing Architecture(본 CDC 상속·확장·중복 정의 금지).

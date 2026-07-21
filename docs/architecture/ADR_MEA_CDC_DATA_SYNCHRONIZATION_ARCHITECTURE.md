# ADR — MEA Part 009 Enterprise CDC & Data Synchronization Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part009 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 009는 CDC & Data Synchronization. GeniegoROI는 단일 호스트 PHP/MySQL+SQLite로 실시간 CDC(WAL/binlog 캡처)·이벤트 스트리밍(Kafka/Debezium)·이벤트 버스·DLQ 인프라가 부재하다. 그러나 seed는 실재 — `SecurityAudit`(불변 hash-chain Change Log)·`ChannelSync`(배치 sync)·Part 005 MDM Survivorship(Conflict Resolution)·★멱등/Exactly Once(Payment paymentKey·289차 TOCTOU 원자화·UNIQUE). 본 Part는 Part 001~008 상속(재정의 금지).

## 결정
- **D-1 (Part 001~008·헌법 상속·재정의 금지):** Conflict/Golden Record/Survivorship(Part 005)·Change/Provenance(Part 007)·Data Integration(Part 001)를 준수·인용. Sync 대상(§6)=Part 001~008 자산. 중복 정의 금지.
- **D-2 (Immutable Change Log = SecurityAudit 승격):** Immutable Change Log = `SecurityAudit.php:5,29`(append-only tamper-evident 해시체인·security_audit_log·prev_hash→hash_chain). 형식 Change Log Manager는 이를 재사용(중복 감사 체인 신설 절대 금지·SecurityAudit 주석 "중복 아님" 정합).
- **D-3 (Idempotent/Exactly Once = 289차 TOCTOU·Payment 멱등 승격):** Exactly Once/Idempotent Processing = `Payment.php`(Toss paymentKey 멱등·재confirm 거부)+289차 TOCTOU 원자화(조건부 UPDATE+rowCount·[[project_n289_post_blob_cap_hardening]])+UNIQUE(`Attribution` ON DUPLICATE/ON CONFLICT·coupon_redemptions). 형식 CDC 멱등 처리는 이 패턴 위에(중복 멱등 로직 재구현 금지).
- **D-4 (Conflict Resolution = Part 005 Survivorship 재사용):** Source Priority/Latest/Golden Record/Merge=Part 005 MDM Survivorship(승인>신뢰도>최신>품질>admin)·충돌 이력=`SecurityAudit`. 형식 Conflict Resolution Engine=순신설(중복 survivorship 로직 금지).
- **D-5 (CDC/Event Streaming/DLQ = ABSENT-aspirational·조기구현 금지):** 실시간 CDC(WAL/binlog)·Event Streaming/버스·Dead Letter Queue·Snapshot/Recovery Manager는 이벤트 버스/스트리밍 인프라 전제라 부재(`PM/Events.php`=경량 이벤트 로그 seed). 인프라 없이 조기구현 금지(블라인드 스켈레톤 방지). Sync=`ChannelSync` 배치·Signature=`Crypto`(AES-256-GCM)·Consistency=무후퇴 value unification+SHA byte-match. AI(불일치/장애 예측)=`AnomalyDetection`·CDC Event 생성 불가=헌법 V3. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE. Tenant=`Db.php`([[reference_platform_growth_actas_tenant_hijack]]).

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 001~008/헌법 상속·재정의 금지·SecurityAudit(Change Log)·Payment/TOCTOU/UNIQUE(멱등)·Part 005 Survivorship(Conflict)·ChannelSync(Sync)·Crypto(Signature) 재사용·형식 CDC Engine/Event Streaming/DLQ/Recovery만 신설(이벤트 버스 전제·조기구현 금지). 실행은 선행 Part 001~008 + 이벤트 스트리밍 인프라 종속.

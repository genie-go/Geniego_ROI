# DSAR — Cryptographic Integrity: Index & Performance (§69/§71)

> EPIC **06-A-03-02-03-02** · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> GROUND_TRUTH=[[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]]. 인용은 GROUND_TRUTH 등재 file:line만.
> 규율: 무결성 검증 이유로 Transaction Consistency 희생 금지 · Critical Commit Path 최소화.

## 1. 원문 전사 (Canonical Contract)

### §69 Index (원문 전사)

Algorithm Code/Status · Integrity/Canonicalization/Field Set Version · Ledger Entry Digest · Sequence · Previous Entry Digest · Head Digest · Checkpoint Range · Verification Job/Run/Result · Failed Verification · Tamper Incident · Affected Decision/Sequence · Rotation Plan · Dual-Digest Entry · Legacy Hash · Migration Batch · Reconciliation Mismatch.

### §71 Performance (원문 전사)

Streaming Digest · 대형 Attachment/Evidence는 Manifest/Reference Digest · Full vs Incremental 분리 · Checkpoint 기반 Range · Batch · Worker Partitioning · Backpressure · Critical Commit Path 최소화 · 중복 Projection 방지 · Provider Benchmark · Output Storage Size · SLA · Incident Priority Scheduling. 무결성 검증 이유로 Transaction Consistency 희생 금지.

의미: 무결성 검증은 대량 Entry·Chain·Checkpoint를 다루므로 인덱스 설계와 성능전략(Full vs Incremental·Streaming·Checkpoint Range)이 필수다. Commit-time 경로는 최소 오버헤드로 유지하고 대량 검증은 배치/워커로 분리한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

| §69/§71 항목 | 현행 대응 | 근거(GROUND_TRUTH) |
|---|---|---|
| Ledger Entry Digest / Sequence Index | **부분(약함)** | verify가 `ORDER BY id DESC`·행별 순회(`SecurityAudit.php:39-40,56-68`) — Sequence 인덱스 명시 부재·전체 순회 |
| Previous Entry Digest Index | **부재** | prev_hash 컬럼 존재(`SecurityAudit.php:51`)나 인덱스 전략 미명시 |
| Head Digest / Checkpoint Range Index | **부재** | Head/Checkpoint 개념 부재 |
| Algorithm/Version/Field Set Version Index | **부재** | 해당 컬럼/구조 부재 |
| Verification Job/Run/Result / Failed Verification Index | **부재** | Verification 저장소 부재 |
| Tamper Incident / Affected Decision·Sequence Index | **부재** | Tamper Incident SoT 부재 |
| Rotation Plan/Dual-Digest/Legacy/Migration/Reconciliation Index | **부재** | 해당 구조 부재 |
| Streaming Digest | **부분** | 파일 CAS는 바이트 검증(`MediaHost.php:88-90`)·원자쓰기(`:100-102`) — streaming 유사 substrate |
| 대형 Attachment는 Manifest/Reference Digest | **부분(substrate)** | `MediaHost` 내용주소 digest(`:93`)를 §33 Attachment Manifest 참조로 재사용 가능 |
| Full vs Incremental / Checkpoint Range | **부재** | verify는 항상 Full 순회(Incremental/Checkpoint 없음) |
| Batch / Worker Partitioning / Backpressure | **부분(substrate)** | Outbox 워커·SKIP LOCKED(`Omnichannel.php:405,429-441`)·cron(`media_gc_cron.php:35,43`) — 원장 verification job 워커는 아님 |
| Critical Commit Path 최소화 | **부재(정책)** | Commit-time verification 자체 부재라 경로 오버헤드 관리 미적용 |
| Transaction Consistency | **PRESENT(substrate)** | 트랜잭션 PDO(`Omnichannel.php:404-415`·`Migrate.php:54-60`) 재사용 |

## 3. 판정

- **Verdict: 인덱스·성능 전략 대부분 신규.** 실 verify(`SecurityAudit.php:56-68`)는 **전체 행 순회 + id DESC**로, Sequence/Previous Digest 인덱스·Incremental·Checkpoint Range가 없어 대량 원장에서 O(n) 비용. Head/Checkpoint 부재로 Range 검증 최적화 불가.
- **재사용 substrate**: 트랜잭션 PDO(`Omnichannel.php:404-415`)·SKIP LOCKED 워커(`:405,429-441`)·파일 바이트검증/원자쓰기(`MediaHost.php:88-90,100-102`)는 Streaming/Batch/Worker Partitioning의 조립 재료로 실재.
- cover: **부분** — 트랜잭션·워커·파일 CAS substrate. Digest/Verification 전용 인덱스·Full/Incremental 분리·Checkpoint Range·Commit Path 최소화 전략은 0.
- 선행: 대상 Ledger Entry/Checkpoint/Verification 저장소 부재 → 인덱스 대상 테이블 없음(BLOCKED_PREREQUISITE).

## 4. 확장·구현 방향 (설계)

- **인덱스 카탈로그(신규)**: Ledger Entry Digest·(tenant, ledger, partition, sequence) 복합·Previous Entry Digest·Head Digest·Checkpoint (first/last sequence) Range·Algorithm Code/Status·Integrity/Canonicalization/Field Set Version·Verification Run/Result·Failed Verification 부분인덱스·Tamper Incident (severity, status)·Affected Decision/Sequence·Rotation Plan·Dual-Digest Entry·Legacy Hash·Migration Batch·Reconciliation Mismatch. 전부 tenant-first 복합키(Cross-Tenant 조회 방지·§5.13).
- **Full vs Incremental 분리**: Periodic Incremental(since Last Verified sequence)·Full Partition·Full Ledger·Checkpoint Range·Random Sampling(§53). Incremental 워터마크로 재검증 범위 최소화 — 실 verify의 전체순회를 Checkpoint 기반 Range로 대체.
- **Streaming Digest**: 대형 payload/evidence는 스트리밍 해시. 대형 Attachment는 원문 미포함 — `MediaHost` 내용주소 digest(`:93`)를 Manifest Reference로만(§33).
- **Critical Commit Path 최소화**: Commit-time verification(§51)은 Payload/Context/Entry/Previous/Head 검증만 인라인, 전체 Chain·Checkpoint는 배치/워커(SKIP LOCKED 패턴 `Omnichannel.php:405,429-441` 재사용)로 오프로드. **무결성 검증 이유로 트랜잭션 일관성 희생 금지** — verify 실패는 rollback이되 대량 재검증은 비동기.
- **Backpressure/SLA/Priority**: Incident 우선순위 스케줄링·Provider Benchmark·Output Storage Size 관리·중복 Projection 방지(Canonical Projection 캐시 연계→[[DSAR_APPROVAL_CRYPTO_INTEGRITY_CACHE_POLICY]]).
- **무후퇴 보장**: 실 verify 배선(`AdminGrowth.php:1429`) 동작·응답 불변, 인덱스 추가는 성능개선(회귀 없음).
- **실 구현은 선행 Ledger 신설 후 별도 승인세션.**

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_CACHE_POLICY]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_API_CONTRACT]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

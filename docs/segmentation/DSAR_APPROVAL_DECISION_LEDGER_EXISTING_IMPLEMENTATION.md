# DSAR — Decision Integrity Core & Immutable Ledger: 기존 구현 전수조사 (ⓑ)

> EPIC 06-A-03-02-03-01 · 289차 13회차 · **능력 기반 재실증**(이름·주석 아닌 코드 정독) · 읽기 전용 · 코드 변경 0.
> 방식: grep 전수 + 지목 파일 직접 정독(2 에이전트 병렬). 규율: "해시체인 존재 ≠ tamper-evident".

## 0. 결론 (Verdict up front)

**범용 Immutable Decision Ledger 부재.** 승인 결정=in-place UPDATE(과거 소실)라 Ledger가 기록할 불변 대상이 없다. 그러나 **원장 구현 재료(Platform primitive)는 실재 substrate** — 트랜잭션·SHA-256 해시·SKIP LOCKED·Outbox·서버UTC. 두 축 분리: **① 기록 대상(Decision Core) ABSENT → 공회전 · ② 구현 재료(Platform) PRESENT → 조립 가능**.

## 1. 선행 4군 재검증 (§3)

| 군 | 판정 | 근거 |
|---|---|---|
| §3.1 Decision Core | **ABSENT** | `approval_decision` 0. 유일 승인=Mapping approvals_json 배열 append+status in-place UPDATE(`Mapping.php:285-289,327`·테이블 `Db.php:623,655`)·불변 Record/Command/Commit 로우 없음 |
| §3.2 Decision Actions | **ABSENT** | `action_definition/return_target` 0·`change_request`는 mapping_change_request 테이블명만 |
| §3.3 Approval Runtime | **ABSENT** | `approval_request/work_item/authority_resolution/delegation_resolution/sequential_instance` 0 |
| **§3.4 Platform** | **PRESENT(재사용 substrate)** | §4 상세 |

## 2. 불변성/원장 개념별 판정

| 개념 | 판정 | 증거 |
|---|---|---|
| Immutable Decision Ledger·Entry | **ABSENT** | decision_ledger 테이블 0·결정=in-place UPDATE |
| Ledger Sequence(단조) | **ABSENT** | id AUTOINCREMENT만·논리 seq/gap검출 없음 |
| Ledger Head(CAS) | **ABSENT** | `SecurityAudit.php:35-41` lastHash=`ORDER BY id DESC`·CAS 없음·동시 INSERT 체인분기 가능 |
| Ledger Partition·Checkpoint | **ABSENT** | no hits |
| Ledger Link(prev) | **PRESENT** | `SecurityAudit.php:27,39,64` prev_hash 체인 |
| Append-only Write Contract | **PARTIAL** | SecurityAudit/pm_audit_log 관례적·DB강제 없음 |
| Update/Delete Prevention | **ABSENT(DB)/PARTIAL(app)** | 트리거/제약 0·audit_log·outbox엔 UPDATE/DELETE 실존(`Omnichannel.php:158,397,560`) |
| Domain/Repo/DB Immutability Guard | **ABSENT** | 강제계층 없음(관례만) |
| Correction/Amendment/Supersession/Reversal/Void/Redaction | **ABSENT** | 새 Entry 대신 덮어쓰기 |
| Retention Binding | **PARTIAL** | ★`media_gc_cron.php:35,43` append-only 로그 90일 물리 DELETE(불변성 상충)·`DataPlatform.php:300` verified:false |
| Legal Hold Binding | **ABSENT** | `legal_hold` 0 |
| Transaction Boundary(원장) | **ABSENT** | SecurityAudit best-effort 비트랜잭션(`:32`) |
| Idempotency(원장) | **ABSENT** | idempotency-key 인프라 0(`idempotent`=migration skip만) |
| Lock/Lease/Fencing | **PARTIAL** | omni_outbox claim_id/claimed_at+SKIP LOCKED(작업큐·원장 아님) |
| Optimistic Version | **ABSENT** | version/CAS 0 |
| Gap/Duplicate Detection | **ABSENT** | verify는 연속체인만·gap 무탐지 |
| Ordering/Completeness/Consistency Validation | **PARTIAL** | `SecurityAudit::verify()` 순서·체인 검증(gap 무탐지) |
| Reconstruction/Replay | **PARTIAL** | verify 해시 재계산=replay 1종·Simulation/Reconciliation ABSENT |

## 3. ★유일 실 무결성 자산 vs 장식

- **`SecurityAudit.php`(security_audit_log `:48-52`) = 유일 실 append-only 해시체인 + verify.** INSERT/SELECT만(UPDATE/DELETE 코드 0·`:8`)·`hash=sha256(prev|tenant|actor|action|details|created_at)`(`:27`)·GENESIS(`:39`)·prev_hash 체인·**verify(`:56-68`)가 hash_equals+prev_hash 이중검증**·배선(`UserAuth.php:4046`·`Compliance.php:162`). §61=**CANONICAL 패턴(KEEP_SEPARATE·확장/재사용)** — 단 감사 트레일이지 decision ledger 아님·논리 seq/Head-CAS/tx경계 미달.
- ★**장식(원장으로 오인 금지)**: `menu_audit_log.hash_chain`(`AdminMenu.php:123-143,200-218`)=**verify() 0**(tamper-evident 아님·289차 정정 재확인) · `schema_migrations.checksum`(`Migrate.php:50,63-64`)=저장만·비교 미실행 · `journey_decision_log`(`JourneyBuilder.php:60,74`)=UPDATE rewarded in-place(`:1192`)·append-only 아님.
- `audit_log`(`Db.php:434-440,540-546`)·`pm_audit_log`(`PM/Shared.php:129-148`)=append-only 관례·해시체인/verify 없음·DB 미강제. §61=**CONSOLIDATION_REQUIRED**.

## 4. ★§3.4 Platform Foundation — 재사용 substrate 실재

| Primitive | 판정 | 증거 |
|---|---|---|
| Transaction Manager | **PRESENT** | PDO beginTransaction/commit/rollBack 13핸들러(`Omnichannel.php:404-415`·`Migrate.php:54-60`) |
| Outbox Pattern | **PRESENT** | omni_outbox claimBatch/claimConditional(`Omnichannel.php:390-448`·15분 리스 `:395`) |
| Inbox Deduplication | **PRESENT** | paddle_events UNIQUE(`Paddle.php:108,146,343-368`) |
| Migration Framework | **PRESENT(이중)** | `Migrate.php` schema_migrations(`:38,50`)+트랜잭션·자가치유 `Db::migrate` CREATE IF NOT EXISTS |
| Audit Framework | **PARTIAL** | Db::audit(`:434-440`)+SecurityAudit(`:27,29,56`)·hash_chain 무결성보증 신뢰불가 |
| Evidence Store/Object Storage | **PRESENT** | MediaHost 내용주소 sha256(`:93-96`)·원자쓰기(`:100-102`)·바이트검증(`:88-90`) |
| Data Retention/Legal Hold | **ABSENT** | legal_hold 0·DataPlatform verified:false·★media_gc_cron 물리삭제 상충 |
| Distributed Lock | **PARTIAL** | named lock(GET_LOCK) 0·행수준 FOR UPDATE SKIP LOCKED(`Omnichannel.php:405,429-441`) |
| Trusted Server Time | **PRESENT** | gmdate 편재(`Db.php:438`·`SecurityAudit.php:24`·`Mapping.php:285,315`) |

## 5. ★실 위험 (별도 수정세션 후보 — 이번엔 설계만)
1. **`media_gc_cron.php:35,43`이 append-only 감사로그를 90일 후 물리 DELETE** — 불변성 상충·Legal Hold 예외 없음(감사 무결성 파괴 창).
2. **승인 결정 in-place UPDATE**(`Mapping.php:288`) — 과거 결정 소실·불변 원장 부재.
3. **DB 레벨 불변강제(Trigger/RLS/Permission) 전무** — Application Role UPDATE/DELETE 가능.
4. **`menu_audit_log`·`schema_migrations.checksum` 장식** — verify/비교 없이 무결성 착시.
5. **SecurityAudit Head-CAS/트랜잭션경계 부재** — 동시 INSERT 체인분기 이론창.

## 6. 06-A-03-02-03-01 착수 판정
- **실·재사용(확장·재생성 금지)**: **SecurityAudit append-only+verify 패턴(CANONICAL·확장)** · SHA-256 3개소(MediaHost/Migrate/SecurityAudit) · 트랜잭션 경계 · Outbox(omni_outbox) · Inbox dedup(paddle) · SKIP LOCKED 행클레임 · 서버UTC · MediaHost CAS Evidence Store.
- **진짜 부재(순신규)**: Immutable Decision Ledger/Entry/Sequence/Head-CAS/Partition/Checkpoint·Correction/Supersession/Reversal/Void/Redaction·Retention/Legal Hold Binding·Ledger Idempotency·Optimistic Version·Gap/Duplicate Detection·범용 named advisory lock·진정한 tamper-evident 무결성.
- **선행 §3.1~3.3(Decision Core/Actions/Runtime) 전부 ABSENT** → Ledger가 기록할 불변 Decision Record 대상이 없어 **공회전** → 구현 BLOCKED_PREREQUISITE. ★단 Platform primitive는 실재하므로 실 엔진은 "발명이 아니라 조립"(Decision Core 신설 → 기존 primitive 위 Ledger 적재). 선행 신설 후 별도 승인세션(RP-002).

정본 결정=[[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]]. per-entity 판정=§68 DSAR 세트(ⓒ).

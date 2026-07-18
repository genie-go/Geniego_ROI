# DSAR — Ledger Runtime Guards (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§58 `LEDGER_RUNTIME_GUARDS` — 실행 시점 차단(원문 §58 "차단 목록"). Append/Head/Correction/Retention 경로에서 §56 Critical Gap을 요청 처리 중 강제. 필수 가드(§20/§23/§27/§36~§44 파생 전사):

1. **Tenant Context Guard** — Ledger/Partition/Entry가 요청 테넌트 소유인지(Cross-Tenant Link 차단, §23).
2. **Append-only Write Guard(§24)** — 원장 대상에 Insert만 허용·Update/Delete/Upsert/Truncate/Resequence 런타임 차단.
3. **Mandatory Reference Guard(§18)** — Entry Type별 필수 Reference 미충족 시 Append 차단.
4. **Idempotency Guard(§40)** — 동일 key+request=기존 Entry/Sequence 반환·다른 request=Conflict + Append 차단 + Critical Audit.
5. **Expected Head Version / Optimistic Lock Guard(§20/§44)** — Head 버전 불일치 시 덮어쓰기 금지→재조회·재검증.
6. **Ledger Lock / Fencing Guard(§41/§43)** — 동시 Append 직렬화·낮은 Fencing Token Commit 차단.
7. **Sequence Allocation Guard(§19)** — 트랜잭션 내 단조증가·Unique·Client 지정 차단·Gap 재번호화 금지.
8. **Transaction Boundary Guard(§38)** — Decision Commit↔Ledger Append 원자성(하나 실패=전체 Rollback).
9. **Retention / Legal Hold Guard(§36/§37)** — 물리삭제 차단·Hold 중 Payload/Redaction/Purge 차단.
10. **Correction/Supersession Guard(§29/§32)** — 원본 수정 대신 새 Entry 강제·Circular/Cross-Tenant Link 차단.
11. **Snapshot/Audit Guard(§52/§54)** — Append 전 스냅샷·감사이벤트·해시체인 강제.

## 2. 기존 구현 대조 (미구현 · 일부 부분 실재)

- **범용 런타임 가드 계층 부재 → 미구현(ABSENT).** 단 개별 가드 원형이 산발적으로 부분 실재:

| 가드 | 상태 | 근거(허용목록) |
|---|---|---|
| Tenant Context Guard | **부분 PRESENT** | `index.php:404-420` X-Tenant 주입·Bearer/RBAC. **원장 전용 일관 적용은 아님** |
| Append-only Write Guard | **부분(관례만)** | `SecurityAudit.php:8` UPDATE/DELETE 코드 0(관례적 append-only)·DB 강제 없음·audit_log/outbox엔 UPDATE/DELETE 실존(`Omnichannel.php:158,397,560`) |
| Mandatory Reference Guard | **ABSENT** | Reference Matrix(§18) 부재 |
| Idempotency Guard | **ABSENT** | 원장 idempotency key 0 |
| Expected Head Version / Lock | **ABSENT** | Ledger Head·CAS·낙관적 버전 부재(`SecurityAudit.php:35-41` lastHash ORDER BY id DESC·CAS 없음) |
| Ledger Lock / Fencing | **부분(작업큐)** | `omni_outbox` claim_id/claimed_at + SKIP LOCKED(`Omnichannel.php:405,429-441`)·15분 리스(`:395`)·행수준 FOR UPDATE(원장 아님·named lock GET_LOCK 0) |
| Sequence Allocation Guard | **ABSENT** | id AUTOINCREMENT만·논리 seq/gap검출 없음 |
| Transaction Boundary Guard | **부분(재사용 substrate)** | PDO beginTransaction/commit/rollBack(`Omnichannel.php:404-415`·`Migrate.php:54-60`)은 실재하나 원장 Append 경계에 미결합(`SecurityAudit.php:32` best-effort 비트랜잭션) |
| **Retention / Legal Hold Guard** | **미방지(BLOCKED_GAP)** | `media_gc_cron.php:35,43` append-only 로그 90일 물리 DELETE·`legal_hold` 0(Hold 부재) |
| Correction/Supersession Guard | **ABSENT** | 정정=in-place UPDATE(`Mapping.php:288`) |
| Snapshot/Audit Guard | **부분** | `SecurityAudit::verify():56-68` 해시체인 실재하나 Append 커밋과 미결합 |

- **핵심 결함**: 원장 대상 물리삭제(`media_gc_cron.php:35,43`)를 막는 런타임 가드 부재 + Application Role UPDATE/DELETE를 막는 DB 권한/트리거 부재 → 불변성이 코드 관례에만 의존.

## 3. 판정

- Verdict: **ABSENT** (범용 런타임 가드 미구현)
  - 부분 실재: **Tenant 격리 부분**(`index.php:404-420`)·**Transaction/SKIP LOCKED substrate 재사용 가능**(`Omnichannel.php:404-415,405,429-441`)·**Append-only 관례**(`SecurityAudit.php:8`).
- 선행 의존: §15 Ledger·§17 Entry·§20 Head·§40 Idempotency·§41 Lock·§36 Retention·§37 Legal Hold 부재 → 대부분 가드 **BLOCKED_PREREQUISITE**.
- cover: Tenant Guard·Transaction/SKIP LOCKED substrate·SecurityAudit append-only 관례 외 **0**.

## 4. 확장/구현 방향 (설계)

- Golden Rule(Extend): 실재 부분 가드·substrate를 원장 전용으로 승격·일반화(발명이 아니라 조립).
  - **Tenant Context Guard**: `index.php:404-420` 패턴을 전 Ledger/Entry/Link 조회·Append에 강제 적용(Cross-Tenant Link 차단).
  - **Transaction Boundary Guard**: 실재 PDO 트랜잭션(`Omnichannel.php:404-415`)을 Decision Commit↔Ledger Append 단일 경계로 결합(§38).
  - **Lock / Fencing Guard**: `omni_outbox` SKIP LOCKED 행클레임(`Omnichannel.php:405,429-441`)을 Ledger Append Lock으로 재사용 + named advisory lock(GET_LOCK, 현재 0) 신설.
  - **Snapshot/Audit Guard**: `SecurityAudit::verify` 해시체인을 Append 스냅샷(§52)과 결합.
- **★Retention/Legal Hold Guard(최우선 실 위험)**: `media_gc_cron.php:35,43` 물리삭제를 런타임 가드로 차단하고 §36 논리 Retention(payload-only)으로 대체·§37 Legal Hold Binding 신설(Hold 중 삭제 차단). DB Immutability Guard(§27)로 Application Role UPDATE/DELETE 권한 회수.
- 순신규: Mandatory Reference·Idempotency·Expected Head Version·Sequence Allocation·Correction/Supersession 가드는 선행 엔티티 신설 후 구현(BLOCKED_PREREQUISITE).
- 무후퇴: 기존 Tenant Guard·Transaction·SKIP LOCKED·SecurityAudit는 후퇴 없이 흡수(§68). ★media_gc 물리삭제 차단은 불변성 개선(무후퇴 예외).

관련: [[DSAR_APPROVAL_DECISION_LEDGER_STATIC_LINT]] · [[DSAR_APPROVAL_DECISION_LEDGER_CRITICAL_GAP_POLICY]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

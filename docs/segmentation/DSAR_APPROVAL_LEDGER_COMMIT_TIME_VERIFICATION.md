# DSAR — Ledger Commit-time Verification (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§51 Commit-time Verification (원문 전사):
- `Canonical Projection` 재생성
- `Payload Digest` · `Context Digest` 재계산
- `Previous Digest` 조회
- `Entry Digest` 재계산
- `Stored Entry` 재조회
- `Stored vs 생성 Digest` 비교
- `Head 갱신 검증` · `Head가 현재 Entry 지시` 확인
- `Outbox Binding Digest` 검증
- **실패 시 전체 Transaction Rollback**

의미: Commit-time Verification은 원장에 Entry를 Append하는 **바로 그 트랜잭션 내부**에서, 방금 생성·저장한 Entry를 즉시 재검증하는 최종 게이트다. Canonical Projection을 재생성하고 Payload/Context/Previous/Entry Digest를 재계산한 뒤 **Stored Entry를 다시 읽어(round-trip)** 저장된 Digest와 재계산 Digest가 일치하는지, Head가 새 Entry를 정확히 지시하도록 갱신되었는지, Outbox 이벤트가 동일 Payload Digest에 바인딩되었는지를 검증한다. **어느 하나라도 불일치하면 전체 Transaction을 Rollback**하여, 무결성 위반 Entry가 애초에 커밋되지 못하게 한다(§5.11 실패 무시 금지·§46 Chain Break→Append 차단의 커밋 경로 강제).

## 2. 기존 구현 대조

- **Commit-time 재검증 게이트는 부재** — Append 트랜잭션 내부에서 방금 쓴 Entry를 재조회·재계산·비교하고 불일치 시 Rollback하는 구조 전무.
- 개념별 능력 판정(GROUND_TRUTH):
  - `Payload/Context/Entry Digest 재계산` → **PARTIAL(재계산 능력만)**: `SecurityAudit::verify`(`SecurityAudit.php:56-68`)가 행별 preimage 재계산 후 `hash_equals`+`prev_hash===$prev` 이중검증(핵심 `SecurityAudit.php:63-64`)을 수행하는 유일 실 검증기다. 그러나 이는 **사후(post-hoc) 배치 검증**이지 Append 트랜잭션 내부의 커밋시점 검증이 아니다.
  - `Stored vs 생성 Digest 비교` → **ABSENT(커밋경로)**: write(`SecurityAudit.php:27`)는 preimage를 계산해 INSERT할 뿐, **같은 트랜잭션에서 Stored Entry를 재조회해 재계산 Digest와 비교하지 않는다**. write와 verify가 시간·호출 분리.
  - `Head 갱신 검증`·`Head가 현재 Entry 지시` → **ABSENT**: Head Digest 개념 부재. `lastHash()`는 `ORDER BY id DESC`(`SecurityAudit.php:39-40`) 물리 조회일 뿐 Head-CAS·Head Verification 없음(§30·§41 미달).
  - `Outbox Binding Digest` → **ABSENT**: Outbox substrate는 실재하나(`Omnichannel.php:390-448`), Outbox 이벤트를 Entry Payload Digest에 바인딩·검증하는 결선 0.
  - **실패 시 전체 Transaction Rollback** → **정반대(fail-open)**: 현행 `SecurityAudit`는 **best-effort 비트랜잭션**이며, 실패 시 `catch` no-op(`SecurityAudit.php:32`)으로 조용히 삼킨다(체인 silent reset). 검증 실패가 커밋을 되돌리기는커녕, 쓰기 실패조차 무음 통과하는 **fail-open** 설계다 — §51의 fail-closed(Rollback)와 정면 배치.

## 3. 판정

- Verdict: **ABSENT / BLOCKED_PREREQUISITE** (verify 능력은 PRESENT하나 커밋시점·트랜잭션·Rollback 결선은 전무, 현행은 fail-open으로 정반대).
- 선행 의존: §3.1 Immutable Ledger(원장 Entry·Head·Outbox)·§3.2 Decision Foundation ABSENT(설계전용·코드/테이블 0)에 종속. 커밋시점에 검증할 Ledger Entry·Head·Outbox 대상 자체가 없어 **BLOCKED_PREREQUISITE**. 트랜잭션 substrate(`Omnichannel.php:404-415`·`Migrate.php:54-60`)는 PRESENT.
- cover: **0** (커밋시점 재검증·Rollback 결선 전무. verify 재계산 로직은 별개의 사후 배치기).

## 4. 확장/구현 방향 (설계)

- 순신규 Commit-time Verification 단계 — Append Transaction 내부에서 ①Canonical Projection 재생성 ②Payload/Context/Previous/Entry Digest 재계산 ③Stored Entry 재조회(round-trip) ④Stored vs Recomputed 비교 ⑤Head가 새 Entry 지시 검증 ⑥Outbox Binding Digest 검증을 순차 실행하고, **하나라도 불일치 시 `PDO::rollBack()`으로 전체 트랜잭션 원복**.
- Golden Rule=Extend: `SecurityAudit::verify`(`SecurityAudit.php:56-68`)의 preimage 재계산+`hash_equals` 이중검증(`SecurityAudit.php:63-64`)을 **단일 Entry 커밋시점 검증기**로 축소·이식. `created_at` 재계산 저장(`SecurityAudit.php:31`)은 커밋시점 Digest 재계산의 결정성 근거로 승격.
- **★fail-open→fail-closed 전환(핵심)**: 현행 `catch` no-op(`SecurityAudit.php:32`)·비트랜잭션 write(`SecurityAudit.php:27`)를 트랜잭션 경계 안으로 이동하고, 검증 실패를 **Rollback + LEDGER_ENTRY_DIGEST_MISMATCH 오류**(§64)로 전환. 무후퇴 예외=개선(fail-open은 보존 대상 아님).
- 재사용 substrate: 트랜잭션 PDO(`Omnichannel.php:404-415`·`Migrate.php:54-60`)·Outbox(`Omnichannel.php:390-448`)·SKIP LOCKED(`Omnichannel.php:405,429-441`)로 Append+Verify+Head갱신+Outbox를 원자화.
- **★Canonicalization 선결**: 커밋시점 재계산이 결정적이려면 preimage가 Canonical Projection이어야 함. 현행 raw `|`-concat + `json_encode(UNESCAPED_UNICODE)`(`SecurityAudit.php:27`)는 §5.3/§5.4 위반 — Canonical Projection 보강이 Commit-time Verification의 선결조건.
- 장식 오인 금지 — `menu_audit_log.hash_chain`(`AdminMenu.php:169-212`, verify() 0)·`schema_migrations.checksum`(`Migrate.php:50,63-64`, 비교 미실행)은 커밋시점 검증 근거 아님.

관련: [[DSAR_APPROVAL_LEDGER_READ_TIME_VERIFICATION]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_POLICY]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

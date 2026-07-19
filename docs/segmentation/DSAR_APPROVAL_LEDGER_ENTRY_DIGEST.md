# DSAR — Ledger Entry Digest (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> file:line 인용원 = [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] GROUND_TRUTH allowlist 한정.
> ★ 이 엔티티 = 실존 substrate `SecurityAudit`를 CANONICAL 패턴으로 **확장**하는 핵심 노드.

## 1. 원문 전사 (Canonical Contract)

§26 ENTRY_DIGEST (`APPROVAL_LEDGER_ENTRY_DIGEST`) — Digest 산식 입력(원문 전사):
- `digest formula version`
- `tenant` · `ledger` · `partition`
- `ledger sequence` · `partition sequence`
- `entry type/subtype` · `integrity version`
- `payload digest` · `context digest` · `reference digest`
- `previous entry digest`
- `effective time` · `committed time` · `recorded time`
- `genesis marker`(해당 시)

레코드 필드(원문 전사): `entry digest id` · `ledger entry id` · `integrity version` · `algorithm` · `canonicalization version` · `payload/context/reference/previous entry digest` · `computed entry digest` · `output encoding` · `generated_at` · `verification status` · `status` · `evidence`.

의미: Entry Digest는 하위 3 digest(Payload§24·Context§25·Reference)와 previous entry digest·sequence·entry type·integrity version·tenant/ledger/partition identity를 **Canonical Envelope로 결합**한 결정 원장 1행의 최종 무결성 지문이다. §5.9의 "이전 Entry 포함" 계약의 실체이며, Chain(§28)·Head(§30)·Verification(§39)의 기본 단위다.

## 2. 기존 구현 대조

- **★유일 실 Entry-급 해시체인 = `SecurityAudit`** (GROUND_TRUTH §0-1: 유일 실 Hash Chain+verify). 실측:
  - preimage에 **previous 포함**: `prev_hash | tenant | actor | action | json_encode(details,UNESCAPED_UNICODE) | now` SHA-256(`SecurityAudit.php:27`) → §5.9 "Previous 포함"의 실 패턴 PRESENT.
  - **재계산 가능한 시각**: preimage의 `$now`를 `created_at`에 저장(`SecurityAudit.php:31`), DDL `created_at VARCHAR(32)`·`prev_hash` 컬럼(`SecurityAudit.php:51`) → 검증 시 재계산 가능(§26 recorded time 근거).
  - **실 검증기**: `verify()`(`SecurityAudit.php:56-68`, 핵심 `:63-64`)가 행별 재계산·`hash_equals`+`prev_hash===$prev`·`{ok,checked,broken_at}` 반환 → **레포 유일 실 재계산 검증기**. 배선 `AdminGrowth.php:1429`.
- **그러나 §26 필수를 다수 미충족**:
  - `ledger sequence`/`partition sequence`(논리 단조) 부재 — 물리 id AUTOINCREMENT만.
  - payload/context/reference digest **분리 부재** — 3자를 단일 preimage에 혼합(`SecurityAudit.php:27`) → §24/§25 위반.
  - `entry type/subtype`·`integrity version`·`digest formula version`·`algorithm 봉투` → **no hits**(algorithm `'sha256'` 하드코딩).
  - Canonicalization 부재(`json_encode UNESCAPED_UNICODE`) → §5.3/§5.4 위반(GROUND_TRUTH §2 row2).
- Entry가 참조할 `ledger entry id`의 원천(불변 Decision Record) = §3.2 ABSENT.

## 3. 판정

- Verdict: **패턴 PRESENT·확장** (SecurityAudit `:27,31,51,56-68` = CANONICAL Entry Digest 패턴) **/ 적용대상 BLOCKED_PREREQUISITE** (결합할 불변 Ledger Entry·Decision Record 부재)
- 선행 의존: §26 Entry Digest는 Payload§24·Context§25·Reference digest와 §15 Ledger·§17 Ledger Entry를 결합 — Ledger/Entry/Decision Core 전부 ABSENT.
- cover: **부분(패턴)** — 해시체인+verify 실재하나 §26 필수(sequence·digest 분리·formula version·canonicalization) 미충족. 무결성 근거로 SecurityAudit 패턴만 계상, 완결 구현은 0.

## 4. 확장/구현 방향 (설계) — ★SecurityAudit 확장 + 델타 보강

- 순신규 `approval_ledger_entry_digest` — §26 전 필드. **Golden Rule=Extend**: `SecurityAudit`(`:27,31,51,56-68`)의 append-only preimage 체인 + 재계산 verify를 CANONICAL 패턴으로 재사용(KEEP_SEPARATE — 감사트레일≠decision ledger).
- ★확장 시 반드시 보강할 델타(GROUND_TRUTH §5 실위험):
  1. **Canonicalization 보강**: `SecurityAudit.php:27`의 raw `|`-concat + `json_encode(UNESCAPED_UNICODE)`를 Canonical Payload/Context/Reference Projection(§13~§22)으로 교체 — §5.3/§5.4 위반 해소. payload/context/reference를 **분리 산출** 후 Entry Digest에서 결합(§24 직접혼합 금지).
  2. **Head-CAS 도입**: `SecurityAudit.php:39-40`의 `ORDER BY id DESC` 즉석 조회는 동시 INSERT 시 체인 분기 이론창 → §30 Head Digest + CAS로 승격(별도 [[DSAR_APPROVAL_LEDGER_HEAD_DIGEST]]).
  3. **verify tenant 술어**: `verify()`(`SecurityAudit.php:56-68`, `:59` 계열)에 tenant 술어 없음 → 멀티테넌트 이식 시 `WHERE tenant_id=?` 필수(§5.13 Tenant Binding).
  4. **fail-open 차단**: `catch` no-op(`SecurityAudit.php:32`)로 체인 silent reset → §5.11(실패 무시 금지) 위배. Entry Digest 산출 실패는 예외 전파·Commit Rollback.
- ★Payload Digest는 §24대로 Sequence/Previous 직접혼합 금지 — sequence·previous entry digest·entry type·integrity version은 **Entry Digest 계층에서** Canonical Envelope로 결합(현행 혼합 preimage와의 결정적 차이).
- 재사용 substrate: 해시 primitive(`SecurityAudit.php:27`·`MediaHost.php:93`·`Migrate.php:50`)·재계산 시각 저장(`:31`)·verify 재계산 루프(`:56-68`)·서버 UTC(`Db.php:438`·`SecurityAudit.php:24`).
- 장식 오인 금지: `menu_audit_log.hash_chain`(verify() 0)·`schema_migrations.checksum`(저장만)은 Entry Digest 실 근거로 계상 금지.
- 선행 조립: Decision Core → Ledger/Entry(§15/§17) → Payload/Context/Reference Digest → 본 Entry Digest → Chain(§28)/Head(§30). 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_LEDGER_HASH_CHAIN]] · [[DSAR_APPROVAL_LEDGER_GENESIS_DIGEST]] · [[DSAR_APPROVAL_LEDGER_HEAD_DIGEST]] · [[DSAR_APPROVAL_PAYLOAD_DIGEST]] · [[DSAR_APPROVAL_CONTEXT_DIGEST]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

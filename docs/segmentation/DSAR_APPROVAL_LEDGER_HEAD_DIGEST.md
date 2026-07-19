# DSAR — Ledger Head Digest (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> file:line 인용원 = [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] GROUND_TRUTH allowlist 한정.
> ★ 현행 SecurityAudit Head-CAS 부재를 닫는 노드.

## 1. 원문 전사 (Canonical Contract)

§30 Ledger Head Digest 필수 필드 (원문 전사):
- `tenant` · `ledger` · `partition`
- `current entry` · `current sequence`
- `current entry digest`
- `previous head digest`
- `head version`
- `fencing token ref`
- `updated_at`

규율(원문 전사): **Head Digest ≠ Entry Digest.**

의미: Head Digest는 원장/파티션의 **현재 tip**(마지막 Entry·최대 Sequence·그 Entry digest)을 별도 digest로 봉인하고 previous head digest·head version·fencing token으로 병행 갱신을 보호한다. Head가 있어야 §41 Head Verification(Head가 마지막 Entry 지시·Head Sequence=Max·Head Version 단조증가·Fencing 이상無)이 가능하고, 동시 append로 인한 체인 분기를 CAS로 차단한다.

## 2. 기존 구현 대조

- **Head Digest·Head-CAS 부재.** `SecurityAudit`는 tip을 별도 봉인하지 않고 **매 조회 `ORDER BY id DESC` 즉석 계산**(`SecurityAudit.php:39-40` — `lastHash()`)으로만 최신 해시를 얻는다. 이는 read일 뿐 CAS·head version·fencing token이 없다(GROUND_TRUTH §2 row5·§5 위험 3).
- ★동시 INSERT 두 건이 같은 prev를 읽으면 **체인 분기 이론창**(GROUND_TRUTH §5 위험 3) — Head-CAS/tx경계 부재.
- `head version`(단조증가)·`previous head digest`·`fencing token ref`·`current sequence`(논리) → **no hits**. 물리 id AUTOINCREMENT만 존재.
- verify(`SecurityAudit.php:56-68`)는 체인 연결성은 재계산하나 **Head가 마지막 Entry를 지시하는지·Head Sequence=Max·Head Version 단조**는 검사 대상 자체가 없다(§41 미충족).

## 3. 판정

- Verdict: **ABSENT** (Head Digest 로우·CAS·fencing·head version 전무. `lastHash()` `ORDER BY id DESC`는 CAS 없는 read라 §30 미충족)
- 선행 의존: §30 Head는 §15 Ledger·§16 Partition tip이자 §19 Sequence 발급의 원자 경계 — 상위 Ledger/Partition ABSENT, Decision Core ABSENT.
- cover: **0** (head row/CAS/fencing/head version 0).

## 4. 확장/구현 방향 (설계) — ★현행 Head-CAS 부재 보강

- 순신규 `approval_ledger_head_digest`(Ledger/Partition당 1행) — §30 전 필드. `current entry digest`·`previous head digest`·`head version`·`fencing token ref`·`current sequence`.
- ★핵심 델타(GROUND_TRUTH §5 위험 3): `SecurityAudit.php:39-40`의 `ORDER BY id DESC` 즉석 조회를 **Head-CAS로 승격** — Expected Head Version + Expected Current Sequence 일치 시에만 Head 교체 + Unique Constraint + Retry with Full Revalidation. 동시 INSERT 체인분기 이론창을 닫는 핵심.
- Head Digest ≠ Entry Digest: Head는 tip 상태(current entry·sequence·previous head·head version)를 별도 canonical 산출 — Entry Digest(§26)를 그대로 복사하지 않음(§30 규율).
- fencing token: 낮은 토큰의 지연 커밋을 차단(§43·§67 stale writer 방지) — 현재 인프라 0, 순신규.
- 재사용 substrate(발명 아닌 조립): SHA-256(`SecurityAudit.php:27`·`MediaHost.php:93`)·재계산 시각 저장(`SecurityAudit.php:31`)·서버 UTC(`Db.php:438`·`:24`). CAS 원자성 = 트랜잭션 PDO + head version 비교(named lock 부재 → 행잠금+version CAS로 advisory lock 대체).
- ★Head는 강한 일관성 대상 — 캐시 금지(§70: Head 변경 시 Invalidation, SoT는 캐시 아님).
- verify 확장: §41 Head Verification(Head가 마지막 Entry 지시·Sequence=Max·Version 단조·previous head reference·fencing 이상無)을 `SecurityAudit.php:56-68` verify 루프에 신설.
- 선행 조립: Decision Core → Ledger/Partition → Entry/Chain/Sequence → 본 Head. 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_LEDGER_ENTRY_DIGEST]] · [[DSAR_APPROVAL_LEDGER_HASH_CHAIN]] · [[DSAR_APPROVAL_LEDGER_PARTITION_HASH_CHAIN]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

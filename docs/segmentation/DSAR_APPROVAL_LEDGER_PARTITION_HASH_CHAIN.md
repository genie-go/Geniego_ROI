# DSAR — Ledger Partition Hash Chain (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> file:line 인용원 = [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] GROUND_TRUTH allowlist 한정.

## 1. 원문 전사 (Canonical Contract)

§29 Partition Hash Chain (원문 전사):
- Partition별 **독립 Chain**(각자 `Genesis` · `Head` · `Sequence` · `Cross-partition Reference` · `Closure Checkpoint` · `New Partition Opening Reference`).
- 전환 시 이전 Partition의 **Final Checkpoint / Head Digest**를 새 Partition의 **Genesis Reference에 포함**.

의미: 대규모 원장을 파티션(기간·범위·샤드)으로 분할하되 각 파티션이 자기 Genesis·Head·Sequence를 가진 독립 체인이 되고, 파티션 전환 시 이전 파티션의 최종 상태(Final Checkpoint/Head Digest)를 새 파티션 Genesis가 참조함으로써 파티션 경계에서도 연결성이 끊기지 않게 한다. 이로써 특정 파티션만 통째로 삭제·교체하는 변조를 인접 파티션 참조로 탐지한다.

## 2. 기존 구현 대조

- **Partition Hash Chain 개념 부재 — 현행은 단일 전역 체인.** `SecurityAudit`는 partition 구분 없이 `lastHash()`가 전체 테이블을 `ORDER BY id DESC`로 조회(`SecurityAudit.php:39-40`)하는 **단일 전역 체인**이다. tenant별·도메인별·기간별 독립 체인이 없다(GROUND_TRUTH §5 위험 4: verify에 tenant 술어 없음·전역 단일 체인).
- `partition Genesis`/`partition Head`/`partition Sequence`/`Cross-partition Reference`/`Closure Checkpoint`/`New Partition Opening Reference` → **no hits**.
- 전환 시 이전 파티션 Final Checkpoint/Head를 새 Genesis에 포함하는 연결 → **no hits**. Checkpoint 개념 자체가 부재(§37 미구현).
- ★결과: 현행 단일 전역 체인은 멀티테넌트 격리(§5.13 Tenant Binding)·대규모 파티셔닝(§71 Performance) 모두 미충족.

## 3. 판정

- Verdict: **ABSENT** (partition별 독립 체인·전환 참조 개념 전무. 단일 전역 체인만 실재)
- 선행 의존: §29는 §16 Partition·§30 Head·§37 Checkpoint·§27 Genesis를 전제 — 전부 ABSENT. Ledger/Decision Core(§3.1/§3.2)도 ABSENT.
- cover: **0** (partition chain 0. SecurityAudit 전역 단일 체인은 §29 계약 미충족).

## 4. 확장/구현 방향 (설계)

- 순신규 Partition Hash Chain — Ledger를 tenant·도메인·기간·범위로 파티셔닝하고 각 Partition이 독립 Genesis(§27)·Head(§30)·논리 Sequence(§19)·Chain(§28)을 보유.
- ★핵심 델타(현행 부재→신설): `SecurityAudit.php:39-40`의 전역 단일 `ORDER BY id DESC`를 **Partition별 Head 조회**로 분해 — verify(`SecurityAudit.php:56-68`)에도 partition/tenant 술어 추가(GROUND_TRUTH §5 위험 4, §5.13 Tenant Binding).
- Partition 전환 연결(§29): 이전 Partition Closure 시 Final Checkpoint/Head Digest를 산출하고, 새 Partition Genesis Reference에 그 digest를 포함 — 파티션 통삭제·교체를 인접 참조로 탐지. Cross-partition Reference·New Partition Opening Reference를 명시 기록.
- 재사용 substrate(발명 아닌 조립): 체인 primitive = SHA-256 prev_hash 패턴(`SecurityAudit.php:27,39-40`) 확장·verify 재계산(`:56-68`), 서버 UTC(`Db.php:438`·`SecurityAudit.php:24`). 파티션 경계 원자성 = 트랜잭션 + Head CAS([[DSAR_APPROVAL_LEDGER_HEAD_DIGEST]]).
- ★Cross-Tenant 차단: 파티션은 tenant 경계를 넘지 못하며, Cross-partition Reference도 동일 tenant 내로 제한(§31 Cross-Tenant Link 차단과 정합).
- 선행 조립: Decision Core → Ledger/Partition(§15/§16) → Genesis/Head/Sequence/Chain → 본 Partition Chain + Checkpoint(§37). 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_LEDGER_HASH_CHAIN]] · [[DSAR_APPROVAL_LEDGER_GENESIS_DIGEST]] · [[DSAR_APPROVAL_LEDGER_HEAD_DIGEST]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

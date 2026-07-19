# DSAR — Ledger Genesis Digest (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> file:line 인용원 = [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] GROUND_TRUTH allowlist 한정.
> ★ 현행 `'GENESIS'` 단순 상수를 Versioned Genesis Marker로 격상하는 노드.

## 1. 원문 전사 (Canonical Contract)

§27 Genesis Digest — Versioned Genesis Marker 구성(원문 전사):
- `tenant` · `ledger` · `partition`
- `integrity version`
- `genesis marker code`
- `partition start metadata`
- `ledger creation time`
- `ledger type`

규율(원문 전사): **동일 상수 문자열 단순 Genesis 금지.** 첫 Entry는 명시적 Versioned Genesis Marker(§5.10: Null·빈문자열·임의값 금지).

의미: Genesis Digest는 각 Ledger/Partition의 **체인 시작점**을 위조·혼동 불가능하게 고정하는 최초 앵커다. 모든 원장이 같은 `'GENESIS'` 문자열을 쓰면 서로 다른 테넌트/원장/파티션의 첫 Entry가 동일 previous를 갖게 되어 Cross-Tenant Chain·시작점 위조·파티션 혼선을 탐지할 수 없다. 그래서 tenant·ledger·partition·integrity version·생성시각·ledger type을 담은 **버전화된 마커**를 산출해야 한다.

## 2. 기존 구현 대조

- **Versioned Genesis Marker 부재 — 현행은 단순 상수 문자열.** `SecurityAudit`는 이전 해시 조회 실패/최초 시 `'GENESIS'` 문자열을 previous로 사용(`SecurityAudit.php:39-40` — `lastHash()` `ORDER BY id DESC`·오류 시 `'GENESIS'`). 이는 §5.10이 금지한 "동일 상수 문자열 단순 Genesis"의 정확한 사례.
- `tenant`/`ledger`/`partition`/`integrity version`/`ledger type`/`partition start metadata`/`ledger creation time`을 담은 genesis 구조 → **no hits**. 전역 단일 체인이므로 partition·ledger 구분 자체가 없다.
- ★위험: `'GENESIS'`가 previous 실패 경로에서도 반환(`SecurityAudit.php:39-40`)되므로, catch fail-open(`SecurityAudit.php:32`)과 결합 시 체인 중간에서 previous 조회가 실패하면 **정상 GENESIS와 구별 불가**하게 체인이 silent reset될 수 있다(GROUND_TRUTH §5 위험 2) — Genesis 마커가 시작점 전용이 아니라 오류 fallback으로 남용됨.

## 3. 판정

- Verdict: **패턴 PRESENT(단순형·격상 대상)** — Genesis 개념은 상수로 실재하나 §27 Versioned Marker 미충족 / 적용대상 **BLOCKED_PREREQUISITE**(Ledger/Partition 부재).
- 선행 의존: §27은 §15 Ledger·§16 Partition·§13 Integrity Version 존재를 전제 — 전부 ABSENT. 전역 단일 체인이라 partition별 genesis 개념 자체 부재.
- cover: **부분(상수)** — `'GENESIS'` 상수(`SecurityAudit.php:39-40`)만 실재. Versioned Marker 구현 0.

## 4. 확장/구현 방향 (설계) — ★현행 상수 격상

- 순신규 Versioned Genesis Marker: `SecurityAudit.php:39-40`의 단순 `'GENESIS'` 상수를 **§27 구조체(tenant·ledger·partition·integrity version·genesis marker code·partition start metadata·ledger creation time·ledger type)를 canonical 산출한 Genesis Digest**로 격상. 각 Ledger/Partition의 첫 Entry previous entry digest = 이 Genesis Digest(테넌트/원장/파티션별 상이).
- ★핵심 델타(오류 fallback과 시작점 분리): 현행은 previous 조회 실패 시에도 `'GENESIS'` 반환(`SecurityAudit.php:39-40`) → **오류 경로에서 Genesis 마커 사용 금지**. Genesis는 "파티션 최초 Entry"에서만 생성, previous 조회 실패는 예외 전파(catch no-op `:32` 제거)로 처리(§5.11).
- 재사용 substrate: Genesis Digest 산출 = SHA-256(`SecurityAudit.php:27`) + Digest Envelope(§23·purpose 앵커). `ledger creation time` = 서버 UTC(`Db.php:438`·`SecurityAudit.php:24`), 재계산 가능 저장(`SecurityAudit.php:31` 패턴).
- ★Partition 전환 시(§29): 새 Partition의 Genesis Reference에 이전 Partition Final Checkpoint/Head Digest를 포함 — 현행 전역 단일 체인에는 부재([[DSAR_APPROVAL_LEDGER_PARTITION_HASH_CHAIN]]).
- 선행 조립: Decision Core → Ledger/Partition(§15/§16) → 본 Genesis Digest → 첫 Entry Digest(§26)/Chain(§28). 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_LEDGER_ENTRY_DIGEST]] · [[DSAR_APPROVAL_LEDGER_HASH_CHAIN]] · [[DSAR_APPROVAL_LEDGER_PARTITION_HASH_CHAIN]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

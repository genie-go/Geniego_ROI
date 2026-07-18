# DSAR — Ledger Sequence (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§19 LEDGER_SEQUENCE 원칙 (원문 전사):
- Ledger/Partition Scope 내 **단조증가** · **Unique**
- **Client 지정 금지**
- Reuse/재할당/삭제로 인한 **재사용 금지**
- Correction/Migration도 **새 Sequence**(기존 재사용 아님)
- External Source Sequence는 **분리**(내부 논리 seq와 구분)
- **Gap 자동은폐 금지** → Conflict/Reconciliation으로 표면화

## 2. 기존 구현 대조

- **논리 Ledger Sequence 부재.** 유일 append 계보 `SecurityAudit.php`(security_audit_log `:48-52`)는 **물리 `id AUTOINCREMENT`만** 갖고 Ledger/Partition Scope 논리 sequence가 없다. lastHash 조회도 `ORDER BY id DESC`(`:35-41`)로 물리키에 의존.
- 단조·Unique·gap 검출 부재: verify(`:56-68`)는 prev_hash 연속 체인만 확인하고 **gap을 탐지하지 않는다**(누락 seq를 이상으로 승격하는 경로 없음).
- Correction/Migration 새 Sequence 원칙 위반 소지: 결정 정정은 새 seq가 아니라 in-place UPDATE(`Mapping.php:285-289,327`·`journey_decision_log` `JourneyBuilder.php:1192`) — 새 논리 sequence 발급 개념 자체가 없다.
- External Source Sequence 분리: paddle 등 외부 이벤트(`Paddle.php:108,146,343-368`)는 UNIQUE dedup만 있고 내부 원장 seq와의 분리/매핑 개념 없음.
- Client 지정 금지·Reuse 금지·Gap→Conflict 승격 → **no hits**(강제 계층 부재).

## 3. 판정

- Verdict: **ABSENT** (물리 `id AUTOINCREMENT`만 · 논리 seq/gap 검출 없음)
- 선행 의존: Sequence는 §15 Ledger·§16 Partition scope 위 논리 순번 — 둘 다 ABSENT, §3.1 Decision Core ABSENT. §20 LEDGER_HEAD(CAS)와 함께 발급 원자성을 형성하나 Head도 CAS 부재.
- cover: **0** (논리 sequence 0). 물리 AUTOINCREMENT는 §19 계약 미충족(client-agnostic이나 scope/gap/reuse-guard 없음).

## 4. 확장/구현 방향 (설계)

- 순신규 논리 `ledger_sequence`(Ledger/Partition scope 단조·Unique) — 물리 `id`와 분리. (partition_id, ledger_sequence) UNIQUE로 재사용/중복 차단. Client 지정 금지(서버 발급).
- 발급 원자성 재사용 substrate: 트랜잭션 PDO(`Omnichannel.php:404-415`) + SKIP LOCKED 행클레임(`:405,429-441`)을 §20 Head CAS 안에서 Sequence Allocation에 차용(발명 아닌 조립). named lock(GET_LOCK)은 부재이므로 트랜잭션+CAS로 대체.
- ★Gap 자동은폐 금지(§19): 현행 verify(`:56-68`)의 "연속 체인만 확인"을 gap 탐지로 승격 — 누락 seq를 §45 Conflict/§46 Gap Detection/§54 Reconciliation으로 표면화(재번호화 금지).
- Correction/Migration도 새 Sequence — 현행 in-place UPDATE(`Mapping.php:288`) 정반대. External Source Sequence(paddle 등)는 별 컬럼으로 분리 저장·내부 seq와 매핑만.
- 선행 조립: Decision Core(§3.1) → Ledger/Partition(§15/16) → 본 Sequence + Head(§20). 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_DECISION_LEDGER_HEAD]] · [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

# DSAR — Context Digest (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> file:line 인용원 = [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] GROUND_TRUTH allowlist 한정.

## 1. 원문 전사 (Canonical Contract)

§25 Context Digest 포함 필드 (원문 전사):
- `tenant`
- `decision definition version` · `decision action version`
- `approval case version` · `work item`
- `assignment`
- `authority resolution` · `delegation resolution`
- `sequential step`
- `actor identity snapshot ref`
- `legal entity` · `organization` · `resource`
- `amount` · `currency`
- `effective time` · `commit time`

의미: Context Digest는 payload(업무 내용물, §24)와 분리하여 "그 결정이 **어떤 맥락에서** 내려졌는가" — 테넌트·정의/액션 버전·권한/위임 해석·순차 단계·행위자 스냅샷·금액/통화·유효/커밋 시각 — 의 무결성 지문이다. Reference는 §22에 따라 Stable Identifier(현재 조직명/직책/표시명 금지)와 필요 시 Snapshot Digest로 고정한다. Payload와 Context를 분리해야 §44에서 PAYLOAD_MISMATCH와 CONTEXT_MISMATCH를 구별 탐지한다.

## 2. 기존 구현 대조

- **독립 Context Digest 부재.** SecurityAudit preimage(`SecurityAudit.php:27`)에 `tenant`·`actor`(context 조각)가 들어가지만 payload(details)와 **한 해시에 혼합**되어 있어 context만의 독립 지문이 아니다 — §24/§25 분리 위반.
- `decision definition/action version`·`approval case version`·`authority resolution`·`delegation resolution`·`sequential step` → **no hits**. 이들 필드의 원천 = §3.1 Decision Core·Authority/Delegation resolution·Sequential 인스턴스인데 전부 ABSENT(GROUND_TRUTH §1).
- `actor identity snapshot ref` → 부재. actor는 현재 mutable 문자열/id로만 preimage에 들어가며(`SecurityAudit.php:27`) §22가 요구하는 Snapshot Identifier+Snapshot Digest 고정이 없다.
- `amount`/`currency` canonical → **no hits**. Decimal Utility ABSENT(GROUND_TRUTH §4)이므로 §18 Monetary canonicalization 미충족(float/locale 위험).
- `effective time`/`commit time` 구분 → 부재. SecurityAudit는 단일 `now`(`SecurityAudit.php:27,31`)만 있고 §19의 event_effective_at·committed_at·recorded_at 3분 구분이 없다.

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE** (context 구성요소인 decision definition/action version·authority/delegation resolution·sequential step·actor snapshot이 §3.1/§3.2 부재로 존재하지 않음)
- 선행 의존: §25 필드 대부분이 Decision Foundation·Authority/Delegation Resolution·Sequential·Actor Identity Snapshot을 필수 참조 — 전부 ABSENT. Monetary는 Decimal Utility(§4) ABSENT.
- cover: **0** (context-only digest 0. SecurityAudit의 tenant/actor 혼입은 §25 미충족).

## 4. 확장/구현 방향 (설계)

- 순신규 Context Digest: §25 필드를 Canonical Field Set(§14 aggregate type=CONTEXT)으로 투영 → Canonical Projection → SHA-256 → Digest Envelope(§23·purpose=`CONTEXT`).
- ★핵심 델타: `SecurityAudit.php:27`이 tenant·actor를 payload와 혼합하는 것을 분리 — context 요소는 Context Digest로 독립 산출, payload는 Payload Digest(§24), 결합은 Entry Digest(§26). §5.4 문자열 임의연결 금지 충족.
- Reference 고정(§22): actor는 mutable 문자열 대신 `actor identity snapshot ref`+Snapshot Digest로 고정 — 현재 조직/직책/표시명 digest 포함 금지(§62 Static Lint Display Name Reference 차단).
- Monetary(§18): `amount`는 minor unit/normalized decimal + `currency` + currency precision version으로 canonical화 — Decimal Utility 순신규(GROUND_TRUTH §4 ABSENT). float 직접 해시 금지.
- Timestamp(§19): `effective time`/`commit time`을 UTC·precision 고정(재사용 `Db.php:438`·`SecurityAudit.php:24` 서버 UTC), event_effective_at·committed_at·recorded_at 3분 구분.
- 선행 조립: Decision Core·Authority/Delegation Resolution·Sequential·Actor Identity Snapshot → 본 Context Digest. 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_PAYLOAD_DIGEST]] · [[DSAR_APPROVAL_LEDGER_ENTRY_DIGEST]] · [[DSAR_APPROVAL_DIGEST_ENVELOPE]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

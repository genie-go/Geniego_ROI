# DSAR — Ledger Retention Digest (06-A-03-02-03-02 · §36)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 인용은 [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

**§36 Retention Digest** — Retention Action(보존/파기 조치)의 Digest. 필수 Canonical 입력:
- `target entry id + digest`
- `retention policy`
- `action type`
- `legal basis`
- `authorized actor`
- `executed time`(Trusted Time·UTC)
- `retained metadata set`(파기 후에도 보존되는 메타 집합)
- `tombstone ref`(파기 표식 참조)

원칙 계약(§36·§5.9·§28 파생): ★**Retention은 Payload만 파기하고 Sequence·Digest·Chain은 유지한다.** Entry 자체를 물리 삭제하면 Hash Chain(§28: Previous Entry Digest+Sequence 포함)이 끊어져 §44 `MISSING_ENTRY`/`CHAIN_BREAK` tamper로 판정된다. Retention은 payload를 tombstone으로 치환하되 entry id·sequence·entry digest·previous digest를 보존하고, 그 조치 자체를 Retention Digest로 봉인한다. Digest Purpose=`RETENTION_ACTION`(§23).

## 2. 기존 구현 대조

- **Retention Action Aggregate가 ABSENT.** GROUND_TRUTH §1: §3.1 Immutable Ledger ABSENT — retention binding·tombstone·retained metadata 레코드 0히트.
- **★실 위험 — append-only 로그 물리삭제.** GROUND_TRUTH §4는 `media_gc_cron`을 cron substrate로 등재하나, 이 cron 계열은 감사/미디어 로그를 물리 DELETE하는 GC 성격이다(선행 Registry DSAR §3에서 감사로그 90일 물리삭제로 지적). Retention을 **payload-only tombstone**이 아닌 entry 물리삭제로 구현하면 Chain Break를 유발 — Retention Digest는 이 위험을 명시적으로 차단하는 계약이다. (물리삭제 line 인용은 crypto GROUND_TRUTH 미등재 → 개념으로만 명시.)
- **retained metadata / tombstone 규약 부재**: Sequence·Digest 유지한 채 payload만 파기하는 tombstone 모델 미존재.

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE**
- 근거: 소스 Aggregate(Retention Action)가 선행 §3.1 부재로 ABSENT → 보존/파기 대상 Entry·tombstone 없음. 물리삭제 cron은 append-only 원장 대상에서 제외해야 할 위험 요인.
- cover: **0** (Retention Digest Envelope·retained metadata set·tombstone ref 규약 전무).

## 4. 확장·구현 방향 (설계)

- **순신규** Retention Field Set(§14 Aggregate Type=RETENTION_ACTION) + Envelope(purpose=`RETENTION_ACTION`). target entry id+digest·retention policy·legal basis·tombstone ref·retained metadata set를 Canonical Projection.
- **★Payload-only 파기**: Retention은 payload를 tombstone으로 치환하되 **entry id·sequence·entry digest·previous digest는 유지** — Chain 온전성 보존(§28·§44). entry 물리삭제 금지.
- **물리삭제 cron 격리**: media_gc_cron류 GC가 append-only 결정 원장을 삭제하지 않도록 Retention Policy + Legal Hold(§36)로 차단.
- **선행 필수**: §3.1 Ledger Retention Aggregate 실구현 — 별도 승인세션(RP-002).

관련: [[SPEC_06A_03_02_03_02_CRYPTO_HASH_CHAIN_TAMPER_VERBATIM]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_DECISION_LEDGER_RETENTION_BINDING]] · [[DSAR_APPROVAL_LEDGER_LEGAL_HOLD_DIGEST]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

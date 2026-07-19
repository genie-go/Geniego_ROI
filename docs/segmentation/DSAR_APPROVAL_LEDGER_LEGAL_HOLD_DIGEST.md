# DSAR — Ledger Legal Hold Digest (06-A-03-02-03-02 · §36)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 인용은 [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

**§36 Legal Hold Digest** — Legal Hold(법적 보존명령)의 Digest. 필수 Canonical 입력:
- `target entry`(대상 Entry)
- `hold id`
- `reason`
- `authority`(발동 권한 주체)
- `start` / `end`(보존 개시/종료)
- `deletion prohibited`(삭제 금지 플래그)
- `retention override`(Retention 정책 상위 우선)
- `release ref`(해제 참조)

원칙 계약(§36 파생): Legal Hold는 대상 Entry에 대해 **삭제·파기를 금지**하며 Retention 정책보다 우선한다(retention override). Retention Digest가 payload 파기를 봉인한다면, Legal Hold Digest는 그 파기를 **막는** 조치를 봉인한다 — 즉 media_gc_cron류 물리삭제·Retention payload 파기가 Legal Hold 대상 Entry에는 적용되지 않도록 강제하는 계약. Digest Purpose=`LEGAL_HOLD`(§23).

## 2. 기존 구현 대조

- **Legal Hold Aggregate가 ABSENT.** GROUND_TRUTH §1: §3.1 Immutable Ledger ABSENT — legal hold binding·hold id·deletion prohibited·retention override 레코드 0히트.
- **★삭제금지 강제 부재 = 실 위험 노출.** Legal Hold가 없으므로, GROUND_TRUTH §4가 등재한 `media_gc_cron` 계열 GC가 감사/원장 로그를 무차별 물리삭제하는 것을 막을 수 없다(선행 Registry DSAR §3의 append-only 로그 90일 물리삭제 지적과 동일 구조). deletion prohibited·retention override 플래그가 데이터로 선언되지 않음.
- **release/authority 계보 부재**: 보존명령 발동·해제 권한과 그 시점을 봉인하는 digest 없음.

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE**
- 근거: 소스 Aggregate(Legal Hold Binding)가 선행 §3.1 부재로 ABSENT → 보존명령 대상 Entry·삭제금지 강제 없음.
- cover: **0** (Legal Hold Digest Envelope·deletion prohibited·retention override·release ref 규약 전무).

## 4. 확장·구현 방향 (설계)

- **순신규** Legal Hold Field Set(§14 Aggregate Type=LEGAL_HOLD) + Envelope(purpose=`LEGAL_HOLD`). hold id·reason·authority·start/end·deletion prohibited·retention override·release ref를 Canonical Projection.
- **★삭제 우선차단**: Legal Hold 대상 Entry는 Retention payload 파기·물리삭제(media_gc_cron류)보다 **우선하여 보존** — retention override로 Retention Digest 조치를 무력화. Chain·Sequence·Digest·Payload 모두 유지.
- **발동/해제 봉인**: authority·start/end·release ref를 append-only로 기록, `SecurityAudit.php:56-68` verify 패턴 확장.
- **선행 필수**: §3.1 Legal Hold Binding Aggregate 실구현 — 별도 승인세션(RP-002).

관련: [[SPEC_06A_03_02_03_02_CRYPTO_HASH_CHAIN_TAMPER_VERBATIM]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_DECISION_LEDGER_LEGAL_HOLD_BINDING]] · [[DSAR_APPROVAL_LEDGER_RETENTION_DIGEST]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].

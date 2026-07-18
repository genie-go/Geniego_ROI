# DSAR — Ledger Lease (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§42 LEDGER_LEASE

- **필드**: lease id · ledger lock id · owner process id · lease start/end · heartbeat interval · last heartbeat · renewal count · maximum renewals · expiration policy · status · evidence.
- ★ **무기한 리스 금지**(반드시 만료·최대 갱신횟수 존재).

## 2. 기존 구현 대조

- 코드 기반 판정: **PARTIAL** — 시간제한 리스(만료+회수) substrate 는 실재하나, **원장 lock 결합·heartbeat·renewal count·max renewals 는 부재**.
- 실존 substrate:
  - **15분 리스 + stale 회수**: `Omnichannel.php:395` `$staleTtl = gmdate('Y-m-d H:i:s', time() - 900)` — 15분 초과한 stale 'processing' 행을 status='queued' 로 회수(`:397-399`), 크래시 워커의 유실 방지. "무기한 금지"의 실사례.
  - **소유자 마킹 + 시각**: claim_id + claimed_at(`Omnichannel.php:410-411`)로 소유자·리스 획득 시각 기록.
  - 서버 UTC 기준 시각(`:393` self::now / gmdate).
- 부재:
  - §42 **lease id·ledger lock id 결합·heartbeat interval·last heartbeat·renewal count·maximum renewals·expiration policy** = no hits — 현재는 단일 TTL(900초) 하드코딩 회수만 있고 갱신(heartbeat)·최대 갱신 제한 개념 없음.
  - 리스 대상이 원장 lock(§41)이 아니라 outbox 작업행 — 원장 append 리스 부재.

## 3. 판정

- Verdict: **PARTIAL** (omni_outbox 15분 만료·회수 리스 실재 · 원장 lock 결합/heartbeat/renewal 부재)
- 선행 의존: §42 는 §41 Ledger Lock 을 전제(lease id → ledger lock id) — §41 원장 named lock 부재로 결합 대상 없음. heartbeat/renewal 은 순신규.
- cover: **omni_outbox 15분 리스 + stale 회수 존재**(`Omnichannel.php:395,397-399,410-411`) · **원장 lease/heartbeat/renewal = 0**.

## 4. 확장/구현 방향 (설계)

- 확장 기반(Golden Rule = Extend): `Omnichannel.php:395` 의 TTL 리스 + stale 회수 패턴을 원장 lock 리스의 substrate 로 재사용 — 하드코딩 900초를 §42 `lease start/end·expiration policy` 로 승격하고 `ledger_lock_id` 로 §41 결합.
- heartbeat + max renewals 신설(Mandatory): 장기 append/reconciliation 작업은 last_heartbeat 갱신으로 리스 연장, renewal_count ≥ maximum_renewals 시 강제 만료 — "무기한 금지" 강제. 현재 heartbeat 개념 0 이므로 순신규.
- Fencing 결합(Mandatory): 리스 만료 후 부활한 워커의 append 를 막기 위해 리스 갱신마다 §43 fencing token 을 증가 — 낮은 토큰 커밋 차단(§43 로 위임). 회수(`:397-399`)만으로는 좀비 워커의 in-flight 쓰기를 막지 못함.
- 무후퇴: omni_outbox 발송 리스는 그대로 유지(§68 Regression Gate) — 원장 lease 는 KEEP_SEPARATE 신설.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_LOCK]] · [[DSAR_APPROVAL_DECISION_LEDGER_FENCING_TOKEN]] · [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].

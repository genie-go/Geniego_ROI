# DSAR — Assignment Lock (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§44 LOCK — 배정/결정 잠금(Lock) 계약. 필드:

1. lock_id
2. assignment_id
3. work_item_id
4. lock type
5. owner subject / process id
6. lock token hash
7. acquired_at / expires_at / released_at
8. fencing token
9. version
10. status
11. evidence

LOCK_TYPE enum: CLAIM / ASSIGNMENT_UPDATE / REASSIGNMENT / TRANSFER / DECISION_ATTEMPT / RECOVERY / SYSTEM / CUSTOM.

원칙: **Fencing Token 필수** — 오래된(stale) Process 가 최신 상태를 덮어쓰지 못하게 단조 증가 fencing token 으로 방어.

## 2. 기존 구현 대조

- **PARTIAL — 상호배제(CAS / SKIP LOCKED)는 실존하나 ★Fencing Token 부재(실위험).**
- `omni_outbox` 는 `FOR UPDATE SKIP LOCKED` + CAS fallback 으로 행 단위 상호배제를 실사용한다(`Omnichannel.php:425-448`). `catalog_writeback_job` 은 CAS claim 으로 이중 점유를 방지한다(`Catalog.php:1721-1731`).
- **결정적 한계 — Fencing Token 없음**: 두 자산 모두 **DB 트랜잭션/CAS 순간의 상호배제**만 제공하며 §44 의 lock 레코드(lock_id·lock type·owner process id·lock token hash·**fencing token**·expires_at·version)를 남기지 않는다. 따라서 lease 만료 후 되살아난 **오래된 Process 가 최신 Assignment/Decision 을 덮어쓰는 것을 막을 단조 fencing token 이 없다** — 이는 §GROUND_TRUTH 가 명시한 **실위험(★)** 이며, §52 Conflict 의 STALE_LOCK·§66 "Fencing 없는 Lock" 감사 항목에 해당한다.
- DECISION_ATTEMPT/REASSIGNMENT/TRANSFER 등 승인 특화 LOCK_TYPE, expires_at 기반 lock 만료·released_at 기록도 부재.

## 3. 판정

- Verdict: **PARTIAL** (★fencing token 부재 = 실위험)
- 선행 의존: 상호배제 프리미티브(CAS·SKIP LOCKED)는 실존(`Omnichannel.php:425-448`·`Catalog.php:1721-1731`)하나, **Fencing Token 이 부재**하여 stale-process overwrite 를 막지 못한다. 승인 Lock 으로의 승격은 Claim(§40 PARTIAL)·Lease(§42 PARTIAL) 및 owner subject 해석에 필요한 **축3 Identity/Org(ABSENT)·축4 Security/Authz(PARTIAL, `SecurityAudit.php:56-68` verify() 실재)** 에 종속된다.
- cover: `Omnichannel.php:425-448`(FOR UPDATE SKIP LOCKED + CAS 상호배제 — fencing token 없음) · `Catalog.php:1721-1731`(catalog_writeback_job CAS claim — 상호배제만, fencing token 없음)

## 4. 확장/구현 방향 (설계)

- **확장 우선(재생성 금지).** 승인 Lock 은 실존 상호배제 패턴(`Omnichannel.php:425-448` SKIP LOCKED/CAS, `Catalog.php:1721-1731` CAS)을 **재사용·확장**하여 §44 lock 레코드(lock type·owner process id·lock token hash·expires_at·version)를 얹는다 — 새 락 매니저 신설 금지.
- **★Mandatory Control — Fencing Token 필수**: 단조 증가하는 **fencing token** 을 발급·검증하여, lease 만료 후 되살아난 오래된 Process 의 쓰기를 **버전 비교로 거부(fail-closed)** 한다. 이것이 이 문서의 핵심 실위험 교정 포인트다. Lock 은 Claim/Reassignment/Transfer/Decision Attempt 시 획득하고, expires_at 만료·released_at 기록·STALE_LOCK 감지(§52)를 갖춘다.
- **연계**: Lock 은 Claim(§40)·Lease(§42) 와 하나의 승인 점유 사이클로 묶이며, Decision Commit 은 유효 Lock + 미만료 Lease + 최신 fencing token 을 모두 요구한다.
- **무후퇴 유의**: 실 엔진은 별도 승인 세션. 코드변경 0. 실존 `omni_outbox`·`catalog_writeback_job` 의 SKIP LOCKED/CAS 동작은 §70 회귀 게이트로 무후퇴. Fencing token 이 없는 동안 "동시성 안전"을 승인 맥락에서 표시하지 않는다(가짜녹색 금지).

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].

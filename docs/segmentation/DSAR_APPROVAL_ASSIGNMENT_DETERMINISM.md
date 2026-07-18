# DSAR — Assignment Determinism (§21) (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §21 DETERMINISM 원칙 (원문 전사)
1. 동일 입력·정책버전·후보Snapshot·Effective Time → 동일 Resolution.
2. Round-robin/Weighted 도 deterministic 해야 한다 — 다음 기록 필수:
   1. deterministic cursor
   2. cursor version
   3. partition key
   4. queue version
   5. candidate set hash
   6. tie-break key
   7. resolution timestamp
   8. replay seed

## 2. 기존 구현 대조

§GROUND_TRUTH 근거로 Assignment Determinism 은 **성립할 기반이 없다**.

- 결정성의 전제인 Resolution(§18)·Candidate Snapshot(§15)·Policy Version(§10)·Strategy(§20) 가 전부 ABSENT 이므로, "동일 입력→동일 Resolution" 을 판정할 대상 산출물 자체가 없다.
- 현행에서 결정성에 가장 근접한 것은 **동시성 결정성**(재현이 아니라 경쟁 안전)뿐이다: `catalog_writeback_job` 의 CAS claim(`Catalog.php:1721-1731` 조건부 UPDATE affected-rows 소유) · `omni_outbox` 의 `FOR UPDATE SKIP LOCKED`+CAS fallback(`Omnichannel.php:405,425-448`). 이는 double-claim 을 막는 관용구지, 배정 결과를 seed/cursor 로 재현하는 결정성이 아니다.
- job drain 순서는 `ORDER BY id ASC`(`Catalog.php:1716`)로 재현 가능하나, 이는 단일 FIFO 정렬일 뿐 cursor version·partition key·candidate set hash·replay seed 를 기록하지 않는다 — §21 이 요구하는 재현 원장이 없다.
- deterministic seed·replay seed·resolution hash 를 저장하는 컬럼/로직 backend 0.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Determinism 은 Strategy(§20·ABSENT)·Resolution(§18·ABSENT)·Candidate Snapshot(§15·ABSENT)·Policy Version(§10·ABSENT) 위의 상위 계약이다. 이들이 전부 부재하므로 `BLOCKED_PREREQUISITE`(재현할 산출물 없음). 동시성 CAS 는 인접(경쟁안전)일 뿐 재현 결정성이 아니다.
- cover: 0 (deterministic cursor·replay seed·resolution hash·candidate set hash 어느 것도 없음)

## 4. 확장/구현 방향 (설계)

- Determinism 은 **순신규 계약**이다. 재사용할 것은 동시성 관용구뿐: CAS claim(`Catalog.php:1721-1731`)+SKIP LOCKED(`Omnichannel.php:405`)는 **경쟁안전 레이어**로 그대로 재사용(§65 CANONICAL), 그 위에 재현 결정성(cursor/seed/hash 원장)을 신설로 얹는다 — 두 관심사를 혼동하지 않는다.
- Mandatory Control: 무작위 전략(`RANDOM_WITH_DETERMINISTIC_SEED`)은 replay seed 기록 없이는 금지 · round-robin/weighted 도 deterministic cursor+cursor version+partition key 없이 집행 금지(§21 원문).
- 무후퇴: 기존 FIFO drain(`Catalog.php:1716`)은 partition key=queue·cursor=id 의 특수 케이스로 흡수(재현성 손실 없이 상위호환).
- ★재현 원장은 과거 Snapshot 을 재작성하지 않는 append-only immutable_hash 로 설계(§54 Snapshot·§58 "과거 재작성 금지"와 정합).

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].

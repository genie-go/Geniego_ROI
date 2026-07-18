# DSAR — Assignment Lease (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§42 LEASE — 점유 임대(Lease) 계약. 필드:

1. lease_id
2. assignment_id
3. claim id
4. lessee subject id
5. lease version
6. start / end
7. renewal count
8. maximum renewals
9. heartbeat policy
10. last heartbeat
11. expiration / recovery policy
12. status
13. evidence

LEASE_STATUS enum: PENDING / ACTIVE / RENEWAL_PENDING / RENEWED / EXPIRED / RELEASED / REVOKED / COMPLETED.

§43 원칙: Lease 없는 Claim 금지 · 만료 후 Decision Commit 차단 · Renewal 시 재검증 · Heartbeat 누락 → Recovery · 무기한 Lease 금지 · Maximum Renewal 상한.

## 2. 기존 구현 대조

- **PARTIAL — job 용 lease/회수 패턴은 CANONICAL 로 실존, 그러나 승인 lease 는 아님.**
- `catalog_writeback_job` 은 점유 시각(claimed_at) 기준 **600초 경과 시 회수(reclaim)** 를 실사용한다(`Catalog.php:1699-1702`) — 워커가 죽어 방치된 행을 만료 처리하여 재점유 가능하게 한다. 이는 lease expiration + recovery 의 최소 형태다.
- `omni_outbox` 는 claim_id/claimed_at 를 갖춰 점유 시각 기반 회수/재시도가 가능한 **CANONICAL claim/lease 패턴**이다(`Omnichannel.php:95-99,405,425-448`).
- **결정적 한계**: 이 회수는 **고정 타임아웃(600s) 기반 job 회수**이지 §42 의 승인 lease 가 아니다. 부재 항목 — lease_id/claim id 연결(①③)·lessee subject/lease version(④⑤)·renewal count/maximum renewals(⑦⑧)·heartbeat policy/last heartbeat(⑨⑩)·명시적 expiration/recovery policy 레코드(⑪)·LEASE_STATUS 전이. Renewal 재검증·heartbeat 누락 감지·Maximum Renewal 상한도 없다(고정 타임아웃만).

## 3. 판정

- Verdict: **PARTIAL**
- 선행 의존: lease **만료→회수의 기본 메커니즘은 CANONICAL 로 실존**(`Catalog.php:1699-1702` 600s 회수·`Omnichannel.php:95-99,405,425-448` claimed_at 기반)하나, 이를 **승인 lease** 로 승격(lessee subject·renewal·heartbeat·재검증·Maximum Renewal)시키려면 상위 Claim(PARTIAL) 및 §43 Renewal 재검증이 요구하는 **축2 Authority Matrix·축3 Identity/Org(모두 ABSENT)** 신설이 선행이다.
- cover: `Catalog.php:1699-1702`(catalog_writeback_job claimed_at + 600s 회수 — job lease/recovery 의 최소 형태, CANONICAL) · `Omnichannel.php:95-99,405,425-448`(omni_outbox claim_id/claimed_at·SKIP LOCKED·CAS — CANONICAL claim/lease 패턴)

## 4. 확장/구현 방향 (설계)

- **확장 우선(재생성 금지).** 승인 Lease 는 새 만료/회수 스케줄러를 만들지 말고 실존 CANONICAL 패턴(`Catalog.php:1699-1702` claimed_at + 타임아웃 회수, `Omnichannel.php:95-99,405,425-448` claimed_at)을 **재사용**하여 Claim(§40) 레코드에 lease 를 연결한다.
- **신규 필요**: lease_id↔claim id 연결·lessee subject id·lease version·renewal count/maximum renewals·heartbeat policy/last heartbeat·expiration/recovery policy·LEASE_STATUS 전이를 선행 4축 신설 이후 추가.
- **Mandatory Control(§43)**: **Lease 없는 Claim 금지**, **만료 Lease 상태에서 Decision Commit 차단(fail-closed)**, **Renewal 마다 Authority/Delegation/Capacity 재검증**, Heartbeat 누락 시 Recovery 로 전이, **무기한 Lease 금지 + Maximum Renewal 상한**. 고정 600s 타임아웃은 승인 lease 로 승격 시 정책 기반(heartbeat/expiration policy)으로 대체·확장하되 기존 job 회수 동작은 후퇴시키지 않는다.
- **무후퇴 유의**: 실 엔진은 별도 승인 세션. 코드변경 0. 실존 job 회수(`catalog_writeback_job`·`omni_outbox`)는 §70 회귀 게이트로 무후퇴. Lease 재검증이 없는 동안 "임대 유효"를 승인 맥락으로 표시하지 않는다(가짜녹색 금지).

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].

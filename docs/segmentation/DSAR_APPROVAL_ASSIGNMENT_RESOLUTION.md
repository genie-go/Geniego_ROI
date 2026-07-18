# DSAR — Approval Assignment Resolution (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`RESOLUTION`(§18) — 하나의 Work Item 에 대해 후보 집합을 랭킹·검증하여 **최종 배정 대상(또는 큐)을 결정론적으로 산출**한 결과.

### 필수 필드 (원문)

1. resolution_id
2. work_item_id
3. definition / version / policy id
4. policy version
5. strategy id
6. queue routing result
7. candidate count
8. eligible count / excluded count
9. ranked candidates
10. winning candidate
11. fallback candidate
12. authority / delegation / legal entity / organization / geography / resource / action / monetary / availability / capacity / workload / skill / affinity / conflict result
13. deterministic seed reference
14. resolution hash
15. resolved_at
16. status
17. evidence

(결정론 원칙 §21: 동일 입력·정책버전·후보 Snapshot·Effective Time → 동일 Resolution. Round-robin/Weighted 도 deterministic cursor·cursor version·partition key·queue version·candidate set hash·tie-break key·resolution timestamp·replay seed 기록. 결과 enum = 별도 명세 [[DSAR_APPROVAL_ASSIGNMENT_RESOLUTION_RESULT]].)

## 2. 기존 구현 대조

후보 랭킹·검증·결정을 수행하는 Resolution 엔진이 **통째로 부재**하다(개념별 판정: Resolution=ABSENT). 상위 Candidate(§15)·Strategy(§20)가 ABSENT 이므로 랭킹할 후보 집합도, 랭킹 전략도 없다.

| 필드군 | 선행 축·현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|
| Resolution 엔진 자체 | 부재 — 후보 랭킹/승자 산출 코드 0 | ABSENT |
| strategy id / ranked candidates | Strategy(§20) **ABSENT** · Candidate(§15) ABSENT | ABSENT |
| queue routing result | 인접 = `catalog_writeback_job`(`Catalog.php:75-84`)·`omni_outbox`(`Omnichannel.php:405,425-448`) 큐 실재하나 Routing Rule(§26) ABSENT | PARTIAL(큐 실재·라우팅 부재) |
| authority/delegation/legal entity/org result | 선행 축2 Authority·축3 Org·위임 정본 **ABSENT** | BLOCKED_PREREQUISITE |
| monetary / currency result | amount_band 0(축2 ABSENT) | BLOCKED_PREREQUISITE |
| capacity/workload result | 인접 = `PM/Enterprise.php:371-400`(읽기전용·미환류) | PARTIAL(읽기전용) |
| conflict result | Conflict=PARTIAL(동시성만) — `omni_outbox` FOR UPDATE SKIP LOCKED(`Omnichannel.php:425-448`)·`catalog_writeback_job` CAS(`Catalog.php:1721-1731`)는 동시성 락이지 배정 충돌 해소 아님 | PARTIAL(동시성만) |
| deterministic seed / resolution hash | 결정론 재현 계층 부재 · evidence 정본 = `SecurityAudit.php:56-68` verify() | ABSENT / LEGACY_ADAPTER(evidence) |

## 3. 판정

- Verdict: **ABSENT** — Resolution 엔진 통째 부재. 후보 랭킹·승자 산출·결정론 재현 계층 없음.
- 선행 의존: authority/delegation/legal entity/org/monetary result 는 **선행 4축 부재**로 `BLOCKED_PREREQUISITE`. strategy/ranked candidates 는 상위 Candidate(§15)·Strategy(§20) ABSENT 에 의존. queue routing·capacity·conflict 는 `PARTIAL`.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- Resolution 엔진은 순신설이며 **Candidate(§15)·Strategy(§20)·선행 4축이 모두 선행**되어야 성립한다. 후보도 전략도 없이 Resolution 만 세우면 빈 파이프라인 위의 장식이 된다.
- **결정론(§21)을 처음부터 설계하라** — deterministic seed·cursor version·candidate set hash·resolution hash·replay seed 를 기록해 동일 입력→동일 결과·과거 재생을 보장. Round-robin/Weighted 도 반드시 결정론적 cursor 사용.
- queue routing result 는 `catalog_writeback_job`·`omni_outbox` 큐를 재구현하지 말고 Queue(§22)·Routing Rule(§26) 정본으로 확장.
- conflict result 는 현행 동시성 락(`Omnichannel.php:425-448`·`Catalog.php:1721-1731`)을 배정 충돌 해소(§52)와 혼동하지 마라 — 락은 CANONICAL 이나 Conflict Resolution 은 별도 신설.
- evidence 는 `SecurityAudit::verify()`(`SecurityAudit.php:56-68`) 확장. 🔴 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]).
- 코드 변경 0 유지 — 실 구현은 별도 승인세션.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].

# DSAR — Approval Queue Version (§23) (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §23 QUEUE_VERSION 필수 필드 (원문 전사)
1. queue_version_id
2. queue_id
3. version_number
4. previous_version_id
5. membership snapshot
6. routing policy snapshot
7. authority policy snapshot
8. legal entity snapshot
9. organization snapshot
10. resource snapshot
11. action snapshot
12. monetary snapshot
13. currency snapshot
14. claim policy snapshot
15. lease policy snapshot
16. capacity snapshot
17. fallback snapshot
18. effective_from / effective_to
19. immutable_hash
20. status
21. evidence

## 2. 기존 구현 대조

§GROUND_TRUTH 근거로 **버전 없는 큐**다(Queue Version=ABSENT).

- 현행 두 승인 큐 `catalog_writeback_job`(`Catalog.php:75-84`)·`admin_growth_approval`(`AdminGrowth.php:142`) 은 어느 것도 version_number / previous_version_id / effective_from·to / immutable_hash 를 갖지 않는다. 큐 정의는 코드 상수로 고정되어 시간에 따른 불변 버전 스냅샷 원장이 없다.
- 따라서 §23 이 요구하는 membership/routing/authority/legal entity/organization/resource/action/monetary/currency/claim/lease/capacity/fallback 정책 스냅샷은 **캡처 대상 자체가 없다**(각 정책이 §22~§26 수준에서 부재하거나 미구현).
- 인접 참조로 effective-dating 선례는 존재하나 무관 도메인이다: `kr_fee_rule.effective_from`(수수료/VAT open-interval `Db.php:898`) 은 승인 큐 버전이 아니다. 이를 큐 버전으로 인용 금지.
- §66 Duplicate Audit 이 명시적으로 "Version 없는 Queue" 를 안티패턴으로 지목하는데, 현행이 정확히 그 상태다.

## 3. 판정

- Verdict: **ABSENT** (Version 없는 큐)
- 선행 의존: Queue Version 은 상위 Queue(§22·PRESENT이나 무버전)에 딸리는 불변 스냅샷 계약이다. 스냅샷 대상인 membership(§24·ABSENT)·routing(§26·ABSENT)·authority(선행 축2·ABSENT)·legal entity/organization(선행 축3·ABSENT) 이 부재하므로 `BLOCKED_PREREQUISITE`.
- cover: 0 (version_number·immutable_hash·정책 스냅샷 어느 것도 없음)

## 4. 확장/구현 방향 (설계)

- Queue Version 은 **순신규**다. 실존 큐(`catalog_writeback_job`)를 통합할 때 반드시 append-only immutable 버전 원장을 함께 신설 — 큐 정책 변경 시 새 version_number+previous_version_id+immutable_hash 를 발급하고 과거 버전을 재작성하지 않는다(§58 "과거 재작성 금지").
- effective-dating 은 새 상수를 임의 추가하지 말고 `kr_fee_rule.effective_from`(`Db.php:898`) 의 open-interval 질의계층 관용구를 참조해 폐구간(effective_from/effective_to)으로 확장(균질화 아님·선례 재사용).
- immutable_hash 무결성 정본은 `SecurityAudit::verify()`(`SecurityAudit.php:56-68`) 패턴을 확장 — `menu_audit_log.hash_chain` 은 tamper-evident 아니므로 인용 금지([[reference_menu_audit_log_not_tamper_evident]]).
- Mandatory Control: 활성 Assignment 는 반드시 특정 queue_version 을 참조해야 하며(§54 Snapshot·§56 Reconciliation "Queue Version↔Active Assignment"), 버전 없는 큐로의 claim/decision 은 §58/§60 런타임 차단 대상.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].

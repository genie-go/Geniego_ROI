# DSAR — Decision Commit Revalidation (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§32 COMMIT_REVALIDATION** — Commit 직전 Critical 재검증. Validation Result의 무기한 재사용을 막고 Validation↔Commit 사이 Drift(§51)를 차단한다.

재검증 항목(원문 전사):
Validation Result 유효기간 · Context Hash 불변 · Instance Version 일치 · Assignment Version 일치 · Step Version 일치 · Cursor Version 일치 · Actor Eligible · Claim Active · Lease 미만료 · Authority Active · Delegation Active · Security Suspension 없음 · SoD/CoI 신규 없음 · 동일 Slot Committed 없음 · Lock/Fencing 최신.

근거: §26 "무기한 재사용 금지·Commit 직전 Critical 재검증" · §44 Optimistic Version(Mismatch 시 자동 Commit 금지→Revalidation) · §51 Drift(Validation↔Commit 사이 Drift 시 Commit 차단).

## 2. 기존 구현 대조

- **재검증 단계 전면 부재.** 4개 핸들러는 Validation 자체가 없으므로 Commit 직전 재검증도 없다 — 결정은 단일 UPDATE로 즉시 확정(`Mapping.php:288` · `AdminGrowth.php:1330` · `Alerting.php:594` · `Catalog.php:2397`).
- 부분적 재확인 상당물:
  - `Mapping::approve`: 자기승인 차단(`Mapping.php:268`)·dedup(`Mapping.php:278`)·정족수 maker-checker(`Mapping.php:287`)는 존재하나, 이는 **append 시점 1회 검사**이며 read(`Mapping.php:273`)→UPDATE(`Mapping.php:288`) 사이에 **트랜잭션이 없어 재검증이 아니라 TOCTOU 구멍**이다.
  - `AdminGrowth::approvalDecide`: 이미처리 409(`AdminGrowth.php:1327`)로 재확정만 부분 차단.
  - `Catalog::approveQueue`: CAS-lite `WHERE status`(`Catalog.php:2397`)만.
- Context Hash 불변 · Assignment/Step/Cursor Version 일치 · Lease 미만료 · Authority/Delegation Active · "동일 Slot Committed 없음" 재검증 — **grep 없음(no hits)**. 애초에 Slot(§13)·Assignment(§3.4)·Authority(§3.2)·Delegation(§3.3)이 선행 부재.

## 3. 판정

- Verdict: **ABSENT** (Commit 직전 재검증 없음 · 실위험)
- 선행 의존: §3.2 Authority · §3.3 Delegation · §3.4 Assignment · §3.5 Sequential — 재검증할 상태 축(Assignment/Authority/Delegation/Cursor Version)이 선행 부재 → **BLOCKED_PREREQUISITE**.
- cover: 0

## 4. 확장/구현 방향 (설계)

- Commit Revalidation은 §31 Commit Request 수신 후 §33 Commit 트랜잭션 진입 직전에 실행되는 강제 게이트로 신설. Validation Result가 만료·Context Hash 변경·Version Mismatch·"동일 Slot Committed 존재" 중 하나라도 걸리면 **Fail-closed로 Commit 차단**(§44 자동 Commit 금지→Revalidation).
- **Mandatory Control(무후퇴)**: 현행 `Mapping::approve`의 정족수(`Mapping.php:287`)·자기승인 차단(`Mapping.php:268`)·dedup(`Mapping.php:278`)은 Commit Revalidation의 검증 항목으로 흡수·승격하되 제거 금지(§70 무회귀). 단 append 1회 검사를 **트랜잭션 내 재검증**으로 이동해야 실효.
- **실위험(핵심)**: 현행은 재검증이 없어 Validation과 Commit 사이 Drift가 무방비다. `Mapping.php:288` 무트랜잭션 TOCTOU가 대표 발현 — 두 승인자가 동시 read→append→UPDATE 시 마지막 쓰기가 앞을 덮어 정족수/중복 검사가 무력화될 수 있다. Commit Revalidation은 이 창을 봉인하는 필수 장치다.
- 실 구현 = 별도 승인 세션. 본 문서는 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].

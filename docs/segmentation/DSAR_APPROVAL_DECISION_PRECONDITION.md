# DSAR — Approval Decision Precondition (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`§23 PRECONDITION` — Command 처리 이전 만족되어야 하는 전제(원문 전사):

Decision Instance 존재 · Version Active · Case/Work Item Active · Sequential Step 존재 · Decision 가능상태 · Cursor 가리킴 · Assignment 존재/Active · Actor=Assignee/Delegate · Claim/Lease 조건 · Lock 획득가능 · Authority/Delegation Active · Tenant/Legal Entity/Org/Resource 일치 · Action 허용 · Amount/Currency · Security/SoD/CoI 통과 · Expected Version 일치 · Idempotency/Replay 통과 · **동일 Slot Committed 없음**.

## 2. 기존 구현 대조

전제의 일부는 **핸들러 인라인 상태가드**로 실존하나, 대부분의 전제는 부재다.

**실존(인라인 상태가드만)**:
- **이미처리/중복 Committed 방지**: `AdminGrowth::approvalDecide`(:1327) — 이미 처리된 요청이면 409 반환. §23의 "동일 Slot Committed 없음"·"Decision 가능상태"에 해당하는 인라인 전제. pending 중복방지도 별도 존재(:1292).
- **상태 전제 게이트**: `Mapping.php:262` — 승인 결정 진행 전 대상 상태를 인라인으로 점검하는 상태가드(같은 `Mapping::approve` 범위 :238-293 내). 자기승인차단(:268)·dedup(:278)·정족수(:287)와 함께 전제의 부분치.
- **Actor fail-closed 전제**: `Mapping`(:36-53) actor 미확인 시 null → :247 403. "Actor=Assignee/Delegate" 전면 검증은 아니나 무주체 진행을 막는 전제.

**부재(전제 미형식화)**:
- Decision Instance/Version Active/Case/Work Item/Sequential Step/Cursor 전제 — 선행 Sequential(§3.5 ABSENT·하드코딩 status flip `AgencyPortal.php:381,400`)·Instance 부재로 검증 대상 자체 없음.
- Assignment 존재/Active·Actor=Assignee/Delegate — Assignment(§3.4 ABSENT)·Delegation(§3.3 ABSENT).
- Claim/Lease·Lock·Expected Version·Idempotency/Replay 전제 — 결정 도메인에는 부재(omni_outbox·Paddle 멱등은 인접 재사용 자산일 뿐 결정 전제로 배선 안 됨).
- 자기 슬롯의 "동일 Slot Committed 없음"은 `Mapping`의 in-place UPDATE(:288)가 **트랜잭션 없이**(TOCTOU) 수행되어, 전제 점검과 커밋 사이가 원자적이지 않다.

## 3. 판정

- Verdict: **PARTIAL** — 인라인 상태가드만 존재(`AdminGrowth.php:1327` · `Mapping.php:262`), 형식화된 Precondition 집합 없음.
- 선행 의존: §3.4 Assignment · §3.3 Delegation · §3.5 Sequential(전부 ABSENT). Precondition 27항 중 다수가 이 축들의 부재로 검증 불가.
- cover: 인라인 전제 소수(이미처리 409·상태가드·actor fail-closed). 나머지 전제 = 0.

## 4. 확장/구현 방향 (설계)

- **인라인 → 선언적 승격**: `AdminGrowth.php:1327`·`Mapping.php:262`의 흩어진 상태가드를 §24 Guard 집합으로 승격하여 Precondition을 Versioned Policy로 저장(§25 파이프라인 순서와 정합).
- **TOCTOU 제거**: `Mapping::approve` 읽기(:273)→UPDATE(:288) 사이 트랜잭션 부재가 "동일 Slot Committed 없음" 전제를 깨뜨린다. Precondition 재검증은 Commit 직전 원자 경계 안에서 수행(§32 Commit Revalidation·§48 Transaction Boundary).
- **Fail-closed 원칙 유지·확장**: `Mapping`의 미확인 actor→403(:247) 패턴을 전 전제로 확장 — 어느 Mandatory Precondition이라도 미충족 시 결정 차단.
- 선행 6군(Assignment/Delegation/Sequential) 신설 전에는 전제 대부분이 항구적 미검증 → 선행 신설 후 별도 승인 세션. 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].

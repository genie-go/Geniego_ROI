# DSAR — Sequential Approval Stage Status (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§13 STAGE_STATUS enum (원문 전사·16종):

1. NOT_CREATED
2. CREATED
3. NOT_READY
4. READY
5. ACTIVE
6. WAITING
7. TRANSITION_PENDING
8. COMPLETION_PENDING
9. COMPLETED
10. SKIPPED
11. PAUSED
12. SUSPENDED
13. BLOCKED
14. FAILED
15. CANCELLED
16. ARCHIVED

## 2. 기존 구현 대조

- **Stage Status 상태집합 부재.** 16종 상태를 가진 Stage Instance 자체가 ABSENT([[DSAR_APPROVAL_SEQUENTIAL_STAGE_INSTANCE]]) — Stage 개념이 backend 전무(`current_stage/stage_order/approval_stage` 0)이므로 그 상태 enum도 부재.
- 16종 중 대응 상태가 실존하는 것은 없다: TRANSITION_PENDING/COMPLETION_PENDING이 가리킬 단계 전이·완료 진행 개념 ABSENT, READY/NOT_READY가 가리킬 단계 활성화 준비 판정(§31 Stage Activation) 부재. 실존 상태는 잡/승인의 flat 자유문자열(`Catalog.php:80`·`AdminGrowth.php:146`)로 Stage 라이프사이클과 무관하다.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Stage Instance([[DSAR_APPROVAL_SEQUENTIAL_STAGE_INSTANCE]] ABSENT) 및 Stage 활성화/전이/완료 판정(§31 Activation·§25 Current Resolution) 부재에 종속.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규 enum**. §17 State 원칙에 맞춰 각 상태의 terminal/waiting/mutable·transition allowed 를 선언하고 허용 전이만 정의 — 임의 `status=next` 변경 금지.
- **Mandatory Control**: SKIPPED는 Optional Stage에만·Mandatory Stage Skip 금지(§35). BLOCKED/SUSPENDED 진입은 §40 Block Reason·§39 Suspension Reason으로만, 해제는 Revalidation 후 Transition으로만(상태 임의 덮어쓰기 금지). COMPLETED 진입은 Completion Event+Snapshot 병행 검증(§28) 후에만.
- **선결**: Stage Instance 신설과 동반. 본 문서는 설계 명세.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].

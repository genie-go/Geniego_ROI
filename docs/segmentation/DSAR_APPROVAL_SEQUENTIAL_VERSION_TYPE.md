# DSAR — Sequential Approval Version Type (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§10 VERSION_TYPE enum (원문 전사·12종):

1. INITIAL
2. STAGE_CHANGE
3. LEVEL_CHANGE
4. STEP_CHANGE
5. ORDER_CHANGE
6. DEPENDENCY_CHANGE
7. TRANSITION_CHANGE
8. GUARD_CHANGE
9. SKIP_POLICY_CHANGE
10. RECOVERY_POLICY_CHANGE
11. CORRECTION
12. MIGRATION

## 2. 기존 구현 대조

- **버전 타입 enum 부재.** 순차 승인 정의 version이 "무엇이 바뀌었나"(Stage/Level/Step/Order/Dependency/Transition/Guard/Skip/Recovery)를 분류하는 enum은 물론, 상위 version 엔티티 자체가 부재([[DSAR_APPROVAL_SEQUENTIAL_VERSION]] ABSENT).
- 12종 중 대응 대상이 실존하는 것은 없다: STAGE/LEVEL/STEP/ORDER_CHANGE가 가리킬 Stage/Level/Step·순서 개념이 backend 전체 no hits(`current_step/stage/level/step_order/sequence_no` 0), TRANSITION/GUARD_CHANGE가 가리킬 Transition Definition·Guard 레지스트리 ABSENT, DEPENDENCY_CHANGE가 가리킬 Dependency 개념 ABSENT, SKIP/RECOVERY_POLICY_CHANGE가 가리킬 정책 레지스트리 ABSENT([[DSAR_APPROVAL_SEQUENTIAL_POLICY]]).

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: version 엔티티([[DSAR_APPROVAL_SEQUENTIAL_VERSION]]) 및 그것이 분류하는 변경 대상 축들(Stage/Level/Step/Transition/Guard/Dependency/Skip/Recovery 정책) 부재에 종속.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규 enum**. 확장 가능 카탈로그로 정의(하드코딩 DB ENUM 금지 — 신규 타입 INSERT 예외 선례 반복 회피).
- **Mandatory Control**: 모든 version은 INITIAL로 시작하고 이후 변경은 정확한 change 타입으로 기록. CORRECTION/MIGRATION은 audit 상 별도 취급(과거 재작성 아님을 명시·§54 Replay 원칙). version_type은 change_summary·해당 스냅샷 delta(§10 필드 7–15)와 정합해야 한다.
- **선결**: version 엔티티 신설과 동반. 본 문서는 설계 명세.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].

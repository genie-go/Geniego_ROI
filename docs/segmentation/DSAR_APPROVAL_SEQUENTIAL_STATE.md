# DSAR — Sequential State (State 정의) (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§17 STATE 필수 필드:
- state_id · code · name · category · terminal · active · waiting · mutable
- assignment allowed · claim allowed · decision allowed · transition allowed · retry allowed · recovery allowed
- snapshot required · audit required
- status · evidence

CATEGORY enum: INITIAL / READY / ACTIVE / WAITING / TRANSITIONAL / PAUSED / SUSPENDED / BLOCKED / COMPLETED / FAILED / CANCELLED / ARCHIVED.

## 2. 기존 구현 대조

- **명시적 State 정의가 없다.** 상태는 전부 자유문자열 컬럼에 인라인 하드코딩돼 있고, 상태별 능력(terminal/waiting/mutable·assignment/claim/decision/transition/retry/recovery allowed)을 선언하는 **State 정의 테이블·레지스트리가 전무**(§GROUND_TRUTH 개념별 판정: State Machine ABSENT).
  - `catalog_writeback_job.status VARCHAR(30)` 자유문자열(`Catalog.php:80`) — 허용상태/전이제약을 스키마가 강제하지 않음.
  - `admin_growth_approval.status VARCHAR(20)`(`AdminGrowth.php:146`) — pending/approved/rejected 는 코드 분기(`AdminGrowth.php:1330-1341`)에만 존재·상태 능력 선언 없음.
  - `mapping_change_request.status`(`Mapping.php:287`) — 정족수 계산 결과 파생값.
- 상태의 terminal/mutable 여부, transition allowed 여부가 **데이터가 아니라 PHP if/elseif 산재 로직**(`AdminGrowth.php:1327` 이미처리 409·`Mapping.php:262` 재승인 409·`:268` 자기승인 차단)으로 흩어져 있다. 이는 State 정의가 아니라 하드코딩된 암묵 규칙이다.
- **★ 키트 규율 2/6**: status 문자열이 존재해도 그것은 State 가 아니다("status 컬럼 존재 ≠ State Machine").

## 3. 판정

- Verdict: **ABSENT** (명시 State 정의 없음 · 하드코딩 status 문자열만 존재)
- 선행 의존: 독립 신설 가능하나 실사용은 Step/Level/Stage Instance(§13~§15·전부 ABSENT)와 Transition Definition(§19·ABSENT)에 의존
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규 State 정의 테이블.** 상태 능력을 데이터로 선언(terminal/active/waiting/mutable·assignment/claim/decision/transition/retry/recovery allowed·snapshot/audit required)하고, 런타임 전이 가드가 문자열 비교 대신 이 플래그를 조회하도록 한다.
- **하드코딩 산재 규칙의 정형화 대상(재구현 아님)**: `admin_growth_approval` 이미처리 409(`AdminGrowth.php:1327`)·`mapping_change_request` 재승인 409(`Mapping.php:262`)·자기승인 차단(`Mapping.php:268`)에 흩어진 암묵 상태 규칙을 State 정의의 `transition allowed`·`decision allowed`·SoD 로 승격(CONSOLIDATION). 기존 동작 무후퇴 유지.
- **Mandatory Control**: `snapshot required`·`audit required` 상태는 SecurityAudit::verify(`SecurityAudit.php:56-68`) 감사무결 substrate 위에 배선 — 승인 상태 변경은 감사 증적 필수.
- **주의**: State 정의 자체는 참조 데이터라 선행 5군 없이 정의는 가능하나, 상태를 소비할 Instance/Transition 이 전부 ABSENT 이므로 **가동은 BLOCKED_PREREQUISITE**.

관련: [[DSAR_APPROVAL_SEQUENTIAL_TRANSITION_DEFINITION]] · [[DSAR_APPROVAL_SEQUENTIAL_STEP_STATUS]] · [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].

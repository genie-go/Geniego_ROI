# DSAR — Precondition (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §22 PRECONDITION — 예시 목록
Instance 존재 · Active Version · Stage/Level Ready|Active · Step Expected State · 이전 Mandatory 완료 · Blocking Dependency 완료 · Work Item/Assignment 존재/유효 · Claim/Lease 조건 · Authority/Delegation 유효 · Tenant/Legal Entity 일치 · Security/SoD/CoI 통과 · Lock 획득 · Fencing 최신 · Idempotency 유효.

### 필드
precondition_id · transition definition id · code · name · evaluation order · mandatory · evaluator reference · failure code · status · evidence.

## 2. 기존 구현 대조

- **선언적 Precondition 테이블 ABSENT.** precondition_id·transition definition id·evaluation order·evaluator reference·failure code 를 가진 전이 사전조건 레지스트리는 없다.
- **암묵 상태 사전조건 = 결정 직전 status 체크 + 409.** 두 지점만 실존:
  - admin_growth_approval: 이미 처리된 요청 재결정 차단 — 현재 status 검사 후 **409 반환**(`AdminGrowth.php:1327`), 통과 시에만 `pending→approved|rejected` UPDATE(`:1330`).
  - mapping_change_request: 동일 승인자 재승인 차단 409(`Mapping.php:262`)·자기승인 차단(`:268`)·dedup(`:279`).
- 이들은 "현재 상태가 전이 가능한가"를 절차적으로 확인하나, **transition definition 에 결속된 재사용 사전조건이 아니라 핸들러 인라인 분기**다. evaluation order·mandatory 플래그·evaluator reference·구조화된 failure code 없음(HTTP 409 문자열 응답뿐).
- **나머지 사전조건 부재**: Stage/Level Ready|Active·이전 Mandatory 완료·Blocking Dependency 완료·Work Item/Assignment·Claim/Lease·Authority/Delegation·Legal Entity·SoD/CoI·Lock 획득·Fencing 최신 — 대응 SoT(다단/Assignment/Authority/Delegation/Fencing) 자체가 ABSENT.

## 3. 판정

- Verdict: **PARTIAL** — 결정 직전 상태체크 409(`AdminGrowth.php:1327`·`Mapping.php:262`)만 존재. 선언적 Precondition 레지스트리·evaluation order·mandatory·evaluator·failure code **없음**.
- 선행 의존: Assignment/Claim/Authority/Delegation/Lock/Fencing 사전조건은 §3.3·§3.4·§49(전부 ABSENT)에 막힘 → **BLOCKED_PREREQUISITE**.
- cover: 부분(재처리 방지·중복승인 방지 상태체크 2종) · 그 외 0

## 4. 확장/구현 방향 (설계)

- 순신규 **precondition 레지스트리**를 transition definition(§19)에 결속. 현재 인라인 409 체크를 명시 Precondition(`INSTANCE_ACTIVE`·`EXPECTED_STATE`·`NOT_DUPLICATE`)으로 승격, failure code 를 §62 Error Contract 코드로 정규화.
- 재사용: `AdminGrowth.php:1327` 상태체크 → `EXPECTED_STATE`/`NOT_ALREADY_PROCESSED` 사전조건 평가기. `Mapping.php:262`(재승인 차단)·`:268`(자기승인=SoD 맹아)·`:279`(dedup) → `SOD_PASS`·`NOT_DUPLICATE` 사전조건의 참조 구현.
- ★Mandatory Precondition Fail Closed(§59). Assignment/Authority/Delegation/Lock/Fencing 사전조건은 선행 SoT 신설 후 실효 — 그 전까지 미충족을 통과로 위장하지 않는다(Fail Closed).

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].

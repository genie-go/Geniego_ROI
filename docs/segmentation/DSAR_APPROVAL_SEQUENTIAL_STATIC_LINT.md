# DSAR — Static Lint (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§60 STATIC_LINT — Definition/Version 배포(활성화) **이전**에 정적으로 차단해야 하는 오류 목록(빌드/승격 타임 게이트):

- Tenant 미지정 / Tenant 불일치
- Version 미고정 · 비활성 Version 참조
- Workflow / Chain 참조 무결성 위반
- Sequence 중복 · Negative/Null Sequence · Parent 내 비유일
- Dependency 정의 순환(Cycle) · 미해결 참조
- Transition 정의 누락 (상태 변경 경로에 Transition Definition 없음)
- Mandatory Guard 제거 / Fail-open 으로 강등
- Assignment / Claim 정책 누락 (assignment required 인데 정책 미정의)
- Skip 정책이 Mandatory Financial/Legal/Compliance/Security 를 스킵 허용
- Retry / Recovery 정책 미정의
- Lock / Fencing / Snapshot / Idempotency 요구가 Transition Definition 에 누락
- Cross-Tenant 참조

## 2. 기존 구현 대조

- **정적 린트가 검사할 Definition/Version 산출물 자체가 없다**: Definition(§9)·Version(§10)·Transition Definition(§19)·Guard(§21)·Dependency(§23) 전부 ABSENT — 배포 전 검사 대상인 "승인 정의 아티팩트"가 존재하지 않는다.
- **워크플로 엔진/DSL/정의 파일 부재**: camunda/temporal/bpmn/state_machine 정의 = ABSENT 전무. 상태전이는 코드에 인라인 하드코딩(`Catalog.php:2397`·`AdminGrowth.php:1330`)이라 정적 분석 대상 정의 파일이 없다.
- **실존 정적 게이트는 도메인 밖**: 리포지토리에 CI 스캔/no-undef 류 게이트는 있으나(승인 순차 상태머신과 무관한 프론트/보안 스캔), §60 이 요구하는 "Sequence 중복·Dependency Cycle·Mandatory Guard 제거·Transition 누락" 승인 정의 린트는 실존하지 않는다.
- Tenant/Cross-Tenant 검증은 런타임 Guard(`UserAuth.php:403-406`)로 일부 존재하나 이는 **정적(배포 전) 린트가 아니라 런타임 가드**(§61) 성격 — §60 정적 게이트로 취급 불가.

## 3. 판정

- Verdict: **미구현 (ABSENT / BLOCKED_PREREQUISITE)** — 정책 명세만 존재, 검사 대상 정의 아티팩트 부재
- 선행 의존: Definition(§9)·Version(§10)·Transition Definition(§19)·Guard(§21)·Dependency(§23) 신설이 선결. 정의가 있어야 정적 린트가 성립.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규**. Static Lint 는 승인 Definition/Version 을 선언형 아티팩트(테이블/DSL)로 만든 **뒤에** 배포 게이트로 붙는다 — 인라인 하드코딩 전이 위에는 얹을 대상이 없다.
- **배포 게이트 위치**: Version 상태(§10) DRAFT → VALIDATION_PENDING → VALIDATION_FAILED/APPROVAL_PENDING 전이의 **VALIDATION 단계**에 정적 린트를 강제 — 린트 실패 시 VALIDATION_FAILED 로 고정, 활성화 차단.
- **Fail Closed**: Sequence 중복·Dependency Cycle·Mandatory Guard 제거·Transition 누락은 경고가 아니라 **배포 불가(hard block)**.
- **런타임 가드와 분리**: §60(정적·배포 전) 과 §61(런타임) 은 역할 분리 — Cross-Tenant 는 양쪽에서 각각 검사(정적=정의 참조 무결성, 런타임=요청 시점 테넌트 일치).
- **BLOCKED_PREREQUISITE**: 선행 5군 + Definition/Version/Transition 신설 후.

관련: [[DSAR_APPROVAL_SEQUENTIAL_RUNTIME_GUARDS]] · [[DSAR_APPROVAL_SEQUENTIAL_CRITICAL_GAP_POLICY]] · [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].

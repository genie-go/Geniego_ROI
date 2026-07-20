# DSAR — Authorization Digital Twin Instance (Part 3-22 §2·§3)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC §2)

**APPROVAL_TWIN_INSTANCE**는 Registry에 등록된 트윈의 **런타임 구현체**를 정의하는 계약이다. 한 인스턴스는 특정 시점의 authz 결정 표면(현행 role rank·scope·정책 평가 로직)을 **격리된 read-only 복제**로 실체화하며, 예측 시뮬레이션(정책 변경 what-if, 승인 회귀)이 실행되는 물리적 경계다. 인스턴스는 원본에 대한 쓰기 부작용 없이 결정을 재현·투영한다.

인스턴스 필수 속성:

| 속성 | 의미 |
|------|------|
| Instance ID | 트윈 인스턴스 실체 식별자(Registry Twin Identifier에 종속) |
| Bound Twin | 소속 Registry 트윈 |
| Materialization | event-replay 재구성 / snapshot 로드 |
| Isolation Boundary | 원본 authz 표면과의 쓰기 격리 경계 |
| Freshness | 마지막 동기화 시점·lag |
| Lifecycle | provisioning / active / draining / retired |

## 2. 실존 substrate 매핑

| 요소 | 상태 | 근거 |
|------|------|------|
| authz Twin Instance(read-only 복제 실체) | **ABSENT** | grep 0 — 트윈 인스턴스 실체·격리 복제·materialization 개념 전무 |
| 현행 dual-PDO 커넥션 팩토리 | PRESENT(트윈 아님) | `backend/src/Db.php:63-87` |
| demo 환경 커넥션 분기 | PARTIAL(별개 env) | `backend/src/Db.php:20-21` · `backend/src/Handlers/AdminPlans.php:53` |
| 메시지 브로커(인스턴스 동기화) | **ABSENT** | `backend/composer.json:5-13` |

★**현행 dual-PDO(`Db.php:63-87`)는 트윈 인스턴스가 아니다.** 이는 production/demo 두 **별개 라이브 env**에 대한 커넥션 분기(`Db.php:20-21`)일 뿐, 원본 결정 표면의 read-only 복제가 아니다. 두 커넥션 모두 실 쓰기 대상이며, 하나가 다른 하나의 mirror·replay 복제도 아니다 — **twin instance 오판 금지**.

## 3. 설계 계약(규칙)

- (R1) 인스턴스는 반드시 Registry 트윈에 bound. 고아 인스턴스 금지.
- (R2) Materialization은 event-replay 또는 snapshot 중 명시. 미명시 인스턴스는 active 승격 불가.
- (R3) Isolation Boundary는 원본 authz 표면에 대한 쓰기 경로 0을 계약으로 보장.
- (R4) Freshness lag이 정책 임계를 초과한 인스턴스는 자동 draining, 예측 결과 무효화.
- (R5) dual-PDO 커넥션은 Twin Instance로 승격 금지 — 별개 라이브 env 커넥션이지 read-only 복제 아님.

## 4. 판정

**NOT_CERTIFIED · ABSENT-greenfield.** APPROVAL_TWIN_INSTANCE는 순신설이다. 트윈 인스턴스(read-only 복제 실체) 전무(grep 0). 현행 dual-PDO(`Db.php:63-87`)·demo 분기(`Db.php:20-21`·`AdminPlans.php:53`)는 별개 라이브 env로 twin 아님 — KEEP_SEPARATE. 동기화 브로커 부재(`composer.json:5-13`) → BLOCKED_PREREQUISITE. 코드 변경 0.

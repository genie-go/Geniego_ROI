# DSAR — API Contract (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§68 API_CONTRACT — Sequential Approval API 표면과 **모든 엔드포인트에 강제되는 공통 관심사**.

### 1.1 엔드포인트 표면 (리소스별)
1. **Registry / Policy 조회** — Registry(§7)·Policy(§8) read.
2. **Definition / Version CRUD** — Definition(§9)·Version(§10) 생성·조회·수정·상태전이.
3. **Instance** — 생성 / 초기화 / 조회 / Current State 조회 / Cursor 조회 / Pause / Resume / Suspend / Block / Retry / Recovery.
4. **Stage / Level / Step** — 생성 / Ready / Activate / Complete Reference / Skip / 조회. (Step 추가: Assignment 연결 / Claim / Decision Reference.)
5. **Progression** — Current Resolve / Next Resolve / Advancement.
6. **Transition** — 실행 / 상태 조회 / Idempotency / Lock / Cursor / Conflict.
7. **Snapshot / Replay / Simulation**.
8. **Reconciliation** — Workflow / BPMN / ERP / Cursor / State / Assignment / Completion 비교 · Drift / Manual / History.

### 1.2 공통 관심사 (전 엔드포인트 강제 — 전사)
1. Tenant Context
2. Authorization
3. Idempotency
4. Expected Version
5. Optimistic Lock
6. Transition Lock
7. Fencing Token
8. Effective Date Validation
9. Sequential Version Validation
10. Workflow Version Validation
11. Chain Version Validation
12. Assignment Guard Validation
13. Authority Guard Validation
14. Delegation Guard Validation
15. State Guard Validation
16. Snapshot
17. Audit
18. Evidence
19. Rate Limit
20. Pagination
21. Error Contract (§62/§63)

## 2. 기존 구현 대조

- **Sequential Approval API 표면 부재**: 워크플로 엔진·전용 핸들러 클래스(`*{Workflow,Approval,StateMachine,Sequence,Orchestrat}*.php`) **No files**(§GROUND_TRUTH 워크플로 엔진). Registry/Policy/Definition/Version/Instance/Stage/Level/Step/Progression/Transition/Snapshot/Replay/Simulation/Reconciliation 리소스를 노출하는 라우트 없음.
- **공통 관심사 substrate — 부분만 실존**:
  - Tenant Context(1): Tenant Guard `UserAuth.php:403-406` PRESENT — 신규 API가 재사용할 substrate.
  - Authorization(2): 정적 role 서열 `TeamPermissions.php:120,136`(roleOf/isManagerAdmin) — Authority Matrix 아님(§3.2 ABSENT).
  - Idempotency(3): PARTIAL — 도메인별 UNIQUE만(Paddle `Paddle.php:343-348`·journey_node_sent `JourneyBuilder.php:454,482,490`)·**범용 미들웨어/헤더 없음**.
  - Transition Lock(6): CAS 조건부 UPDATE(`Catalog.php:1726-1730`·`JourneyBuilder.php:415-425`·`ChannelSync.php:6148`)·`FOR UPDATE SKIP LOCKED`(`Omnichannel.php:405`) = **CANONICAL** substrate.
  - Fencing Token(7): **ABSENT**(`fencing` 0·★실위험) — 낮은 fencing token commit 차단 강제 불가.
  - Expected Version / Optimistic Lock(4·5): 낙관적 version CAS **ABSENT**(menu_defaults.version=라벨) — API의 version 충돌 계약 미충족.
  - Assignment/Authority/Delegation Guard(12·13·14): 선행 5군 §3.2/§3.3/§3.4 **ABSENT** — 검증 대상 SoT 없음.
  - Audit(17): SecurityAudit::verify(`SecurityAudit.php:56-68`) = 감사무결 substrate PRESENT.
- 실존 인접 API는 **도메인 특화**(승인값 `Catalog.php:2300` approvalCreate·`:395` requiresHighValueApproval·admin_growth 승인 `AdminGrowth.php:1330`·mapping 정족수 `Mapping.php:287`)로 Sequential API 계약과 상이.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Approval Chain(§3.1)·Authority(§3.2)·Delegation(§3.3)·Assignment(§3.4) — 리소스 표면(Registry~Reconciliation) 대부분이 참조할 SoT 부재. 공통 관심사 중 Fencing/Optimistic Lock/범용 Idempotency도 부재.
- cover: 0

## 4. 확장/구현 방향 (설계)

- **순신규 API 계층**. 다단 Stage/Level/Step Instance·Cursor(§45)·Transition Lock(§46)·Lease(§47)가 선행되어야 리소스 표면이 성립.
- **공통 관심사 = Mandatory Control**: 21개 공통 관심사는 개별 엔드포인트 재량이 아니라 API 게이트웨이/미들웨어 계층에서 **일괄 강제**(Fail Closed). Tenant Context·Expected Version·Fencing Token·Idempotency는 write 계열 전 엔드포인트에서 우회 불가.
- **확장 substrate**: Tenant Guard(`UserAuth.php:403-406`)를 Tenant Context(1)로, CAS/SKIP LOCKED(CANONICAL)를 Transition Lock(6)으로, SecurityAudit::verify(`SecurityAudit.php:56-68`)를 Audit(17)의 무결 기반으로 재사용. JourneyBuilder 멱등(`JourneyBuilder.php:446-490`) 패턴을 범용 Idempotency(3) 설계 참조정본으로 인용(단 승인 도메인 격리·KEEP_SEPARATE).
- **★실위험**: Fencing Token(7)·Optimistic Lock(5)·범용 Idempotency(3) ABSENT — 이 셋 없이 write API를 열면 stale worker overwrite·중복 transition·version 충돌이 계약 위반으로 관측된다. 세 primitive 신설이 API 개설의 선결.
- **BLOCKED_PREREQUISITE**: 선행 4군 + Fencing/Optimistic/범용 Idempotency 신설 전 실 구현 불가.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].

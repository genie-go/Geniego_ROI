# DSAR — Stage Activation (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§31 STAGE_ACTIVATION — Stage 활성화 검증 및 후속:

**검증(Precondition)**
- Instance Active
- Parent(상위 스코프) Active
- Previous Blocking(이전 Stage) 완료
- Guard/Dependency 통과
- Cursor 일치
- 중복 Active Stage 없음
- Instance 가 Pause/Suspend/Block 아님
- Lock 획득 / Fencing Token 최신 / Idempotency 유효

**후속(Post-activation)**
- Stage Status = Active
- Cursor 갱신
- 하위(첫 Level) 활성화
- Snapshot 생성
- Audit 기록

## 2. 기존 구현 대조

- **Stage Instance 부재**(§GROUND_TRUTH): `stage/current_stage/stage_order` 0 hits. Stage 라는 순차 계층이 실존하지 않아 활성화 대상이 없음.
- **Guard/Dependency 레지스트리 부재**(§21/§23): Guard·Dependency 를 선언·평가하는 자산 없음 — 검증 조건 다수가 참조 실체 없음.
- **Cursor 부재**(§45): Cursor 갱신·일치 검증 불가.
- **Lock/Fencing/Idempotency**: Lock 은 CAS/SKIP LOCKED(`Catalog.php:1726`·`Omnichannel.php:405`)로 부분 substrate 존재하나 Fencing Token 은 ABSENT(★실위험), 범용 Idempotency 는 PARTIAL(도메인 UNIQUE 만).
- **Snapshot 부재**(§52): 활성화 Snapshot(STAGE_ACTIVATION type) 생성 자산 없음. SecurityAudit::verify(`SecurityAudit.php:56-68`)는 감사 무결 substrate 이나 Stage 활성화 스냅샷과 무관.
- 실존 상태전이 3종은 단발/정족수 승인으로 Stage 계층 전이 아님.

## 3. 판정

- Verdict: **ABSENT · BLOCKED_PREREQUISITE**
- 선행 의존: Approval Chain(§3.1)의 Stage 정의 부재 → 활성화할 Stage 없음. Guard/Dependency 레지스트리·Cursor·Fencing 부재로 검증 조건 미충족.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규. Stage Instance(§13) + Cursor(§45) + Guard(§21)/Dependency(§23) 레지스트리 선행 필수.
- **Mandatory Control**: 중복 Active Stage 금지를 Unique Active State Constraint(§51)로, Cursor 일치를 Fencing Token(§49)로 강제 — Fencing 없는 활성화는 stale worker 이중 활성 위험(§43 Orphan / §56 Conflict).
- 확장 substrate: CAS/SKIP LOCKED(CANONICAL)를 Transition Lock 획득에 재사용. Snapshot 은 immutable_hash 기반 순신규(§52 원칙: 직접수정·과거대체 금지).
- 후속의 "하위 첫 Level 활성화"는 §32 Level Activation 과 원자적 연쇄로 설계하되 각 단계 Transition Instance 로 개별 커밋.
- **BLOCKED_PREREQUISITE**: 선행 5군(특히 Approval Chain) 신설 전 실 구현 불가 — 별도 승인세션.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].

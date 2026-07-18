# DSAR — Transition Instance / Result (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §20 TRANSITION_INSTANCE 필수 필드
instance_id · def_id · sequential_instance_id · stage/level/step instance id · source/target state · triggering event id · transition sequence · expected/actual aggregate version · lock id · lease id · fencing token · idempotency record id · guard/precondition/assignment/authority/delegation validation result · transition result · failure code · retry count · started/committed/failed_at · immutable_hash · status · evidence.

### §20 TRANSITION_RESULT enum (전사)
`APPLIED` · `ALREADY_APPLIED` · `REJECTED` · `BLOCKED` · `RETRYABLE_FAILURE` · `NON_RETRYABLE_FAILURE` · `CONFLICT` · `STALE_FENCING_TOKEN` · `VERSION_MISMATCH` · `GUARD_FAILED` · `PRECONDITION_FAILED` · `SNAPSHOT_FAILED` · `AUDIT_FAILED` · `ROLLED_BACK_INTERNAL` · `MANUAL_REVIEW_REQUIRED`.

## 2. 기존 구현 대조

- **Transition Instance(전이 인스턴스) 개념 ABSENT.** 상태전이 3종은 모두 인라인 조건부 UPDATE로 즉시 커밋되며, 전이를 1급 레코드로 적재하지 않는다: catalog_writeback_job 선점 `Catalog.php:1726`(`SET status='processing' WHERE id=? AND status IN(...)`)·복구 `:1700`·승인 `:2397`, admin_growth_approval 단발결정 `AdminGrowth.php:1330`, mapping_change_request 정족수 도달 `Mapping.php:287`.
- **Transition Result enum ABSENT.** 위 UPDATE들이 반환하는 것은 PDO **affected-rows 정수**(CAS 성공/실패 판정, `Catalog.php:1726-1730`)뿐이다. `APPLIED/ALREADY_APPLIED/CONFLICT/STALE_FENCING_TOKEN/…` 같은 명시 결과 코드·failure_code·retry_count 필드·transition_sequence·immutable_hash 는 어디에도 없다.
- **연동 필드 부재**: lock id/lease id 부분 substrate(claimed_at+TTL `Omnichannel.php:395-399`)는 있으나 전이 인스턴스에 결합되지 않고, **fencing token·idempotency record id·expected/actual aggregate version 은 ABSENT**(`fencing` no hits·낙관적 version CAS 부재).
- 선행 의존인 **Transition Definition(§19)·State Machine 자체가 ABSENT** 이므로, 그 인스턴스인 Transition Instance/Result 는 참조할 정의가 없다.

## 3. 판정

- Verdict: **ABSENT** (전이는 실행되나 1급 Transition Instance 레코드도 Result enum도 없음 — affected-rows 정수만 존재)
- 선행 의존: §19 Transition Definition 부재 + §3.1 Approval Chain/Workflow ABSENT → 정의 없는 인스턴스는 성립 불가(**BLOCKED_PREREQUISITE**). 추가로 §49 Fencing Token·범용 §48 Idempotency·낙관적 version CAS ABSENT.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규 엔티티. **transition_instance 테이블 + TRANSITION_RESULT 15코드 enum**을 정의하고, 모든 상태 변경을 인라인 UPDATE가 아니라 전이 인스턴스 append + 결과 코드 기록으로 강제(§67 중복구현·§60/§61 Static Lint/Runtime Guard 대상).
- 재사용 기반: CAS 조건부 UPDATE(`Catalog.php:1726-1730`·**CANONICAL**)를 전이 커밋의 원자 단위로 승격 — affected-rows 0 → `ALREADY_APPLIED`/`CONFLICT` 매핑. JourneyBuilder 원자적 선점 CAS(`JourneyBuilder.php:415-425`)가 결과 판정 패턴의 참조정본.
- ★실위험 무후퇴 필수: `STALE_FENCING_TOKEN`·`VERSION_MISMATCH` 결과는 **Fencing Token(§49)·낙관적 version CAS 신설 없이는 산출 불가** — 현재 부재분이 stale worker overwrite 이론창을 그대로 남긴다. Mandatory Control: 모든 커밋된 전이는 immutable_hash + evidence(§64) 동반, 결과=`APPLIED` 만 하위 진행 허용.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].

# DSAR — Sequential Transition Instance (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§20 TRANSITION_INSTANCE 필수 필드:
- instance_id · def_id · sequential_instance_id · stage/level/step instance id
- source state · target state · triggering event id · transition sequence
- expected aggregate version · actual aggregate version
- lock id · lease id · fencing token · idempotency record id
- guard validation result · precondition validation result · assignment validation result · authority validation result · delegation validation result
- transition result · failure code · retry count
- started_at · committed_at · failed_at · immutable_hash · status · evidence

TRANSITION_RESULT enum: APPLIED / ALREADY_APPLIED / REJECTED / BLOCKED / RETRYABLE_FAILURE / NON_RETRYABLE_FAILURE / CONFLICT / STALE_FENCING_TOKEN / VERSION_MISMATCH / GUARD_FAILED / PRECONDITION_FAILED / SNAPSHOT_FAILED / AUDIT_FAILED / ROLLED_BACK_INTERNAL / MANUAL_REVIEW_REQUIRED.

## 2. 기존 구현 대조

- **전이 인스턴스(전이 1건의 원자적 실행 레코드)가 없다.** 전이는 기록되지 않고 status 컬럼을 즉시 덮어쓴다:
  - `SET status=next WHERE status=current`(`Catalog.php:2397`·`:1726`·`:1700`·`:1710`) — source/target/result/retry count 를 남기는 전이 레코드 없음.
  - `admin_growth_approval` pending→approved|rejected 단발 UPDATE(`AdminGrowth.php:1330`)·이미처리 409(`AdminGrowth.php:1327`).
- **전이 결과(APPLIED/ALREADY_APPLIED/CONFLICT/STALE_FENCING_TOKEN/VERSION_MISMATCH …)를 분류·기록하는 실체 없음.** 실패는 예외/409 로만 표현.
- **동시성 primitive 는 실존(전이 원자성의 substrate·CANONICAL)**:
  - CAS 조건부 UPDATE + rowCount 소유(`Catalog.php:1726-1730`·`JourneyBuilder.php:415-425`).
  - FOR UPDATE SKIP LOCKED(`Omnichannel.php:405`)·claim_id/claimed_at(`Omnichannel.php:97,410,418,560`).
- **그러나 전이 인스턴스가 요구하는 축 3개가 ABSENT**:
  - `fencing token` → **ABSENT**(§GROUND_TRUTH: `fencing` 0·★실위험). `STALE_FENCING_TOKEN` 결과를 판정할 수단 없음.
  - `expected/actual aggregate version`(낙관적 version CAS) → **ABSENT**(`menu_defaults.version`=라벨). `VERSION_MISMATCH` 판정 불가.
  - `lease id` → PARTIAL(claimed_at+TTL 시간회수만·`Omnichannel.php:395-399` 900s·`Catalog.php:1700` 600s·리스토큰/펜싱 없음).
  - `idempotency record id` → PARTIAL(도메인 UNIQUE 만·`Paddle.php:343-348`·`JourneyBuilder.php:454`·범용 없음).

## 3. 판정

- Verdict: **ABSENT** (전이 실행 레코드 없음 · status 덮어쓰기만 · 전이 결과 분류 부재)
- 선행 의존: §19 Transition Definition(def_id) · §17 State(source/target) · §18 Event(triggering event id·idempotency) · §3.2~§3.4 Authority/Delegation/Assignment(validation result 축) · §13~§15 Stage/Level/Step Instance
- cover: **0** (동시성 primitive 는 실존하나 전이 인스턴스 엔티티 자체는 부재 — primitive 는 §46/§47 Lock/Lease 문서의 CANONICAL 근거이지 본 엔티티의 cover 아님)

## 4. 확장/구현 방향 (설계)

- **순신규 전이 인스턴스 테이블 + 실존 primitive 위에 배선(재생성 금지)**: CAS(`Catalog.php:1726-1730`)·SKIP LOCKED(`Omnichannel.php:405`)를 전이 Commit 의 원자성 기반으로 사용. `transition result=APPLIED/ALREADY_APPLIED` 는 rowCount CAS 로 자연 파생.
- **★실위험 3종 해소가 전제**:
  - Fencing Token 신설(§49) — 없으면 `STALE_FENCING_TOKEN` 판정 불가·stale worker overwrite 이론창(§GROUND_TRUTH 실위험 ①).
  - 낙관적 version CAS 신설(§51) — `expected/actual aggregate version` 으로 `VERSION_MISMATCH`·Concurrent Transition 차단.
  - 범용 Idempotency Key(§48) — `ALREADY_APPLIED`·중복 전이(§50) 흡수.
- **immutable_hash + audit**: 전이 인스턴스는 불변 해시로 봉인하고 SecurityAudit::verify(`SecurityAudit.php:56-68`) substrate 로 감사무결 보장. `AUDIT_FAILED`·`SNAPSHOT_FAILED` 는 전이 롤백 트리거.
- **무후퇴·Mandatory Control**: guard/precondition/assignment/authority/delegation validation result 가 모두 PASS 여야 APPLIED. 하나라도 미충족 시 GUARD_FAILED/PRECONDITION_FAILED/BLOCKED → 상태 임의 덮어쓰기 금지(§42).
- 실 구현 = 선행 5군 + Fencing/Version/Idempotency 신설 후 별도 승인세션 → **BLOCKED_PREREQUISITE**.

관련: [[DSAR_APPROVAL_SEQUENTIAL_TRANSITION_DEFINITION]] · [[DSAR_APPROVAL_SEQUENTIAL_EVENT]] · [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].

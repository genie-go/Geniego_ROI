# DSAR — Optimistic Version (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### OPTIMISTIC_VERSION (§44)

Expected Version 검증 대상: `Decision Instance`·`Case`·`Work Item`·`Assignment`·`Claim`·`Lease`·`Sequential Step`·`Cursor`·`Decision Policy`.

★ 규칙: **Mismatch 시 자동 Commit 금지 → Revalidation**(§32 Commit Revalidation 으로 회귀).

## 2. 기존 구현 대조

### 결정 도메인 = ABSENT (version 컬럼 0)
- 승인 4핸들러에 **expected version 을 UPDATE 조건에 넣는 낙관적 동시성 제어가 없다**. version 컬럼 자체가 결정 행에 부재.
- `Mapping::approve`(`Mapping.php:238-293`) — approvals_json read(`:273`) 후 무조건 UPDATE(`:288`). read 시점 버전과 write 시점 버전 비교 없음 = **TOCTOU**. 두 승인자 동시 진입 시 뒤 쓰기가 앞 쓰기를 덮어씀.
- expected/version 컬럼 기반 조건부 UPDATE = **no hits** (결정 도메인).

### CAS-lite — WHERE status 는 부분적 낙관적 가드
- `Catalog::approveQueue`(`Catalog.php:2383-2407`) — `UPDATE ... status='queued' WHERE status=...`(CAS-lite, `:2397`). 상태 전이를 조건에 넣어 이미 처리된 행 재처리를 억제하나, 이는 **status 값 비교**이지 **단조 version 비교가 아니다**. ABA 문제(같은 status 로 되돌아온 경우)를 막지 못하고, Instance/Assignment/Step 등 §44 의 9개 대상 버전을 검증하지 않는다.
- `AdminGrowth::approvalDecide`(`AdminGrowth.php:1327`) 409 도 status 상태가드일 뿐 version CAS 아님.

## 3. 판정

- Verdict: **ABSENT** (version 컬럼 0) · WHERE status = **CAS-lite**(부분·status 값 한정·9대상 미검증).
- 선행 의존: §12 INSTANCE(`instance version`)·§30 Assignment/§31 Step version 등 버전 소스 엔티티. 버전 컬럼 신설 없이는 낙관적 검증 불가 → **BLOCKED_PREREQUISITE**.
- cover: **0** (Catalog CAS-lite 는 status 한정·단조 version 아님).

## 4. 확장/구현 방향 (설계)

- **순신규 version 컬럼**: §44 의 9개 대상(Instance·Case·Work Item·Assignment·Claim·Lease·Sequential Step·Cursor·Decision Policy) 각각에 **단조 증가 version** 부여. Commit Request(§31)에 `expected_*_version` 을 실어 UPDATE WHERE version=expected 로 검증, mismatch 면 자동 Commit 금지 → Revalidation(§32·§44 ★).
- **CAS-lite 승격**: `Catalog::approveQueue` 의 WHERE status 패턴(`Catalog.php:2397`)을 **버전 CAS 로 확장**(Golden Rule = Extend). status 값 비교 → version 정수 비교로 강화해 ABA 회피.
- **TOCTOU 제거**: `Mapping::approve`(`Mapping.php:273,288`) read-후-무조건-UPDATE 를 expected_version 조건부 UPDATE 로 교체해야 정족수 경합 해소.
- **Fencing 원천**: §44 단조 version 을 §43 Fencing Token 원천으로 재사용해 stale worker 방어와 일관. 실 구현 = 별도 승인 세션.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].

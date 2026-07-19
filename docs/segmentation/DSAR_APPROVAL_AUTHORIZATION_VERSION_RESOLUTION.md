# DSAR — Authorization Version Resolution (06-A-03-02-03-04 · §44)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · §44 Version Resolution · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> ★ file:line 인용 = [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) allowlist 등재분만. 지어내기 금지.

## 1. 원문 전사 (Canonical Contract)

§44 Version Resolution (원문 전사):

`Effective Time 기준 Active Version · Validation↔Commit Version 변경 탐지 · Expected Version · Superseded/Suspended/Future Version 차단 · Overlapping Active 탐지 · Missing Version 차단 · Tenant Scope 불일치 차단.`

의미: Version Resolution은 인가 판정 시점에 **어떤 Definition/Policy Version이 유효(Active)한지를 Effective Time 기준으로 결정론적으로 해석**하는 규칙이다. Superseded(대체됨)/Suspended(정지됨)/Future(미래발효) 버전은 차단하고, 동시에 두 Active 버전이 겹치면(Overlapping) 탐지·차단하며, 요청이 명시한 Expected Version과 실제 Active Version이 다르면(Validation↔Commit 사이 변경) 재검증을 트리거한다. Missing Version·Tenant Scope 불일치도 차단. §5.7(Policy Versioned·과거 Decision 현재 Policy 재해석 금지)·§5.10(Validation↔Commit 분리)의 시간축 봉인이다.

## 2. 기존 구현 대조

- **인가 정책의 버전 해석은 부재** — Definition/Policy에 version number·valid_from/valid_to·status(Active/Superseded/Suspended/Future)를 선언하고 Effective Time으로 Active 버전을 고르는 구조 전무. 인가 규칙이 **코드 상수(하드코딩)**라 버전 개념 자체가 없다.
- GROUND_TRUTH 확정: "**Versioned Policy = ABSENT**"(인가규칙=코드 상수 하드코딩) · roleRank 맵 `index.php:554`·write 게이트 `index.php:568-578`·acl_permission `TeamPermissions.php:39,152-159`·RBAC 서열 `TeamPermissions.php:120-136` 전부 "강제 O·버전 X"로 등재. 정책을 배포(코드 변경) 외 경로로 버전 전환할 수단이 없다.
- **Effective Time 기준 Active Version / Superseded / Suspended / Future Version 차단** → no hits. 정책이 상수라 "발효시각"도 "이전 버전"도 없음.
- **Validation↔Commit Version 변경 탐지 / Expected Version** → no hits. Validation과 Commit을 분리해 그 사이 버전 변화를 탐지하는 개념 부재(§5.10 자체 미구현).
- **Overlapping Active 탐지 / Missing Version 차단** → no hits.
- 유사하나 무관: `schema_migrations` 성격의 마이그레이션 이력은 스키마 버전이지 인가 정책 버전이 아님(본 GROUND_TRUTH 미등재). tenant_security_policy(`UserAuth.php:3580`)·alert_policy(`Db.php:558`)는 정책 데이터 테이블이나 version number·Active/Superseded 상태머신·Effective Time 해석을 갖지 않음.
- Tenant Scope 격리는 부분 실재하나 버전축과 무관: tenant 강제주입 `index.php:590-593,600`·agency 격리 `index.php:74-104`는 요청 tenant를 고정할 뿐, "버전의 Tenant Scope 불일치"를 검증하지 않음.

## 3. 판정

- Verdict: **ABSENT (순신규)**
- 근거: 인가 규칙이 전부 코드 상수(GROUND_TRUTH "Versioned Policy ABSENT")라 버전 번호·유효기간·상태(Active/Superseded/Suspended/Future)·Effective Time 해석의 어느 축도 실재하지 않음. 정책 버전 해석의 입력 데이터가 0.
- 선행 의존: Version Resolution은 Definition(§12)·Definition Version(§13 version number/previous/activated/superseded)·Registry(§7 active version)를 소비 — 이들이 전부 ABSENT라 버전 해석 순신규. 또한 §5.10 Validation↔Commit 분리·Decision(§24)·Commit Binding(§39)이 부재해 "Validation↔Commit Version 변경 탐지"의 두 시점 자체가 없음.
- cover: **0** (인가 정책 버전 선언·Effective Time Active 버전 해석 전무. tenant 격리는 버전축과 직교하므로 계상 제외).

## 4. 확장/구현 방향 (설계)

- 순신규 Version Resolver — Definition Version(§13)에 version number·previous·valid_from/valid_to·status(DRAFT/APPROVED/ACTIVE/SUSPENDED/SUPERSEDED/RETIRED §58)·activated_at/superseded_at를 데이터로 선언하고, Effective Time 기준 유일 Active 버전을 산출. Superseded/Suspended/Future는 차단, Overlapping Active·Missing Version·Tenant Scope 불일치도 차단(§61 Active Version Overlap 방지 제약과 결합).
- §5.7 봉인: 과거 Decision(§24)은 판정 당시 policy set version·definition version을 Snapshot(§34)에 고정 — 현재 버전으로 재해석 금지. Version Resolver는 "판정 시점 버전"과 "현재 Active 버전"을 분리 취급.
- §5.10 봉인: Validation 시 결정된 Expected Version을 Decision Binding(§38)에 봉인, Commit 직전 Commit Binding(§39)에서 Active Version과 대조 → 변경 탐지 시 Revalidation(§47) 트리거(기존 Decision 수정 안 함·새 Decision 연결).
- Golden Rule=Extend: 현 코드 상수 인가 규칙(`index.php:554,568-578`·`TeamPermissions.php:39`)을 Definition Version v1(INITIAL)의 초기 스냅샷으로 이관 — 재구현 아닌 버전 0→1 마이그레이션(§52 Migration Foundation과 결합).
- 실 배선은 후속 Part(이번 Part=설계·확장 포인트만).

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_POLICY_RESOLUTION]] · [[DSAR_APPROVAL_AUTHORIZATION_DRIFT_FOUNDATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].

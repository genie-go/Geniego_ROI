# DSAR — Authorization Index / Performance (§62 / §64)

> EPIC **06-A-03-02-03-04 Part 1** · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · 인용원=GROUND_TRUTH([`DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) 전용.

## 1. 원문 전사 (Canonical Contract)

**§62 Index(대상)**: Registry(Tenant+Code / Status+Active Version / Scope) · Policy(Registry+Code / Status+Validity / Scope / Priority) · Definition(Active Version) · Version · Request(Subject+Action) · Context(Decision Command / Slot / Resource) · Decision(Subject / Resource+Version / Action / Effect / Result / Valid Until) · Binding(Command / Slot) · Commit Binding · Exception · Override · Drift · Cache Key Digest · Reconciliation · Audit Event.

**§64 Performance(수단)**: Registry Resolution Index · Scope Specificity Precompute · Active Policy Projection · **Policy Set Compilation** · Context Schema Cache · Immutable Policy Compilation Cache · Snapshot Reuse · Trace Sampling · **Commit Fast Revalidation Path** · Batch/Bulk · Cache Stampede Protection · **Circuit Breaker** · Timeout · **Fail-closed** · Benchmark · SLA · Audit Write Optimization · Evidence Transaction Binding.

**절대 규율(§64)**: **성능 이유로 Tenant / Resource Version / Policy Version / Commit Binding 검증 제거 금지.** Circuit Breaker/Timeout 발동 시에도 고위험은 Fail-closed(§45).

의미: 인덱스는 정책 해석(Registry/Scope/Policy Resolution)과 판정 조회(Decision/Binding)를 상수급으로 만들되, 성능 최적화가 **정확성·격리·불변성 검증을 우회하는 지름길이 되어선 안 된다**. Timeout·Circuit Breaker는 지연을 제한하되 그 결과는 항상 Deny로 안전귀결한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **인가 전용 인덱스 스키마·Policy Set Compilation은 부재** — Registry/Policy/Decision/Binding 테이블 자체가 없으므로 그 인덱스도 없다. 정책 해석은 **코드 상수 조회**(런타임 O(1) 해시맵)로 처리 — `index.php:554` roleRank 하드코딩 맵·`index.php:564-578` scope/method 게이트는 DB 인덱스가 아닌 인메모리 분기.
- **실존하는 인접 권한 인덱스 substrate(GROUND_TRUTH §2 실재 테이블)**:
  - `acl_permission` 매트릭스(`TeamPermissions.php:39,152-159,325-336` subject_type×menu×8action) — 팀 ACL 조회의 실 인덱스 대상. Registry Scope/Policy 데이터화 시 흡수.
  - `data_scope` 행필터(`TeamPermissions.php:236-322`) — ABAC scopeSql 조회. Resource/Scope 인덱스 substrate.
  - `api_key`(scopes_json·`Db.php:942`) — 키 SHA-256 해시 조회(`index.php:490-493`). API Scope 인덱스 substrate.
  - `alert_policy`(`Db.php:558`)·`tenant_security_policy`(`UserAuth.php:3580`)·`sso_group_role_map`(`EnterpriseAuth.php:70`)·`plan_menu_access`(`AdminPlans.php:393`)·`team_channel_mapping`(`Db.php:712`)·`wms_permissions`(`Wms.php:72,114`) — 도메인별 권한 테이블 실재(★인덱스 실재), 그러나 인가 판정 전용 통합 인덱스는 아님.
- **★성능-정확성 상충 실사례(§64 규율의 근거)**: MEMORY 285차 정정 — 공용 카탈로그를 실테넌트로 읽어 상품마다 외부 API를 재수집한 N+1이 40s 타임아웃(502)을 유발. 교훈=성능 최적화(캐시/공용스코프)가 **Tenant 경계 검증을 우회하면 장애**. 이는 §64 "성능 이유로 Tenant 검증 제거 금지"의 실증 근거.
- `Scope Specificity Precompute`/`Policy Set Compilation`/`Commit Fast Revalidation Path`/`Circuit Breaker`(인가용) → **no hits**.

## 3. 판정

- **Verdict: ABSENT** (인가 전용 인덱스·컴파일·성능 경로 부재). 단 `acl_permission`/`api_key`/`data_scope` 등 도메인 권한 인덱스는 **PRESENT-substrate로 실재**(GROUND_TRUTH §2) — Registry/Scope 인덱스가 흡수·표준화할 대상.
- **선행 의존**: 인덱스/성능은 §7 Registry·§10 Policy·§24 Decision·§39 Commit Binding의 저장구조에 종속 — 상위 스키마 ABSENT로 순신규. Commit Fast Revalidation은 §3.2 Decision·§39 부재로 BLOCKED_PREREQUISITE.
- **cover: 0** (인가 통합 인덱스 전무). 도메인 권한 테이블 인덱스는 실재하나 판정 인덱스 대체 아님 — KEEP_SEPARATE 후 Scope/Policy 데이터로 이관.

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: 순신규 인가 테이블에 §62 인덱스 부여(Registry Tenant+Code·Status+Active Version / Policy Registry+Code·Validity·Priority / Decision Subject·Resource+Version·Action·Effect·Valid Until / Commit Binding / Cache Key Digest / Audit Event). 기존 `acl_permission`(`TeamPermissions.php:152-159`)·`api_key`(`Db.php:942`)·`data_scope`(`TeamPermissions.php:236-322`) 인덱스는 **보존**하고 Registry Scope가 이를 참조(Replace 금지).
- **성능 수단(§64)**: Scope Specificity Precompute(§8 specificity score)·Active Policy Projection·**Policy Set Compilation**(불변 정책 컴파일 캐시)·Snapshot Reuse·Trace Sampling·**Commit Fast Revalidation Path**로 지연 최소화. Cache Stampede Protection·Circuit Breaker·Timeout으로 폭주·외부장애 격리.
- **★불변 규율(설계 강제)**: 어떤 인덱스·컴파일·Fast Path도 **Tenant / Resource Version / Policy Version / Commit Binding 검증을 건너뛰지 않는다**(§64). Circuit Breaker/Timeout 발동 시 고위험 Approval/Payment/Security는 **Fail-closed=Deny**(§45·§5.13) — 285차 N+1 502 교훈처럼 "빠른 우회"가 격리/정확성을 훼손하면 장애·보안구멍.
- **Fail-closed 벤치마크**: SLA·Benchmark는 정상경로만이 아니라 **Deny 경로·Timeout 경로도 측정**(Fail-open으로 SLA를 맞추는 안티패턴 차단). Audit Write는 Evidence Transaction Binding으로 판정과 원자적.
- Part 1은 인덱스 대상·성능 경로 설계만·실 스키마/DDL은 후속.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]] · [[DSAR_APPROVAL_AUTHORIZATION_CACHE_POLICY]] · [[DSAR_APPROVAL_AUTHORIZATION_API_CONTRACT]].

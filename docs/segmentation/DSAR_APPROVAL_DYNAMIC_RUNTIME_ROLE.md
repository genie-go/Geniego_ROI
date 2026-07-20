# DSAR — Approval Runtime Role (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Runtime Role)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN은 Permit하지 않음(fail-closed) · Dynamic ≠ 정적 role · 마케팅 Rule Engine 오흡수 금지(KEEP_SEPARATE) · Golden Rule · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Runtime Role은 사용자가 로그인할 때 한 번 정해지는 것이 아니라 **매 요청/세션 시점에 Runtime Context를 입력받아 재계산되는 Role**이다(스펙 §3 유형 목록 1번·§1-4 "Runtime Role"). 목적은 현행 "로그인 시 스냅샷된 정적 role이 세션 종료까지 불변"이라는 구조(ADR §1.4 "Dynamic Role ≠ 정적 role · Context가 role을 결정")를 요청 단위 재평가로 전환하는 것이다.

## 2. Canonical 필드

스펙 §5(Runtime Context: Current User·Session·Device·Network·IP·Region·Organization·Project·Environment·Time·Authentication Context)·§9(Rule Evaluation 출력)·§14(Runtime Permission Projection) 근거 설계 필드(코드 0·미확정):

- `runtime_role_eval_id` · `role_definition_ref` · `evaluated_at`(요청 시각, 캐시 아님) · `runtime_context_snapshot`(§5 11개 항목) · `evaluation_result`(TRUE/FALSE/UNKNOWN/ERROR, §9) · `effective_permission_projection_ref`(§14) · `ttl`(재평가 주기 또는 요청 스코프 한정)

## 3. 열거형 / 타입

- `evaluation_result`: `TRUE` | `FALSE` | `UNKNOWN` | `ERROR` (스펙 §9, ★UNKNOWN은 Permit 금지 — ADR D-2)

## 4. 실 substrate 매핑 (ABSENT/PARTIAL·ground-truth만 인용)

- **Runtime Role = ABSENT**: `dynamic/runtime/session/conditional/context role` grep 0(전수조사 §1). "요청마다 role을 재계산"하는 로직은 코드베이스에 없음.
- **정적 스냅샷 대조(요청 단위 재계산 없음의 증거)**: `team_role`(`UserAuth.php:1019` 로그인 시 세션 스냅샷)·`admin_level`(`UserAuth.php:191,1022`, "컨텍스트 재평가 없음" 명시)·`api_key.role`(`Db.php:942-955` 생성 시 고정·`index.php:573-576` rank 순위화만, 요청마다 재계산 없음). `authedUser`/`authedTenant`는 정적 team_role/plan을 그대로 반환할 뿐 context로부터 role을 계산하지 않는다(전수조사 §5).
- **Runtime Context 필드는 실재하나 role 계산 미연결**: `user_session`(`Db.php:1111-1117`, ALTER `ip/ua/last_seen` `UserAuth.php:4237`)·`recordSessionMeta`(`UserAuth.php:4243-4251`, best-effort)·`listSessions`(`UserAuth.php:4254-4281`, 표시 전용) — 전수조사 §5 명시: "Runtime Context가 role 결정 로직 입력으로 연결된 지점 없음."
- **근접 결정 입력 후보**: ABAC `effectiveScope`(`TeamPermissions.php:236-265`)는 요청마다 조회되는 라이브 substrate(캐시 없음)라는 점에서 "요청 시점 재계산"의 유일한 근접 패턴이나, role이 아니라 data_scope 행필터만 재계산한다(role 자체는 정적 유지).

## 5. 설계 원칙

- **effectiveScope 라이브 조회 패턴을 재사용**: `TeamPermissions.php:236-265`가 매 요청 DB를 라이브 조회하는 방식(캐시 없이 fail-closed)을 Runtime Role 평가 엔진의 "즉시 재계산" 설계 참조점으로 삼는다(신규 캐시 계층은 스펙 §22 Cache에서 별도 설계).
- **UNKNOWN/ERROR는 정적 role로 폴백하지 않고 Deny**: Runtime Role 평가가 실패해도 로그인 시 스냅샷된 정적 team_role을 자동 대체 사용하지 않는다(ADR D-2 fail-closed 원칙의 Runtime Role 적용).
- **TTL 설계는 요청 스코프 한정을 기본으로**: Session Role(자매편)과 달리 Runtime Role은 세션보다 짧은 단위(요청 1회)로 재평가하는 것을 기본값으로 하고, 캐시 도입은 스펙 §22-23(Cache/Cache Invalidation)에서 별도 확정.

## 6. Gap / BLOCKED_PREREQUISITE

- Runtime Context를 Rule Evaluation 입력으로 연결하는 로직 = grep 0(전수조사 §5) — 순신규.
- **BLOCKED_PREREQUISITE(RP-002)**: `effective_permission_projection_ref`가 참조할 Runtime Permission Projection(스펙 §14)이 선행 Permission Engine(Part 2, 코드 0) 확정 후에만 설계 가능.
- Runtime Risk(스펙 §20)를 Runtime Context 입력에 포함할지는 별도 결정 필요 — 현재 `auth_audit_log.risk`는 계산형이 아닌 정적 심각도 라벨(전수조사 §7, `UserAuth.php:4174-4197` 하드코딩)이라 그대로 Runtime Role 입력에 쓸 수 없음(BLOCKED, 계산 엔진 별도 신설 필요).

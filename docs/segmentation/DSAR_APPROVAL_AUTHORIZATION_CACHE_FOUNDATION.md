# DSAR — Authorization Cache Foundation (06-A-03-02-03-04 Part 1 · §49)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용원=[[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) allowlist. 여기 없는 file:line 인용 금지.

## 1. 원문 전사 (Canonical Contract)

§49 Cache Foundation 원문:

- **Cache Key**(전 축 결합) = `tenant` · `registry` · `definition version` · `policy set version` · `subject` · `effective actor` · `actor identity version` · `session generation` · `resource type/id/version` · `action` · `decision slot` · `approval case version` · `amount bucket` · `currency` · `client` · `channel` · `environment digest` · `kill switch version` · `context digest`.
- **Entry** 필드: `effect` · `valid until` · `use count` · `invalidation version`.
- **Cache 금지 대상**: `Override` · `Exception` · `Emergency` · `Break-glass` · `Manual Review` · `Indeterminate` · `Challenge` · `Error` · `Tamper` · **고위험 Version 불명확** 결정.
- (§63 연계) 즉시 Invalidation: Registry Suspended · Policy Changed/Suspended · Definition Version · Subject Identity · Session Revoked · Resource Version · Assignment/Authority/Delegation · Exception/Override Revoked · Kill Switch · Tamper · Incident. Cache Hit 시 Valid Until/Policy/Definition/Resource Version/Session Generation/Kill Switch/Digest 재검증.

의미: 인가 결정 캐시는 성능 최적화이되, **캐시가 인가 우회 경로가 되지 않도록** 키에 테넌트·정책버전·리소스버전·주체버전·세션세대·킬스위치버전·컨텍스트 다이제스트를 전부 결합해 어느 한 축이라도 다르면 재사용 불가하게 하고, 재사용 부적합(Override/Exception/Challenge/Error 등)은 애초에 캐시하지 않는 순신규 계층이다.

## 2. 기존 구현 대조

- **인가 결과 캐시 자체가 부재** — 현재는 매 요청마다 인가를 즉석 평가한다. 중앙 RBAC 게이트(`index.php:553-603`)는 요청당 roleRank 계산(`index.php:554`)·write 메서드 게이트(`index.php:568-578`)를 실행할 뿐, 판정 결과를 키로 저장·재사용하는 캐시 구조체가 없다.
- TeamPermissions RBAC/ABAC(`TeamPermissions.php:120-136`·`:236-322`)도 요청마다 roleOf/effectiveScope/scopeSql을 재계산한다. `acl_permission` 매트릭스(`TeamPermissions.php:39,152-159,325-336`)·`data_scope`(`TeamPermissions.php:236-322`)는 DB 조회이지 **인가 결정(effect) 캐시가 아니다** — 원천 데이터 조회와 판정 캐시를 혼동 금지.
- **cache key에 정책/리소스/주체 버전이 없다** — 애초에 캐시가 없으므로 §53 "Cross-Tenant Cache"·"Cache Key에 Policy/Resource/Subject Version 없음" 위반은 현행에 존재하지 않는다(긍정: 위험 캐시 부재). 단, 테넌트 격리 substrate는 실재 — `index.php:600` X-Tenant-Id 무조건 덮어쓰기가 cross-tenant 재사용의 원천 방어선이므로, 신설 캐시 키의 `tenant` 축은 이 강제주입 결과(auth_tenant)에 바인딩해야 한다.
- 세션 세대(session generation) 개념 부재 — 세션 무효화 시 캐시 무효화의 근거가 될 세대 카운터가 없다. api_key scopes(`Keys.php:99-113`)·SSO group→role(`EnterpriseAuth.php:70,78-88`)도 세대 버전을 갖지 않는다.
- 다이제스트/해시 substrate 재사용 가능 — `SecurityAudit.php:27`의 SHA-256 해시 패턴을 context digest·environment digest 산출에 재사용 가능(KEEP_SEPARATE — 감사 해시체인≠캐시 키).

## 3. 판정

- Verdict: **ABSENT (순신규)** — 인가 결과 캐시 계층 전무.
- cover: **0**. 원천 데이터 조회 캐시(acl_permission/data_scope DB 조회)는 존재하나 인가 결정(effect) 캐시가 아니므로 대체 계상 금지.
- 선행 의존: cache key의 `definition version`·`policy set version`·`resource version`·`decision slot`·`approval case version` 축이 선행 Registry/Policy/Definition(§7~§13 전량 ABSENT)·Decision Foundation(§3.2)·Resource Version(§3.3)에 종속 → **BLOCKED_PREREQUISITE**. 선행 신설 전에는 캐시 키 구성 불가.
- 긍정: cross-tenant cache 위험 부재(캐시 자체 부재)·테넌트 강제주입(`index.php:600`)이 신설 캐시의 tenant 축 신뢰 근거 제공.

## 4. 확장/구현 방향 (설계)

- 순신규 `APPROVAL_AUTHORIZATION_CACHE`(§6 엔티티) — Cache Key를 원문 전 축(tenant·definition version·policy set version·subject·effective actor·actor identity version·session generation·resource type/id/version·action·decision slot·approval case version·amount bucket·currency·client·channel·environment digest·kill switch version·context digest) 결합으로만 구성. **한 축 불일치=miss**로 강제(Property Test §65 "Tenant 변경 Cache Key 금지"·"Resource/Action 변경 Permit 재사용 금지").
- **Cache 금지 규칙을 데이터 아닌 코드 불변식으로**: Effect가 PERMIT/CONDITIONAL_PERMIT(§23)이며 Override/Exception/Emergency/Break-glass/Manual Review/Indeterminate/Challenge/Error/Tamper가 아니고 고위험 Version이 확정된 경우에만 write. 나머지는 캐시 진입 자체 차단.
- **Cache Hit 재검증 게이트**(§63): Hit 시 Valid Until 미만료 + Policy/Definition/Resource Version 일치 + Session Generation 일치 + Kill Switch 버전 일치 + Context Digest 일치를 재확인. 하나라도 불일치→miss 처리 후 재평가(성능 이유로 이 재검증 제거 금지·§64).
- **즉시 Invalidation 훅**: Registry Suspended·Policy Changed/Suspended·Definition Version·Subject Identity·Session Revoked·Resource Version·Assignment/Authority/Delegation·Exception/Override Revoked·Kill Switch·Tamper·Incident 이벤트에 invalidation version 증가. 세션 세대는 신설 — 기존 세션 무효화 경로(`UserAuth.php` 세션 재검증)와 연결하되 재구현 금지(Extend).
- **tenant 축 바인딩**: 캐시 키 tenant는 반드시 `index.php:590-593,600`이 확정한 auth_tenant를 사용(요청 헤더 원본 신뢰 금지). Cross-Tenant Cache Key는 Static Lint(§54)·Runtime Guard(§55)로 차단.
- 실 배선은 후속 enforcement Part — Part 1은 Canonical Cache Contract 정의만.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_RECONCILIATION_FOUNDATION]] · [[DSAR_APPROVAL_AUTHORIZATION_STATIC_LINT]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].

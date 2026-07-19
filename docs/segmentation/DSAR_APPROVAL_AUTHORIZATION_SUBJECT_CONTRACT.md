# DSAR — Authorization Subject Contract (06-A-03-02-03-04 · §15)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · §15 Subject Contract · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> ★ file:line 인용 = [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) allowlist 등재분만. 지어내기 금지.
> ★ 선행 = Actor Identity Foundation(06-A-03-02-03-03). Subject는 그 결과를 인가 입력으로 참조.

## 1. 원문 전사 (Canonical Contract)

§15 Subject Contract (Actor Identity Foundation 참조) — 필수 필드 (원문 전사):
- `tenant` · `principal` · `canonical subject`
- `original principal` · `effective actor` · `actor type`
- `account/subject/employment status`
- `membership`
- `role/position references`
- `delegation/impersonation`
- `identity/authentication AAL`
- `session` · `device` · `client` · `channel`
- `identity/authentication snapshot`
- `identity/authentication digest`
- **`Raw Password/Token/Credential 금지.`**

의미: Subject Contract는 "누가(actor)" 인가 판정 대상인지를 인증 결과로부터 파생된 **정규 주체(canonical subject)** 로 봉인한다. §5.1(Authentication≠Authorization — Identity 결과를 Subject Input으로)·§5.5(Actor ID 직접신뢰 금지·Body/Query/Header/Client State가 아니라 Canonical Principal/Effective Actor 사용)의 실체다. Original Principal ↔ Effective Actor 분리(위임/대행 시 원 주체와 실행 주체 구분)·identity/authentication snapshot(판정 시점 고정)·raw credential 저장 금지가 핵심.

## 2. 기존 구현 대조

- **role/tenant substrate 실재**:
  - `TeamPermissions.php:120-136` — roleOf/isAdmin/isOwnerAdmin/isManagerAdmin·owner>manager>member 서열(§15 `role/position references`의 substrate). `roleOf` fail-closed(`TeamPermissions.php:120-131` `:127` 미해결→member·parent_user_id 키존재+빈값만 owner) = subject 역할 해석의 안전 기본값.
  - `TeamPermissions.php:132`(isAdmin=plan==='admin'||plans==='admin')·`:134,136`(isOwnerAdmin/isManagerAdmin) — plan 기반 상위 판정, role과 직교.
  - `index.php:590-593,600` — 인증키 tenant_id로 X-Tenant-Id **무조건 덮어쓰기**·auth_tenant/auth_role attach = §15 `tenant` binding + §5.5(Actor ID 직접신뢰 금지)의 실 구현. Body/Header tenant 위조 원천차단.
  - `index.php:554` roleRank(viewer0/connector1/analyst2/admin3) = subject의 API 레벨 역할 서열.
- **effective actor / original principal 분리**:
  - agency 위임 격리 `index.php:74-104`(agency_client_link.status='approved' 매요청 재검증·읽기전용 write 차단) — original(agency) ↔ effective(client tenant) 분리의 **부분** substrate. 그러나 canonical "effective actor" 필드로 정형화되지 않고 agency 경로 전용.
  - 회원 세션 대행(impersonation)은 별도 존재하나 canonical effective actor 결합 부재.
- **membership / SSO**: `EnterpriseAuth.php:70,78-88,476-480` sso_group_role_map(manager>member·owner 미승격) = membership→role 매핑 substrate.
- **★canonical subject / identity snapshot / AAL / actor type 부재**:
  - `canonical subject`·`original principal`·`effective actor`·`actor type`·`identity/authentication snapshot`·`identity/authentication digest`·`AAL` → **no hits**(정규 구조체로서). 현재 subject=roleOf(`TeamPermissions.php:120-136`)+plan+tenant(`index.php:600`)의 런타임 조합일 뿐, 판정 시점에 고정된 불변 subject snapshot 없음.
  - `account/subject/employment status`·`membership`을 인가 subject에 결합하는 계약 부재.
- **★긍정**: 하드코딩 user-id/email 기반 subject 판정 **부재**(전부 DB plan/plans/admin_level 컬럼 기반) → §15 raw credential/리터럴 authz 금지 원칙과 부합. `index.php:600` tenant 강제주입으로 cross-tenant subject 위조도 차단.
- **raw credential**: 인가 subject에 raw password/token 저장 사례 → no hits(양호). api_key는 SHA-256 해시 조회.

## 3. 판정

- Verdict: **PARTIAL** — role/tenant substrate 실재(roleOf·tenant 강제주입·SSO membership), canonical subject/identity snapshot/original·effective actor/actor type/AAL 부재.
- 선행 의존: canonical subject/snapshot/original·effective actor는 **Actor Identity Foundation(03-03) 신설 대상** — 이번 Part는 그 결과를 참조하는 Subject Contract 인터페이스만 설계. 03-03 미완 시 Gap 기록·Adapter로 연결.
- cover: **substrate ~40%** (역할해석·tenant binding·SSO membership·agency 위임격리는 실재·재사용. subject 정규화/불변 snapshot/AAL/actor type은 0).
- ★위험: effective actor가 agency(`index.php:74-104`)·impersonation 경로별로 파편화 — canonical effective actor 미통일 시 위임 판정 드리프트.

## 4. 확장/구현 방향 (설계)

- Subject Contract는 03-03 Actor Identity Foundation의 `canonical subject`·`original principal`·`effective actor`·`actor type`·`identity/authentication snapshot/digest`·`AAL`을 **참조(read-only reference)** — 인가 계층에서 재정의 금지(SoT=Identity Foundation).
- Golden Rule=Extend:
  - `roleOf`(`TeamPermissions.php:120-136`·fail-closed `:127`)를 subject의 `role/position references` 해석기로 재사용 — 재구현 금지.
  - `index.php:600` tenant 강제주입 = `tenant` binding SoT로 승격(위조차단 로직 보존).
  - `EnterpriseAuth.php:78-88` sso_group_role_map = `membership` substrate로 흡수.
  - agency 위임(`index.php:74-104`) = `original principal`↔`effective actor` 분리의 canonical adapter 대상 — agency 전용 로직을 effective actor 일반화에 편입.
- §5.5 봉인: subject의 principal/effective actor는 Body/Query/Header/Client State에서 절대 직접 취득 금지 — `index.php:590-593,600`의 강제주입 패턴을 canonical 원칙으로 확립.
- Raw credential 금지(§15) 재확인: 하드코딩 user-id/email authz 부재(긍정)를 lint(§54 `Hardcoded User ID/Email Authorization`)로 회귀방지.
- 실 subject snapshot 결합·actor type/AAL 판정은 03-03 신설 후 별도 승인세션(이번 Part=계약·참조 인터페이스만·코드 0).

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_RESOURCE_CONTRACT]] · [[DSAR_APPROVAL_AUTHORIZATION_CONTEXT]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
